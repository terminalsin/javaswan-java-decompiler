import { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Comparison operation types.
 */
export enum ComparisonOp {
  /** Long comparison (lcmp) */
  LCMP = 'lcmp',
  /** Float comparison, -1 on NaN (fcmpl) */
  FCMPL = 'fcmpl',
  /** Float comparison, 1 on NaN (fcmpg) */
  FCMPG = 'fcmpg',
  /** Double comparison, -1 on NaN (dcmpl) */
  DCMPL = 'dcmpl',
  /** Double comparison, 1 on NaN (dcmpg) */
  DCMPG = 'dcmpg',
}

/**
 * Represents a comparison expression that produces -1, 0, or 1.
 * Corresponds to: LCMP, FCMPL, FCMPG, DCMPL, DCMPG
 */
export class ComparisonExpr extends Expr {
  /**
   * Comparison always produces an int result.
   */
  public readonly type: Type = Type.INT_TYPE;

  /**
   * The left operand.
   */
  public readonly left: Expr;

  /**
   * The right operand.
   */
  public readonly right: Expr;

  /**
   * The comparison operation.
   */
  public readonly op: ComparisonOp;

  constructor(left: Expr, right: Expr, op: ComparisonOp) {
    super();
    this.left = left;
    this.right = right;
    this.op = op;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitComparisonExpr(this);
  }

  public toString(): string {
    return `${this.op}(${this.left}, ${this.right})`;
  }
}
