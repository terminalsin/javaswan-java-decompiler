import type { JavaExpr } from './JavaExpr';

export class JavaFieldAccessExpr implements JavaExpr {
  public readonly target: JavaExpr;
  public readonly fieldName: string;

  constructor(target: JavaExpr, fieldName: string) {
    this.target = target;
    this.fieldName = fieldName;
  }
}

