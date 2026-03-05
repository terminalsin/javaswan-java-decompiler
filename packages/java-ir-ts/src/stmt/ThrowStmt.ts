import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a throw statement.
 * Corresponds to: ATHROW
 */
export class ThrowStmt extends Stmt {
  /**
   * The exception expression to throw.
   */
  public readonly exception: Expr;

  constructor(exception: Expr) {
    super();
    this.exception = exception;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitThrowStmt(this);
  }

  public toString(): string {
    return `throw ${this.exception}`;
  }

  public getExpressions(): readonly Expr[] {
    return [this.exception];
  }
}
