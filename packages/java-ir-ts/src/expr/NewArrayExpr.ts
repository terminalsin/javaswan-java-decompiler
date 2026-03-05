import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents an array allocation expression.
 * Corresponds to: NEWARRAY, ANEWARRAY, MULTIANEWARRAY
 */
export class NewArrayExpr extends Expr {
  public readonly type: Type;

  /**
   * The element type of the array.
   */
  public readonly elementType: Type;

  /**
   * The dimension size expressions.
   * For single-dimension arrays, this has one element.
   * For multi-dimensional arrays, this has multiple elements.
   */
  public readonly dimensions: readonly Expr[];

  constructor(arrayType: Type, elementType: Type, dimensions: readonly Expr[]) {
    super();
    this.type = arrayType;
    this.elementType = elementType;
    this.dimensions = dimensions;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitNewArrayExpr(this);
  }

  public toString(): string {
    const dims = this.dimensions.map(d => `[${d}]`).join('');
    return `new ${this.elementType.getClassName()}${dims}`;
  }
}
