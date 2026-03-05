import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import type { JavaSwitchCase } from './JavaSwitchCase';

export class JavaSwitchStmt implements JavaStmt {
  public readonly expression: JavaExpr;
  public readonly cases: readonly JavaSwitchCase[];

  constructor(expression: JavaExpr, cases: readonly JavaSwitchCase[]) {
    this.expression = expression;
    this.cases = cases;
  }
}

