import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import { JavaBlockStmt } from './JavaBlockStmt';

export class JavaDoWhileStmt implements JavaStmt {
  public readonly body: JavaBlockStmt;
  public readonly condition: JavaExpr;

  constructor(body: JavaBlockStmt, condition: JavaExpr) {
    this.body = body;
    this.condition = condition;
  }
}

