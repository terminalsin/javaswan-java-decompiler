import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';

export class JavaReturnStmt implements JavaStmt {
    public readonly expression: JavaExpr | null;

    constructor(expression: JavaExpr | null) {
        this.expression = expression;
    }
}

