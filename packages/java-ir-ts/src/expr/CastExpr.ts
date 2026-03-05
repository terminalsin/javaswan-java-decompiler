import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * The kind of cast operation.
 */
export enum CastKind {
  /** Reference type cast (checkcast) */
  CHECKCAST = 'checkcast',
  /** Primitive conversion (I2L, I2F, etc.) */
  PRIMITIVE = 'primitive',
}

/**
 * Represents a type cast expression.
 * Corresponds to: CHECKCAST, I2L, I2F, I2D, L2I, L2F, L2D, F2I, F2L, F2D, D2I, D2L, D2F, I2B, I2C, I2S
 */
export class CastExpr extends Expr {
  public readonly type: Type;

  /**
   * The expression being cast.
   */
  public readonly operand: Expr;

  /**
   * The source type (for primitive casts).
   */
  public readonly fromType: Type;

  /**
   * The kind of cast.
   */
  public readonly kind: CastKind;

  constructor(toType: Type, operand: Expr, fromType: Type, kind: CastKind) {
    super();
    this.type = toType;
    this.operand = operand;
    this.fromType = fromType;
    this.kind = kind;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitCastExpr(this);
  }

  public toString(): string {
    return `(${this.type.getClassName()}) ${this.operand}`;
  }
}
