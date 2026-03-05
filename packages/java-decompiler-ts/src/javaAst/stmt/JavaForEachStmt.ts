import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import { JavaBlockStmt } from './JavaBlockStmt';

/**
 * Represents a for-each (enhanced for) statement: `for (Type var : iterable) { ... }`
 */
export class JavaForEachStmt implements JavaStmt {
  public readonly varType: string;
  public readonly varName: string;
  public readonly iterable: JavaExpr;
  public readonly body: JavaBlockStmt;

  constructor(varType: string, varName: string, iterable: JavaExpr, body: JavaBlockStmt) {
    this.varType = varType;
    this.varName = varName;
    this.iterable = iterable;
    this.body = body;
  }
}
