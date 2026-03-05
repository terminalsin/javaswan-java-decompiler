import type { JavaStmt } from './JavaStmt';

export class JavaBlockStmt implements JavaStmt {
  public readonly statements: JavaStmt[];

  constructor(statements: JavaStmt[] = []) {
    this.statements = statements;
  }
}

