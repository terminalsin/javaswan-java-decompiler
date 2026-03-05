import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a return statement.
 * Corresponds to: RETURN, IRETURN, LRETURN, FRETURN, DRETURN, ARETURN
 */
export class ReturnStmt extends Stmt {
  /**
   * The return value expression, or null for void return.
   */
  public readonly value: Expr | null;

  constructor(value: Expr | null) {
    super();
    this.value = value;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitReturnStmt(this);
  }

  public toString(): string {
    if (this.value === null) {
      return 'return';
    }
    return `return ${this.value}`;
  }

  public getExpressions(): readonly Expr[] {
    return this.value !== null ? [this.value] : [];
  }
}
