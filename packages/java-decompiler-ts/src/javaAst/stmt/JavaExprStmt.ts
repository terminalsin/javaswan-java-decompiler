import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';

export class JavaExprStmt implements JavaStmt {
  public readonly expression: JavaExpr;

  constructor(expression: JavaExpr) {
    this.expression = expression;
  }
}

