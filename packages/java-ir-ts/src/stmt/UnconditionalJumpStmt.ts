import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents an unconditional jump statement.
 * Corresponds to: GOTO
 */
export class UnconditionalJumpStmt extends Stmt {
  /**
   * The target block index.
   */
  public readonly target: number;

  constructor(target: number) {
    super();
    this.target = target;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitUnconditionalJumpStmt(this);
  }

  public toString(): string {
    return `goto block${this.target}`;
  }

  public getExpressions(): readonly Expr[] {
    return [];
  }
}
