import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Conditional comparison operators.
 */
export enum ConditionalOp {
  /** Equal to zero/null (ifeq, ifnull) */
  EQ = '==',
  /** Not equal to zero/null (ifne, ifnonnull) */
  NE = '!=',
  /** Less than zero (iflt) */
  LT = '<',
  /** Greater than or equal to zero (ifge) */
  GE = '>=',
  /** Greater than zero (ifgt) */
  GT = '>',
  /** Less than or equal to zero (ifle) */
  LE = '<=',
}

/**
 * Represents a conditional jump statement.
 * Corresponds to: IFEQ, IFNE, IFLT, IFGE, IFGT, IFLE, IF_ICMPEQ, IF_ICMPNE,
 * IF_ICMPLT, IF_ICMPGE, IF_ICMPGT, IF_ICMPLE, IF_ACMPEQ, IF_ACMPNE, IFNULL, IFNONNULL
 */
export class ConditionalJumpStmt extends Stmt {
  /**
   * The left operand.
   */
  public readonly left: Expr;

  /**
   * The right operand (null for unary comparisons like ifeq, ifnull).
   */
  public readonly right: Expr | null;

  /**
   * The comparison operator.
   */
  public readonly op: ConditionalOp;

  /**
   * The target block index if condition is true.
   */
  public readonly trueTarget: number;

  /**
   * The fallthrough block index (condition is false).
   */
  public readonly falseTarget: number;

  constructor(
    left: Expr,
    right: Expr | null,
    op: ConditionalOp,
    trueTarget: number,
    falseTarget: number
  ) {
    super();
    this.left = left;
    this.right = right;
    this.op = op;
    this.trueTarget = trueTarget;
    this.falseTarget = falseTarget;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitConditionalJumpStmt(this);
  }

  public toString(): string {
    if (this.right === null) {
      return `if (${this.left} ${this.op} 0) goto block${this.trueTarget} else block${this.falseTarget}`;
    }
    return `if (${this.left} ${this.op} ${this.right}) goto block${this.trueTarget} else block${this.falseTarget}`;
  }

  public getExpressions(): readonly Expr[] {
    if (this.right !== null) {
      return [this.left, this.right];
    }
    return [this.left];
  }
}
