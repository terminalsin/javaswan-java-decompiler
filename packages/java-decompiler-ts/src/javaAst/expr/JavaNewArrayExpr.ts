import type { JavaExpr } from './JavaExpr';

export class JavaNewArrayExpr implements JavaExpr {
  public readonly elementTypeName: string;
  public readonly dimensions: readonly JavaExpr[];

  constructor(elementTypeName: string, dimensions: readonly JavaExpr[]) {
    this.elementTypeName = elementTypeName;
    this.dimensions = dimensions;
  }
}

