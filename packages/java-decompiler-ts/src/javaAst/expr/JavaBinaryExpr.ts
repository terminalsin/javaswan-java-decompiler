import type { JavaExpr } from './JavaExpr';

export class JavaBinaryExpr implements JavaExpr {
  public readonly left: JavaExpr;
  public readonly operator: string;
  public readonly right: JavaExpr;

  constructor(left: JavaExpr, operator: string, right: JavaExpr) {
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

