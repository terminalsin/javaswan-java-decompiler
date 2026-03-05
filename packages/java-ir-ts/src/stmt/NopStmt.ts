import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a no-operation statement.
 * Corresponds to: NOP
 */
export class NopStmt extends Stmt {
  constructor() {
    super();
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitNopStmt(this);
  }

  public toString(): string {
    return 'nop';
  }

  public getExpressions(): readonly Expr[] {
    return [];
  }
}
