import type { JavaExpr } from './JavaExpr';

export class JavaCastExpr implements JavaExpr {
  public readonly typeName: string;
  public readonly expression: JavaExpr;

  constructor(typeName: string, expression: JavaExpr) {
    this.typeName = typeName;
    this.expression = expression;
  }
}

