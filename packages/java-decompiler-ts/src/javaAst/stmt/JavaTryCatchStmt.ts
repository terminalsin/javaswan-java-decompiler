import { JavaBlockStmt } from './JavaBlockStmt';
import type { JavaStmt } from './JavaStmt';
import type { JavaCatchClause } from './JavaCatchClause';

export class JavaTryCatchStmt implements JavaStmt {
  public readonly tryBlock: JavaBlockStmt;
  public readonly catches: readonly JavaCatchClause[];
  public readonly finallyBlock: JavaBlockStmt | null;

  constructor(tryBlock: JavaBlockStmt, catches: readonly JavaCatchClause[], finallyBlock: JavaBlockStmt | null = null) {
    this.tryBlock = tryBlock;
    this.catches = catches;
    this.finallyBlock = finallyBlock;
  }
}

