import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a line number metadata statement.
 * This is a pseudo-statement for debugging information.
 */
export class LineNumberStmt extends Stmt {
  /**
   * The source line number.
   */
  public readonly line: number;

  constructor(line: number) {
    super();
    this.line = line;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitLineNumberStmt(this);
  }

  public toString(): string {
    return `// line ${this.line}`;
  }

  public getExpressions(): readonly Expr[] {
    return [];
  }
}
