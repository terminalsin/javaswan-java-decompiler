import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents the caught exception at an exception handler entry point.
 * This is an implicit expression that exists at the start of exception handlers.
 */
export class CaughtExceptionExpr extends Expr {
  public readonly type: Type;

  /**
   * The exception type being caught (or java/lang/Throwable for catch-all).
   */
  public readonly exceptionType: Type;

  constructor(exceptionType: Type) {
    super();
    this.type = exceptionType;
    this.exceptionType = exceptionType;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitCaughtExceptionExpr(this);
  }

  public toString(): string {
    return `@caughtexception`;
  }
}
