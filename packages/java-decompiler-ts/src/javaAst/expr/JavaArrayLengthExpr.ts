import type { JavaExpr } from './JavaExpr';

export class JavaArrayLengthExpr implements JavaExpr {
  public readonly array: JavaExpr;

  constructor(array: JavaExpr) {
    this.array = array;
  }
}

