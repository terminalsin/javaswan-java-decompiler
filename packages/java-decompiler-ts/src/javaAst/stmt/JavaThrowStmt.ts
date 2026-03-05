import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';

export class JavaThrowStmt implements JavaStmt {
  public readonly exception: JavaExpr;

  constructor(exception: JavaExpr) {
    this.exception = exception;
  }
}

