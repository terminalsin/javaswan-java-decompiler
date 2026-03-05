import type { JavaExpr } from './JavaExpr';

export class JavaMethodCallExpr implements JavaExpr {
    public readonly target: JavaExpr;
    public readonly methodName: string;
    public readonly args: readonly JavaExpr[];

    constructor(target: JavaExpr, methodName: string, args: readonly JavaExpr[]) {
        this.target = target;
        this.methodName = methodName;
        this.args = args;
    }
}

