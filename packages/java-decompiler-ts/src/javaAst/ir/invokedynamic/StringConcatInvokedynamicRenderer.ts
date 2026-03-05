import type { Type } from '@blkswn/java-asm';
import type { DynamicInvocationExpr, Expr } from '@blkswn/java-ir';
import { JavaBinaryExpr } from '../../expr/JavaBinaryExpr';
import type { JavaExpr } from '../../expr/JavaExpr';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';

/**
 * Attempts to render Java 9+ invokedynamic string concatenation into `a + "..." + b` form.
 *
 * This matches `java/lang/invoke/StringConcatFactory.makeConcatWithConstants`.
 */
export class StringConcatInvokedynamicRenderer {
    public tryRender(
        expr: DynamicInvocationExpr,
        deps: {
            readonly convertArg: (arg: Expr) => JavaExpr;
            readonly formatLiteral: (value: unknown, typeHint: Type | null) => string;
            readonly formatTypeName: (internalName: string) => string;
        }
    ): JavaExpr | null {
        const bsm = expr.bootstrapMethod;
        if (bsm.getOwner() !== 'java/lang/invoke/StringConcatFactory') {
            return null;
        }

        if (bsm.getName() !== 'makeConcatWithConstants') {
            return null;
        }

        const recipe = expr.bootstrapArgs[0];
        if (typeof recipe !== 'string') {
            return null;
        }

        const parts: JavaExpr[] = [];
        let pendingLiteral = '';
        let argIndex = 0;
        let constIndex = 1;

        const flushLiteral = (): void => {
            if (pendingLiteral.length === 0) return;
            parts.push(new JavaLiteralExpr(JSON.stringify(pendingLiteral)));
            pendingLiteral = '';
        };

        for (const ch of recipe) {
            if (ch === '\u0001') {
                flushLiteral();
                const arg = expr.args[argIndex++];
                if (!arg) {
                    parts.push(new JavaLiteralExpr('""'));
                } else {
                    parts.push(deps.convertArg(arg));
                }
                continue;
            }

            if (ch === '\u0002') {
                flushLiteral();
                const c = expr.bootstrapArgs[constIndex++];
                parts.push(this.formatConstantAsExpr(c, deps));
                continue;
            }

            pendingLiteral += ch;
        }

        flushLiteral();

        if (parts.length === 0) {
            return new JavaLiteralExpr('""');
        }

        let out = parts[0]!;
        for (let i = 1; i < parts.length; i++) {
            out = new JavaBinaryExpr(out, '+', parts[i]!);
        }
        return out;
    }

    private formatConstantAsExpr(
        value: unknown,
        deps: {
            readonly formatLiteral: (value: unknown, typeHint: Type | null) => string;
            readonly formatTypeName: (internalName: string) => string;
        }
    ): JavaExpr {
        if (this.isAsmType(value)) {
            const typeName = deps.formatTypeName(value.getInternalName());
            return new JavaLiteralExpr(`${typeName}.class`);
        }

        return new JavaLiteralExpr(deps.formatLiteral(value, null));
    }

    private isAsmType(value: unknown): value is Type {
        return (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as { getInternalName?: unknown }).getInternalName === 'function'
        );
    }
}

