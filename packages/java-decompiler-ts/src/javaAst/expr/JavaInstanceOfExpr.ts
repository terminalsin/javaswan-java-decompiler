import type { JavaExpr } from './JavaExpr';

export class JavaInstanceOfExpr implements JavaExpr {
  public readonly expression: JavaExpr;
  public readonly typeName: string;

  constructor(expression: JavaExpr, typeName: string) {
    this.expression = expression;
    this.typeName = typeName;
  }
}

