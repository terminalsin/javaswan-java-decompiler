import type { JavaExpr } from './JavaExpr';

export class JavaNewClassExpr implements JavaExpr {
  public readonly typeName: string;
  public readonly args: readonly JavaExpr[];

  constructor(typeName: string, args: readonly JavaExpr[]) {
    this.typeName = typeName;
    this.args = args;
  }
}

