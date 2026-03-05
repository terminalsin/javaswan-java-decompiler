import type { JavaExpr } from './JavaExpr';

export class JavaArrayAccessExpr implements JavaExpr {
  public readonly array: JavaExpr;
  public readonly index: JavaExpr;

  constructor(array: JavaExpr, index: JavaExpr) {
    this.array = array;
    this.index = index;
  }
}

