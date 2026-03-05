import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents a unary negation expression.
 * Corresponds to: INEG, LNEG, FNEG, DNEG
 */
export class NegationExpr extends Expr {
  public readonly type: Type;

  /**
   * The operand to negate.
   */
  public readonly operand: Expr;

  constructor(type: Type, operand: Expr) {
    super();
    this.type = type;
    this.operand = operand;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitNegationExpr(this);
  }

  public toString(): string {
    return `(-${this.operand})`;
  }
}
