import {
    type Stmt,
    VarStoreStmt,
    ArrayStoreStmt,
    FieldStoreStmt,
    ReturnStmt,
    ThrowStmt,
    PopStmt,
    MonitorStmt,
    MonitorKind,
    NopStmt,
    LineNumberStmt,
    FrameStmt,
} from '@blkswn/java-ir';
import { JavaIdentifierSanitizer } from '../naming/JavaIdentifierSanitizer';
import { IrExpressionToJavaSourceConverter, type IrExpressionToJavaSourceContext } from './IrExpressionToJavaSourceConverter';
import { JavaTypeNameFormatter } from '../formatting/JavaTypeNameFormatter';

export interface IrStatementToJavaSourceContext {
    readonly exprContext: IrExpressionToJavaSourceContext;
    readonly includeDebugComments: boolean;
}

export class IrStatementToJavaSourceConverter {
    private readonly exprConverter = new IrExpressionToJavaSourceConverter();
    private readonly sanitizer = new JavaIdentifierSanitizer();
    private readonly typeNameFormatter = new JavaTypeNameFormatter();

    public convert(stmt: Stmt, ctx: IrStatementToJavaSourceContext): string[] {
        if (stmt instanceof VarStoreStmt) {
            const name = this.sanitizer.sanitize(stmt.name ?? `var${stmt.index}`);
            const value = this.exprConverter.convert(stmt.value, ctx.exprContext);
            return [`${name} = ${value};`];
        }

        if (stmt instanceof ArrayStoreStmt) {
            const array = this.exprConverter.convert(stmt.array, ctx.exprContext);
            const index = this.exprConverter.convert(stmt.index, ctx.exprContext);
            const value = this.exprConverter.convert(stmt.value, ctx.exprContext);
            return [`${array}[${index}] = ${value};`];
        }

        if (stmt instanceof FieldStoreStmt) {
            const field = this.sanitizer.sanitize(stmt.fieldName);
            const value = this.exprConverter.convert(stmt.value, ctx.exprContext);
            if (stmt.isStatic || !stmt.instance) {
                const owner = this.typeNameFormatter.formatInternalName(stmt.owner, ctx.exprContext.typeContext);
                return [`${owner}.${field} = ${value};`];
            }
            const instance = this.exprConverter.convert(stmt.instance, ctx.exprContext);
            return [`${instance}.${field} = ${value};`];
        }

        if (stmt instanceof ReturnStmt) {
            if (!stmt.value) {
                return ['return;'];
            }
            const value = this.exprConverter.convert(stmt.value, ctx.exprContext);
            return [`return ${value};`];
        }

        if (stmt instanceof ThrowStmt) {
            const exc = this.exprConverter.convert(stmt.exception, ctx.exprContext);
            return [`throw ${exc};`];
        }

        if (stmt instanceof PopStmt) {
            const expr = this.exprConverter.convert(stmt.value, ctx.exprContext);
            return [`${expr};`];
        }

        if (stmt instanceof MonitorStmt) {
            if (!ctx.includeDebugComments) {
                return ['/* synchronized region (monitor) omitted */'];
            }
            const obj = this.exprConverter.convert(stmt.object, ctx.exprContext);
            const kind = stmt.kind === MonitorKind.ENTER ? 'enter' : 'exit';
            return [`/* monitor${kind} ${obj} */`];
        }

        if (stmt instanceof LineNumberStmt) {
            if (!ctx.includeDebugComments) {
                return [];
            }
            return [`/* line ${stmt.line} */`];
        }

        if (stmt instanceof FrameStmt) {
            if (!ctx.includeDebugComments) {
                return [];
            }
            return [`/* frame ${stmt.frameType} */`];
        }

        if (stmt instanceof NopStmt) {
            return [];
        }

        // Control flow terminators are handled by CFG-level decompilers.
        return ctx.includeDebugComments ? [`/* unsupported stmt: ${stmt.toString()} */`] : [];
    }
}

