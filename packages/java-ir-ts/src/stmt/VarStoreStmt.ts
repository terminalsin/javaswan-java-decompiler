import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a local variable store statement.
 * Corresponds to: ISTORE, LSTORE, FSTORE, DSTORE, ASTORE
 */
export class VarStoreStmt extends Stmt {
  /**
   * The local variable index.
   */
  public readonly index: number;

  /**
   * The value expression to store.
   */
  public readonly value: Expr;

  /**
   * Optional variable name (from LocalVariableTable if available).
   */
  public readonly name: string | null;

  constructor(index: number, value: Expr, name: string | null = null) {
    super();
    this.index = index;
    this.value = value;
    this.name = name;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitVarStoreStmt(this);
  }

  public toString(): string {
    const varName = this.name ?? `var${this.index}`;
    return `${varName} = ${this.value}`;
  }

  public getExpressions(): readonly Expr[] {
    return [this.value];
  }
}
