import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a pop statement that discards a value from the stack.
 * Corresponds to: POP, POP2
 * Also used when an invocation's return value is discarded.
 */
export class PopStmt extends Stmt {
  /**
   * The expression whose value is being discarded.
   */
  public readonly value: Expr;

  constructor(value: Expr) {
    super();
    this.value = value;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitPopStmt(this);
  }

  public toString(): string {
    return `pop ${this.value}`;
  }

  public getExpressions(): readonly Expr[] {
    return [this.value];
  }
}
