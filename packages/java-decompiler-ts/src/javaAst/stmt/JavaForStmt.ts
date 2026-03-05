import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import { JavaBlockStmt } from './JavaBlockStmt';

export class JavaForStmt implements JavaStmt {
  /** The init part (e.g., `int i = 0`). Rendered as-is with no trailing semicolon. */
  public readonly init: string;
  public readonly condition: JavaExpr;
  /** The update part (e.g., `i++`). Rendered as-is with no trailing semicolon. */
  public readonly update: string;
  public readonly body: JavaBlockStmt;

  constructor(init: string, condition: JavaExpr, update: string, body: JavaBlockStmt) {
    this.init = init;
    this.condition = condition;
    this.update = update;
    this.body = body;
  }
}
