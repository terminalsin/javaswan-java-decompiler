import { Type, TypeSort } from '@blkswn/java-asm';
import {
    type Expr,
    ArithmeticExpr,
    NegationExpr,
    VarExpr,
    ConstantExpr,
    ComparisonExpr,
    CastExpr,
    InstanceOfExpr,
    NewExpr,
    NewArrayExpr,
    ArrayLoadExpr,
    ArrayLengthExpr,
    FieldLoadExpr,
    StaticInvocationExpr,
    VirtualInvocationExpr,
    VirtualInvocationKind,
    DynamicInvocationExpr,
    PhiExpr,
    CaughtExceptionExpr,
} from '@blkswn/java-ir';
import { JavaIdentifierSanitizer } from '../naming/JavaIdentifierSanitizer';
import { JavaLiteralFormatter } from '../formatting/JavaLiteralFormatter';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from '../formatting/JavaTypeNameFormatter';

export interface IrExpressionToJavaSourceContext {
    readonly methodIsStatic: boolean;
    readonly currentClassInternalName: string;
    readonly currentSuperInternalName: string | null;
    readonly typeContext: JavaTypeNameFormattingContext;
}

export class IrExpressionToJavaSourceConverter {
    private readonly sanitizer = new JavaIdentifierSanitizer();
    private readonly literalFormatter = new JavaLiteralFormatter();
    private readonly typeNameFormatter = new JavaTypeNameFormatter();

    public convert(expr: Expr, ctx: IrExpressionToJavaSourceContext): string {
        if (expr instanceof VarExpr) {
            if (!ctx.methodIsStatic && expr.index === 0) {
                return 'this';
            }
            const raw = expr.name ?? `var${expr.index}`;
            return this.sanitizer.sanitize(raw);
        }

        if (expr instanceof ConstantExpr) {
            if (expr.value instanceof Type) {
                const typeName = this.typeNameFormatter.formatType(expr.value, ctx.typeContext);
                return `${typeName}.class`;
            }
            return this.literalFormatter.format(expr.value, expr.type);
        }

        if (expr instanceof ArithmeticExpr) {
            const left = this.convert(expr.left, ctx);
            const right = this.convert(expr.right, ctx);
            return `(${left} ${expr.op} ${right})`;
        }

        if (expr instanceof NegationExpr) {
            const operand = this.convert(expr.operand, ctx);
            return `(-${operand})`;
        }

        if (expr instanceof ComparisonExpr) {
            const left = this.convert(expr.left, ctx);
            const right = this.convert(expr.right, ctx);
            switch (expr.op) {
                case 'lcmp':
                    return `Long.compare(${left}, ${right})`;
                case 'fcmpl':
                case 'fcmpg':
                    return `Float.compare(${left}, ${right})`;
                case 'dcmpl':
                case 'dcmpg':
                    return `Double.compare(${left}, ${right})`;
                default:
                    return `/* ${expr.op} */ 0`;
            }
        }

        if (expr instanceof CastExpr) {
            const operand = this.convert(expr.operand, ctx);
            const typeName = this.typeNameFormatter.formatType(expr.type, ctx.typeContext);
            return `((${typeName}) ${operand})`;
        }

        if (expr instanceof InstanceOfExpr) {
            const operand = this.convert(expr.operand, ctx);
            const checkType = this.typeNameFormatter.formatType(expr.checkType, ctx.typeContext);
            return `(${operand} instanceof ${checkType})`;
        }

        if (expr instanceof ArrayLoadExpr) {
            const array = this.convert(expr.array, ctx);
            const index = this.convert(expr.index, ctx);
            return `${array}[${index}]`;
        }

        if (expr instanceof ArrayLengthExpr) {
            const array = this.convert(expr.array, ctx);
            return `${array}.length`;
        }

        if (expr instanceof NewArrayExpr) {
            const elementType = this.typeNameFormatter.formatType(expr.elementType, ctx.typeContext);
            const dims = expr.dimensions.map(d => `[${this.convert(d, ctx)}]`).join('');
            return `new ${elementType}${dims}`;
        }

        if (expr instanceof NewExpr) {
            const typeName = this.typeNameFormatter.formatType(expr.type, ctx.typeContext);
            return `new ${typeName}() /* allocation */`;
        }

        if (expr instanceof FieldLoadExpr) {
            const field = this.sanitizer.sanitize(expr.fieldName);
            if (expr.isStatic || !expr.instance) {
                const owner = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
                return `${owner}.${field}`;
            }
            const instance = this.convert(expr.instance, ctx);
            return `${instance}.${field}`;
        }

        if (expr instanceof StaticInvocationExpr) {
            const owner = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
            const method = this.sanitizer.sanitize(expr.methodName);
            const args = expr.args.map(a => this.convert(a, ctx)).join(', ');
            return `${owner}.${method}(${args})`;
        }

        if (expr instanceof VirtualInvocationExpr) {
            return this.convertVirtualInvocation(expr, ctx);
        }

        if (expr instanceof DynamicInvocationExpr) {
            const args = expr.args.map(a => this.convert(a, ctx)).join(', ');
            const name = this.sanitizer.sanitize(expr.methodName);
            return `invokedynamic_${name}(${args})`;
        }

        if (expr instanceof PhiExpr) {
            return this.defaultValueForType(expr.type);
        }

        if (expr instanceof CaughtExceptionExpr) {
            return 'null /* caught exception */';
        }

        return 'null /* unsupported expr */';
    }

    private convertVirtualInvocation(expr: VirtualInvocationExpr, ctx: IrExpressionToJavaSourceContext): string {
        const args = expr.args.map(a => this.convert(a, ctx)).join(', ');

        // Constructor call on allocation: new T(args)
        if (expr.kind === VirtualInvocationKind.SPECIAL && expr.methodName === '<init>' && expr.receiver instanceof NewExpr) {
            const typeName = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
            return `new ${typeName}(${args})`;
        }

        // Constructor chaining / super call inside <init>
        if (expr.kind === VirtualInvocationKind.SPECIAL && expr.methodName === '<init>') {
            const receiver = this.convert(expr.receiver, ctx);
            if (receiver === 'this') {
                if (ctx.currentSuperInternalName && expr.owner === ctx.currentSuperInternalName) {
                    return `super(${args})`;
                }
                if (expr.owner === ctx.currentClassInternalName) {
                    return `this(${args})`;
                }
            }
            const owner = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
            return `${owner}.<init>(${args}) /* invokespecial */`;
        }

        const receiver = this.convert(expr.receiver, ctx);
        const method = this.sanitizer.sanitize(expr.methodName);
        return `${receiver}.${method}(${args})`;
    }

    private defaultValueForType(type: Type): string {
        const sort = type.getSort();
        if (sort === TypeSort.VOID) return '/* void */';
        if (sort === TypeSort.BOOLEAN) return 'false';
        if (sort === TypeSort.CHAR) return "'\\0'";
        if (
            sort === TypeSort.BYTE ||
            sort === TypeSort.SHORT ||
            sort === TypeSort.INT ||
            sort === TypeSort.LONG
        ) {
            return '0';
        }
        if (sort === TypeSort.FLOAT) return '0.0f';
        if (sort === TypeSort.DOUBLE) return '0.0';
        return 'null';
    }
}

