import {
  type Expr,
  ConstantExpr,
  ArithmeticExpr,
  ArithmeticOp,
  NegationExpr,
  ComparisonExpr,
  ComparisonOp,
  CastExpr,
  CastKind,
} from '@blkswn/java-ir';
import { Type, INT, LONG, FLOAT, DOUBLE, BYTE, CHAR, SHORT } from '@blkswn/java-asm';

/**
 * Performs constant folding on expressions.
 */
export class ConstantFolder {
  /**
   * Statistics about folding operations.
   */
  public arithmeticFolds = 0;
  public negationFolds = 0;
  public comparisonFolds = 0;
  public castFolds = 0;

  /**
   * Resets statistics.
   */
  public reset(): void {
    this.arithmeticFolds = 0;
    this.negationFolds = 0;
    this.comparisonFolds = 0;
    this.castFolds = 0;
  }

  /**
   * Tries to fold an arithmetic expression with constant operands.
   */
  public foldArithmetic(expr: ArithmeticExpr): Expr {
    if (!(expr.left instanceof ConstantExpr) || !(expr.right instanceof ConstantExpr)) {
      return expr;
    }

    const left = expr.left.value;
    const right = expr.right.value;
    const type = expr.type;

    // Determine if we're working with integers or floats
    const sort = type.getSort();

    try {
      let result: unknown;

      switch (sort) {
        case INT:
          result = this.foldIntArithmetic(left as number, right as number, expr.op);
          break;
        case LONG:
          result = this.foldLongArithmetic(left as bigint, right as bigint, expr.op);
          break;
        case FLOAT:
        case DOUBLE:
          result = this.foldFloatArithmetic(left as number, right as number, expr.op);
          break;
        default:
          return expr;
      }

      if (result !== null) {
        this.arithmeticFolds++;
        return new ConstantExpr(type, result);
      }
    } catch {
      // Folding failed (e.g., division by zero) - return original
    }

    return expr;
  }

  private foldIntArithmetic(left: number, right: number, op: ArithmeticOp): number | null {
    let result: number;

    switch (op) {
      case ArithmeticOp.ADD:
        result = left + right;
        break;
      case ArithmeticOp.SUB:
        result = left - right;
        break;
      case ArithmeticOp.MUL:
        result = left * right;
        break;
      case ArithmeticOp.DIV:
        if (right === 0) return null; // Don't fold division by zero
        result = Math.trunc(left / right);
        break;
      case ArithmeticOp.REM:
        if (right === 0) return null;
        result = left % right;
        break;
      case ArithmeticOp.SHL:
        result = left << (right & 0x1f);
        break;
      case ArithmeticOp.SHR:
        result = left >> (right & 0x1f);
        break;
      case ArithmeticOp.USHR:
        result = left >>> (right & 0x1f);
        break;
      case ArithmeticOp.AND:
        result = left & right;
        break;
      case ArithmeticOp.OR:
        result = left | right;
        break;
      case ArithmeticOp.XOR:
        result = left ^ right;
        break;
      default:
        return null;
    }

    // Wrap to 32-bit signed integer (Java semantics)
    return result | 0;
  }

  private foldLongArithmetic(left: bigint, right: bigint, op: ArithmeticOp): bigint | null {
    let result: bigint;

    switch (op) {
      case ArithmeticOp.ADD:
        result = left + right;
        break;
      case ArithmeticOp.SUB:
        result = left - right;
        break;
      case ArithmeticOp.MUL:
        result = left * right;
        break;
      case ArithmeticOp.DIV:
        if (right === 0n) return null;
        result = left / right;
        break;
      case ArithmeticOp.REM:
        if (right === 0n) return null;
        result = left % right;
        break;
      case ArithmeticOp.SHL:
        result = left << (right & 0x3fn);
        break;
      case ArithmeticOp.SHR:
        result = left >> (right & 0x3fn);
        break;
      case ArithmeticOp.USHR:
        // For unsigned right shift on bigint, we need to handle it specially
        result = BigInt.asUintN(64, left) >> (right & 0x3fn);
        break;
      case ArithmeticOp.AND:
        result = left & right;
        break;
      case ArithmeticOp.OR:
        result = left | right;
        break;
      case ArithmeticOp.XOR:
        result = left ^ right;
        break;
      default:
        return null;
    }

    // Wrap to 64-bit signed integer
    return BigInt.asIntN(64, result);
  }

  private foldFloatArithmetic(left: number, right: number, op: ArithmeticOp): number | null {
    switch (op) {
      case ArithmeticOp.ADD:
        return left + right;
      case ArithmeticOp.SUB:
        return left - right;
      case ArithmeticOp.MUL:
        return left * right;
      case ArithmeticOp.DIV:
        return left / right; // Float division by zero is okay (produces Infinity/NaN)
      case ArithmeticOp.REM:
        return left % right;
      default:
        // Bitwise operations not valid for floats
        return null;
    }
  }

  /**
   * Tries to fold a negation expression with a constant operand.
   */
  public foldNegation(expr: NegationExpr): Expr {
    if (!(expr.operand instanceof ConstantExpr)) {
      return expr;
    }

    const operand = expr.operand.value;
    const type = expr.type;
    const sort = type.getSort();

    let result: unknown;

    switch (sort) {
      case INT:
        result = (-(operand as number)) | 0;
        break;
      case LONG:
        result = -(operand as bigint);
        break;
      case FLOAT:
      case DOUBLE:
        result = -(operand as number);
        break;
      default:
        return expr;
    }

    this.negationFolds++;
    return new ConstantExpr(type, result);
  }

  /**
   * Tries to fold a comparison expression with constant operands.
   */
  public foldComparison(expr: ComparisonExpr): Expr {
    if (!(expr.left instanceof ConstantExpr) || !(expr.right instanceof ConstantExpr)) {
      return expr;
    }

    const left = expr.left.value as number;
    const right = expr.right.value as number;

    let result: number;

    switch (expr.op) {
      case ComparisonOp.LCMP:
        // Long comparison
        const leftLong = expr.left.value as bigint;
        const rightLong = expr.right.value as bigint;
        result = leftLong < rightLong ? -1 : leftLong > rightLong ? 1 : 0;
        break;
      case ComparisonOp.FCMPL:
      case ComparisonOp.DCMPL:
        // NaN returns -1
        if (Number.isNaN(left) || Number.isNaN(right)) {
          result = -1;
        } else {
          result = left < right ? -1 : left > right ? 1 : 0;
        }
        break;
      case ComparisonOp.FCMPG:
      case ComparisonOp.DCMPG:
        // NaN returns 1
        if (Number.isNaN(left) || Number.isNaN(right)) {
          result = 1;
        } else {
          result = left < right ? -1 : left > right ? 1 : 0;
        }
        break;
      default:
        return expr;
    }

    this.comparisonFolds++;
    return new ConstantExpr(Type.INT_TYPE, result);
  }

  /**
   * Tries to fold a primitive cast expression with a constant operand.
   */
  public foldCast(expr: CastExpr): Expr {
    if (expr.kind !== CastKind.PRIMITIVE) {
      return expr;
    }

    if (!(expr.operand instanceof ConstantExpr)) {
      return expr;
    }

    const value = expr.operand.value;
    const fromSort = expr.fromType.getSort();
    const toSort = expr.type.getSort();

    let result: unknown;

    // Convert to number first (handle bigint for long)
    let numValue: number;
    if (fromSort === LONG) {
      numValue = Number(value as bigint);
    } else {
      numValue = value as number;
    }

    // Apply the conversion
    switch (toSort) {
      case INT:
        result = numValue | 0;
        break;
      case LONG:
        if (fromSort === LONG) {
          result = value; // No conversion needed
        } else {
          result = BigInt(Math.trunc(numValue));
        }
        break;
      case FLOAT:
        result = Math.fround(numValue);
        break;
      case DOUBLE:
        result = numValue;
        break;
      case BYTE:
        result = ((numValue | 0) << 24) >> 24;
        break;
      case CHAR:
        result = (numValue | 0) & 0xffff;
        break;
      case SHORT:
        result = ((numValue | 0) << 16) >> 16;
        break;
      default:
        return expr;
    }

    this.castFolds++;
    return new ConstantExpr(expr.type, result);
  }

  /**
   * Tries to fold any constant-foldable expression.
   */
  public tryFold(expr: Expr): Expr {
    if (expr instanceof ArithmeticExpr) {
      return this.foldArithmetic(expr);
    }
    if (expr instanceof NegationExpr) {
      return this.foldNegation(expr);
    }
    if (expr instanceof ComparisonExpr) {
      return this.foldComparison(expr);
    }
    if (expr instanceof CastExpr) {
      return this.foldCast(expr);
    }
    return expr;
  }
}
