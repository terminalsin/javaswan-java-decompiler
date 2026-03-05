import type { JavaExpr } from './JavaExpr';

export class JavaUnaryExpr implements JavaExpr {
    public readonly operator: string;
    public readonly operand: JavaExpr;

    constructor(operator: string, operand: JavaExpr) {
        this.operator = operator;
        this.operand = operand;
    }
}

