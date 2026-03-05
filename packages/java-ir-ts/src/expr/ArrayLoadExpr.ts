import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents an array element read expression.
 * Corresponds to: IALOAD, LALOAD, FALOAD, DALOAD, AALOAD, BALOAD, CALOAD, SALOAD
 */
export class ArrayLoadExpr extends Expr {
  public readonly type: Type;

  /**
   * The array expression.
   */
  public readonly array: Expr;

  /**
   * The index expression.
   */
  public readonly index: Expr;

  constructor(elementType: Type, array: Expr, index: Expr) {
    super();
    this.type = elementType;
    this.array = array;
    this.index = index;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitArrayLoadExpr(this);
  }

  public toString(): string {
    return `${this.array}[${this.index}]`;
  }
}
