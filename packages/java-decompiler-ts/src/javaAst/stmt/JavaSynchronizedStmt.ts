import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import { JavaBlockStmt } from './JavaBlockStmt';

export class JavaSynchronizedStmt implements JavaStmt {
  public readonly lockExpr: JavaExpr;
  public readonly body: JavaBlockStmt;

  constructor(lockExpr: JavaExpr, body: JavaBlockStmt) {
    this.lockExpr = lockExpr;
    this.body = body;
  }
}
