import { JavaBlockStmt } from './JavaBlockStmt';

export class JavaCatchClause {
  public readonly exceptionTypeName: string;
  public readonly exceptionVarName: string;
  public readonly body: JavaBlockStmt;

  constructor(exceptionTypeName: string, exceptionVarName: string, body: JavaBlockStmt) {
    this.exceptionTypeName = exceptionTypeName;
    this.exceptionVarName = exceptionVarName;
    this.body = body;
  }
}

