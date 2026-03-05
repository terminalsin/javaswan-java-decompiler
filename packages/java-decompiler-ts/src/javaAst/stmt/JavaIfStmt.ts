import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';
import { JavaBlockStmt } from './JavaBlockStmt';

export class JavaIfStmt implements JavaStmt {
    public readonly condition: JavaExpr;
    public readonly thenBranch: JavaBlockStmt;
    public readonly elseBranch: JavaBlockStmt | null;

    constructor(condition: JavaExpr, thenBranch: JavaBlockStmt, elseBranch: JavaBlockStmt | null) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
}

