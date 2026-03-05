import type { JavaExpr } from '../../expr/JavaExpr';
import { JavaBinaryExpr } from '../../expr/JavaBinaryExpr';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';
import { JavaUnaryExpr } from '../../expr/JavaUnaryExpr';

export class JavaConditionNegator {
    public negate(condition: JavaExpr): JavaExpr {
        if (condition instanceof JavaUnaryExpr && condition.operator === '!') {
            return condition.operand;
        }

        if (condition instanceof JavaLiteralExpr) {
            if (condition.text === 'true') return new JavaLiteralExpr('false');
            if (condition.text === 'false') return new JavaLiteralExpr('true');
        }

        if (condition instanceof JavaBinaryExpr) {
            const inverted = this.invertOperator(condition.operator);
            if (inverted) {
                return new JavaBinaryExpr(condition.left, inverted, condition.right);
            }
        }

        return new JavaUnaryExpr('!', condition);
    }

    private invertOperator(op: string): string | null {
        switch (op) {
            case '==': return '!=';
            case '!=': return '==';
            case '<': return '>=';
            case '<=': return '>';
            case '>': return '<=';
            case '>=': return '<';
            default: return null;
        }
    }
}

