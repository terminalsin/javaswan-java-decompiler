import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Arithmetic operation types.
 */
export enum ArithmeticOp {
  ADD = '+',
  SUB = '-',
  MUL = '*',
  DIV = '/',
  REM = '%',
  SHL = '<<',
  SHR = '>>',
  USHR = '>>>',
  AND = '&',
  OR = '|',
  XOR = '^',
}

/**
 * Represents a binary arithmetic expression.
 * Corresponds to: IADD, ISUB, IMUL, IDIV, IREM, ISHL, ISHR, IUSHR, IAND, IOR, IXOR
 * (and their long/float/double variants)
 */
export class ArithmeticExpr extends Expr {
  public readonly type: Type;

  /**
   * The left operand.
   */
  public readonly left: Expr;

  /**
   * The right operand.
   */
  public readonly right: Expr;

  /**
   * The arithmetic operation.
   */
  public readonly op: ArithmeticOp;

  constructor(type: Type, left: Expr, right: Expr, op: ArithmeticOp) {
    super();
    this.type = type;
    this.left = left;
    this.right = right;
    this.op = op;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitArithmeticExpr(this);
  }

  public toString(): string {
    return `(${this.left} ${this.op} ${this.right})`;
  }
}
