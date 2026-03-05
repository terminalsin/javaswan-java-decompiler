import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a case in a switch statement.
 */
export interface SwitchCase {
  /**
   * The case key value.
   */
  readonly key: number;

  /**
   * The target block index.
   */
  readonly target: number;
}

/**
 * Represents a switch statement.
 * Corresponds to: TABLESWITCH, LOOKUPSWITCH
 */
export class SwitchStmt extends Stmt {
  /**
   * The value expression being switched on.
   */
  public readonly key: Expr;

  /**
   * The switch cases.
   */
  public readonly cases: readonly SwitchCase[];

  /**
   * The default target block index.
   */
  public readonly defaultTarget: number;

  constructor(key: Expr, cases: readonly SwitchCase[], defaultTarget: number) {
    super();
    this.key = key;
    this.cases = cases;
    this.defaultTarget = defaultTarget;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitSwitchStmt(this);
  }

  public toString(): string {
    const caseStrs = this.cases.map(c => `${c.key}: block${c.target}`).join(', ');
    return `switch(${this.key}) { ${caseStrs}, default: block${this.defaultTarget} }`;
  }

  public getExpressions(): readonly Expr[] {
    return [this.key];
  }
}
