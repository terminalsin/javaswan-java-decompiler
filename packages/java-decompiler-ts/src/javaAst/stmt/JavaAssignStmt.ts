import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';

export class JavaAssignStmt implements JavaStmt {
  public readonly target: JavaExpr;
  public readonly value: JavaExpr;
  /** When set, emits as a variable declaration: `Type target = value;` */
  public readonly typeName: string | null;

  constructor(target: JavaExpr, value: JavaExpr, typeName: string | null = null) {
    this.target = target;
    this.value = value;
    this.typeName = typeName;
  }
}

