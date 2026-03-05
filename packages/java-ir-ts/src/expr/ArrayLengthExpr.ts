import { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents an array length expression.
 * Corresponds to: ARRAYLENGTH
 */
export class ArrayLengthExpr extends Expr {
  /**
   * Array length is always an int.
   */
  public readonly type: Type = Type.INT_TYPE;

  /**
   * The array expression.
   */
  public readonly array: Expr;

  constructor(array: Expr) {
    super();
    this.array = array;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitArrayLengthExpr(this);
  }

  public toString(): string {
    return `${this.array}.length`;
  }
}
