import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents a local variable load expression.
 * Corresponds to: ILOAD, LLOAD, FLOAD, DLOAD, ALOAD
 */
export class VarExpr extends Expr {
  public readonly type: Type;

  /**
   * The local variable index.
   */
  public readonly index: number;

  /**
   * Optional variable name (from LocalVariableTable if available).
   */
  public readonly name: string | null;

  constructor(type: Type, index: number, name: string | null = null) {
    super();
    this.type = type;
    this.index = index;
    this.name = name;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitVarExpr(this);
  }

  public toString(): string {
    if (this.name) {
      return this.name;
    }
    return `var${this.index}`;
  }
}
