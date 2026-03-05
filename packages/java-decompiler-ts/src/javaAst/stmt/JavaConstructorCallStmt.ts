import type { JavaExpr } from '../expr/JavaExpr';
import type { JavaStmt } from './JavaStmt';

export type JavaConstructorCallKind = 'super' | 'this';

export class JavaConstructorCallStmt implements JavaStmt {
    public readonly kind: JavaConstructorCallKind;
    public readonly args: readonly JavaExpr[];

    constructor(kind: JavaConstructorCallKind, args: readonly JavaExpr[]) {
        this.kind = kind;
        this.args = args;
    }
}

