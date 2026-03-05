import type { JavaExpr } from './JavaExpr';

/**
 * Represents an array initializer expression: `new int[] {1, 2, 3}`
 */
export class JavaArrayInitExpr implements JavaExpr {
  public readonly elementTypeName: string;
  public readonly elements: readonly JavaExpr[];

  constructor(elementTypeName: string, elements: readonly JavaExpr[]) {
    this.elementTypeName = elementTypeName;
    this.elements = elements;
  }
}
