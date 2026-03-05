import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import { JavaBlockStmt } from './JavaBlockStmt';

export class JavaWhileStmt implements JavaStmt {
  public readonly condition: JavaExpr;
  public readonly body: JavaBlockStmt;

  constructor(condition: JavaExpr, body: JavaBlockStmt) {
    this.condition = condition;
    this.body = body;
  }
}

