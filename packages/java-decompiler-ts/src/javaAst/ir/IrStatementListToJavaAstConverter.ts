import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from '../../source/formatting/JavaTypeNameFormatter';
import { TypeSort } from '@blkswn/java-asm';
import { JavaIdentifierSanitizer } from '../../source/naming/JavaIdentifierSanitizer';
import {
    type Stmt,
    type Expr,
    VarStoreStmt,
    ArrayStoreStmt,
    FieldStoreStmt,
    ReturnStmt,
    PopStmt,
    ThrowStmt,
    UnconditionalJumpStmt,
    VirtualInvocationExpr,
    VirtualInvocationKind,
    StaticInvocationExpr,
    NewExpr,
    NewArrayExpr,
    VarExpr,
    ConstantExpr,
} from '@blkswn/java-ir';
import type { JavaStmt } from '../stmt/JavaStmt';
import { JavaAssignStmt } from '../stmt/JavaAssignStmt';
import { JavaArrayAccessExpr } from '../expr/JavaArrayAccessExpr';
import type { JavaExpr } from '../expr/JavaExpr';
import { JavaFieldAccessExpr } from '../expr/JavaFieldAccessExpr';
import { JavaIdentifierExpr } from '../expr/JavaIdentifierExpr';
import { JavaArrayInitExpr } from '../expr/JavaArrayInitExpr';
import { JavaNewClassExpr } from '../expr/JavaNewClassExpr';
import { JavaTypeNameExpr } from '../expr/JavaTypeNameExpr';
import { JavaThrowStmt } from '../stmt/JavaThrowStmt';
import { JavaReturnStmt } from '../stmt/JavaReturnStmt';
import { JavaExprStmt } from '../stmt/JavaExprStmt';
import { IrExpressionToJavaAstConverter } from './IrExpressionToJavaAstConverter';
import { IrStatementToJavaAstConverter, type IrStatementToJavaAstContext } from './IrStatementToJavaAstConverter';

/**
 * Converts a list of IR statements to Java AST statements, applying small sequence-level
 * peephole optimizations that require multi-statement context.
 */
export class IrStatementListToJavaAstConverter {
    private readonly singleStmtConverter = new IrStatementToJavaAstConverter();
    private readonly exprConverter = new IrExpressionToJavaAstConverter();
    private readonly sanitizer = new JavaIdentifierSanitizer();
    private readonly typeNameFormatter = new JavaTypeNameFormatter();

    private nextTempArrayId: number = 0;

    public convert(statements: readonly Stmt[], ctx: IrStatementToJavaAstContext): JavaStmt[] {
        const out: JavaStmt[] = [];

        // Pre-pass: Build a map of initialized NewExpr → constructor info.
        // When bytecode does NEW + DUP + args + INVOKESPECIAL <init>, the DUP creates
        // a second reference to the same NewExpr. The <init> call consumes the top copy,
        // leaving the bare NewExpr on the stack for later use (return, store, etc.).
        // We track these so that later references render as `new T(args)` with arguments.
        const initializedNewExprs = this.buildInitializedNewExprMap(statements);

        // Pre-pass: Detect varargs patterns (NewArrayExpr filled with consecutive stores, used as method arg).
        // These are expanded inline at the call site instead of hoisted into temps.
        const varargs = this.detectVarargsPatterns(statements, ctx);

        // Pre-pass: Detect array initializer patterns (NewArrayExpr stored to var/field + consecutive fills).
        // These are emitted as `new Type[] {elem1, elem2, ...}` instead of element-by-element stores.
        const arrayInits = this.detectArrayInitPatterns(statements, ctx);

        // If a NewArrayExpr is referenced by multiple statements (e.g., array element stores + a final field store),
        // we must hoist the allocation into a temp. Otherwise we'd emit `new byte[5][0] = ...` which is both
        // confusing and semantically wrong (it allocates a new array each time).
        const newArrayUsageCounts = this.countDirectNewArrayUsages(statements);
        const boundArrayNames = new Map<NewArrayExpr, string>();
        const emittedArrayBindings = new Set<NewArrayExpr>();

        for (let i = 0; i < statements.length; i++) {
            // Skip ArrayStoreStmts that are part of a varargs expansion or array initializer
            if (varargs.skipIndices.has(i) || arrayInits.skipIndices.has(i)) continue;

            const stmt = statements[i]!;

            // Stop at control-flow terminators: any statements after a goto/return/throw
            // within the same block are dead code (e.g., inlined exception handler stubs
            // for monitor cleanup). Processing them would produce broken output.
            if (stmt instanceof UnconditionalJumpStmt) break;

            const next = statements[i + 1];

            // Skip PopStmt that initializes a tracked NewExpr (the init is merged into the NewExpr reference)
            if (this.isTrackedInitCall(stmt, initializedNewExprs)) {
                continue;
            }

            const hoisted = this.tryConvertNewArrayHoisting(stmt, ctx, newArrayUsageCounts, boundArrayNames, emittedArrayBindings, arrayInits.initializers);
            if (hoisted) {
                out.push(...hoisted);
                continue;
            }

            const mergedThrow = this.tryMergeInitThenThrow(stmt, next, ctx);
            if (mergedThrow) {
                out.push(mergedThrow);
                i += 1; // consume next
                continue;
            }

            const merged = this.tryMergeNewAndInit(stmt, next, ctx);
            if (merged) {
                out.push(merged);
                i += 1; // consume next
                continue;
            }

            // Build a context that includes bound array names and varargs expansions
            const effectiveCtx = (boundArrayNames.size > 0 || varargs.expansions.size > 0)
                ? { ...ctx, exprContext: {
                    ...ctx.exprContext,
                    boundNewArrayNames: boundArrayNames as ReadonlyMap<object, string>,
                    varargsExpansions: varargs.expansions as ReadonlyMap<object, readonly JavaExpr[]>,
                  } }
                : ctx;

            // Convert the statement, substituting initialized NewExprs
            const converted = this.convertWithNewExprSubstitution(stmt, effectiveCtx, initializedNewExprs);
            if (converted) {
                out.push(...converted);
            } else {
                out.push(...this.singleStmtConverter.convert(stmt, effectiveCtx));
            }
        }

        return out;
    }

    private allocateTempArrayName(): string {
        const id = this.nextTempArrayId++;
        return `tmpArray${id}`;
    }

    private countDirectNewArrayUsages(statements: readonly Stmt[]): Map<NewArrayExpr, number> {
        const counts = new Map<NewArrayExpr, number>();

        const walkExpr = (expr: unknown): void => {
            if (expr instanceof NewArrayExpr) {
                counts.set(expr, (counts.get(expr) ?? 0) + 1);
            }
            // Recurse into invocation arguments to catch arrays passed as method args
            if (expr instanceof VirtualInvocationExpr || expr instanceof StaticInvocationExpr) {
                for (const arg of (expr as { args: readonly unknown[] }).args) {
                    walkExpr(arg);
                }
            }
        };

        for (const stmt of statements) {
            if (stmt instanceof VarStoreStmt) walkExpr(stmt.value);
            if (stmt instanceof FieldStoreStmt) walkExpr(stmt.value);
            if (stmt instanceof ArrayStoreStmt) walkExpr(stmt.array);
            if (stmt instanceof ReturnStmt && stmt.value) walkExpr(stmt.value);
            if (stmt instanceof PopStmt) walkExpr(stmt.value);
            if (stmt instanceof ThrowStmt) walkExpr(stmt.exception);
        }

        return counts;
    }

    private tryConvertNewArrayHoisting(
        stmt: Stmt,
        ctx: IrStatementToJavaAstContext,
        newArrayUsageCounts: ReadonlyMap<NewArrayExpr, number>,
        boundArrayNames: Map<NewArrayExpr, string>,
        emittedArrayBindings: Set<NewArrayExpr>,
        arrayInitializers?: ReadonlyMap<NewArrayExpr, JavaArrayInitExpr>
    ): JavaStmt[] | null {
        // If a local directly stores the NewArrayExpr, treat that local as the binding.
        if (stmt instanceof VarStoreStmt && stmt.value instanceof NewArrayExpr) {
            // Check if this array has an initializer form (new int[] {1, 2, 3})
            const initExpr = arrayInitializers?.get(stmt.value);
            if (initExpr) {
                const rawName = ctx.exprContext.resolveVariableName?.(stmt.index) ?? stmt.name ?? `var${stmt.index}`;
                const varName = this.sanitizer.sanitize(rawName);
                let declTypeName: string | null = null;
                if (ctx.declaredVariables && !ctx.declaredVariables.has(stmt.index)) {
                    ctx.declaredVariables.add(stmt.index);
                    declTypeName = ctx.resolveVariableTypeName?.(stmt.index) ?? null;
                    if (!declTypeName) {
                        declTypeName = this.inferTypeFromExpr(stmt.value, ctx.exprContext.typeContext);
                    }
                }
                return [new JavaAssignStmt(new JavaIdentifierExpr(varName), initExpr, declTypeName)];
            }

            const count = newArrayUsageCounts.get(stmt.value) ?? 0;
            if (count <= 1) return null;

            const rawName = ctx.exprContext.resolveVariableName?.(stmt.index) ?? stmt.name ?? `var${stmt.index}`;
            const varName = this.sanitizer.sanitize(rawName);
            boundArrayNames.set(stmt.value, varName);
            emittedArrayBindings.add(stmt.value);
            return this.singleStmtConverter.convert(stmt, ctx);
        }

        if (stmt instanceof ArrayStoreStmt && stmt.array instanceof NewArrayExpr) {
            const count = newArrayUsageCounts.get(stmt.array) ?? 0;
            if (count <= 1) return null;

            const arrExpr = stmt.array;
            const arrName = boundArrayNames.get(arrExpr) ?? this.allocateTempArrayName();
            boundArrayNames.set(arrExpr, arrName);

            const out: JavaStmt[] = [];
            if (!emittedArrayBindings.has(arrExpr)) {
                const allocation = this.exprConverter.convert(arrExpr, ctx.exprContext);
                const arrayTypeName = this.inferTypeFromExpr(arrExpr, ctx.exprContext.typeContext);
                out.push(new JavaAssignStmt(new JavaIdentifierExpr(arrName), allocation, arrayTypeName));
                emittedArrayBindings.add(arrExpr);
            }

            const index = this.exprConverter.convert(stmt.index, ctx.exprContext);
            const value = this.exprConverter.convert(stmt.value, ctx.exprContext);
            out.push(new JavaAssignStmt(new JavaArrayAccessExpr(new JavaIdentifierExpr(arrName), index), value));
            return out;
        }

        if (stmt instanceof FieldStoreStmt && stmt.value instanceof NewArrayExpr) {
            // Check if this array has an initializer form
            const initExpr = arrayInitializers?.get(stmt.value);
            if (initExpr) {
                const fieldName = this.sanitizer.sanitize(stmt.fieldName);
                let target: JavaExpr;
                if (stmt.isStatic || !stmt.instance) {
                    if (stmt.owner === ctx.exprContext.currentClassInternalName) {
                        target = new JavaIdentifierExpr(fieldName);
                    } else {
                        target = new JavaFieldAccessExpr(
                            new JavaTypeNameExpr(this.typeNameFormatter.formatInternalName(stmt.owner, ctx.exprContext.typeContext)),
                            fieldName
                        );
                    }
                } else {
                    target = new JavaFieldAccessExpr(this.exprConverter.convert(stmt.instance, ctx.exprContext), fieldName);
                }
                return [new JavaAssignStmt(target, initExpr)];
            }

            const count = newArrayUsageCounts.get(stmt.value) ?? 0;
            if (count <= 1) return null;

            const arrExpr = stmt.value;
            const arrName = boundArrayNames.get(arrExpr) ?? this.allocateTempArrayName();
            boundArrayNames.set(arrExpr, arrName);

            const out: JavaStmt[] = [];
            if (!emittedArrayBindings.has(arrExpr)) {
                const allocation = this.exprConverter.convert(arrExpr, ctx.exprContext);
                out.push(new JavaAssignStmt(new JavaIdentifierExpr(arrName), allocation));
                emittedArrayBindings.add(arrExpr);
            }

            const fieldName = this.sanitizer.sanitize(stmt.fieldName);
            let target: JavaExpr;
            if (stmt.isStatic || !stmt.instance) {
                if (stmt.owner === ctx.exprContext.currentClassInternalName) {
                    target = new JavaIdentifierExpr(fieldName);
                } else {
                    target = new JavaFieldAccessExpr(
                        new JavaTypeNameExpr(this.typeNameFormatter.formatInternalName(stmt.owner, ctx.exprContext.typeContext)),
                        fieldName
                    );
                }
            } else {
                target = new JavaFieldAccessExpr(this.exprConverter.convert(stmt.instance, ctx.exprContext), fieldName);
            }

            out.push(new JavaAssignStmt(target, new JavaIdentifierExpr(arrName)));
            return out;
        }

        return null;
    }

    /**
     * Matches: `pop new T().<init>(args)` ; `throw <same new T()>`
     *
     * The Java AST form we want is: `throw new T(args);`
     *
     * This relies on IR expression identity: the same NewExpr instance is used both as
     * the constructor receiver and the thrown value (IRPrinter would otherwise introduce
     * a temp for readability).
     */
    private tryMergeInitThenThrow(
        first: Stmt,
        second: Stmt | undefined,
        ctx: IrStatementToJavaAstContext
    ): JavaThrowStmt | null {
        if (!(first instanceof PopStmt)) return null;
        if (!(first.value instanceof VirtualInvocationExpr)) return null;
        if (!second || !(second instanceof ThrowStmt)) return null;

        const inv = first.value;
        if (inv.kind !== VirtualInvocationKind.SPECIAL) return null;
        if (inv.methodName !== '<init>') return null;
        if (!(inv.receiver instanceof NewExpr)) return null;

        // Must throw the exact same allocation that was just initialized.
        if (second.exception !== inv.receiver) return null;

        const typeName = this.typeNameFormatter.formatInternalName(inv.owner, ctx.exprContext.typeContext);
        const args = inv.args.map(a => this.exprConverter.convert(a, ctx.exprContext));
        return new JavaThrowStmt(new JavaNewClassExpr(typeName, args));
    }

    /**
     * Matches: `tmp = new T` ; `pop tmp.<init>(args)`  ->  `tmp = new T(args)`
     *
     * This prevents ugly `_init_` emission for constructor calls where the receiver is stored
     * in a local variable before the invokespecial.
     */
    private tryMergeNewAndInit(
        first: Stmt,
        second: Stmt | undefined,
        ctx: IrStatementToJavaAstContext
    ): JavaAssignStmt | null {
        if (!(first instanceof VarStoreStmt)) return null;
        if (!(first.value instanceof NewExpr)) return null;
        if (!second || !(second instanceof PopStmt)) return null;
        if (!(second.value instanceof VirtualInvocationExpr)) return null;

        const inv = second.value;
        if (inv.kind !== VirtualInvocationKind.SPECIAL) return null;
        if (inv.methodName !== '<init>') return null;
        if (!(inv.receiver instanceof VarExpr)) return null;

        // Must initialize the same local we just stored the allocation into.
        if (inv.receiver.index !== first.index) return null;

        const rawName = ctx.exprContext.resolveVariableName?.(first.index) ?? first.name ?? `var${first.index}`;
        const varName = this.sanitizer.sanitize(rawName);
        const typeName = this.typeNameFormatter.formatInternalName(inv.owner, ctx.exprContext.typeContext);
        const args = inv.args.map(a => this.exprConverter.convert(a, ctx.exprContext));

        let declTypeName: string | null = null;
        if (ctx.declaredVariables && !ctx.declaredVariables.has(first.index)) {
            ctx.declaredVariables.add(first.index);
            declTypeName = ctx.resolveVariableTypeName?.(first.index) ?? null;
        }

        return new JavaAssignStmt(new JavaIdentifierExpr(varName), new JavaNewClassExpr(typeName, args), declTypeName);
    }

    /**
     * Pre-scans statements for PopStmt(VirtualInvocationExpr(<init>, receiver=NewExpr, args))
     * and builds a map from NewExpr identity to { owner, args } for later substitution.
     */
    private buildInitializedNewExprMap(statements: readonly Stmt[]): Map<NewExpr, { owner: string; args: readonly Expr[] }> {
        const map = new Map<NewExpr, { owner: string; args: readonly Expr[] }>();

        for (const stmt of statements) {
            if (!(stmt instanceof PopStmt)) continue;
            if (!(stmt.value instanceof VirtualInvocationExpr)) continue;

            const inv = stmt.value;
            if (inv.kind !== VirtualInvocationKind.SPECIAL) continue;
            if (inv.methodName !== '<init>') continue;
            if (!(inv.receiver instanceof NewExpr)) continue;

            map.set(inv.receiver, { owner: inv.owner, args: inv.args });
        }

        return map;
    }

    /**
     * Checks if a statement is a PopStmt(<init>) that initializes a tracked NewExpr.
     */
    private isTrackedInitCall(stmt: Stmt, initMap: ReadonlyMap<NewExpr, unknown>): boolean {
        if (!(stmt instanceof PopStmt)) return false;
        if (!(stmt.value instanceof VirtualInvocationExpr)) return false;

        const inv = stmt.value;
        if (inv.kind !== VirtualInvocationKind.SPECIAL) return false;
        if (inv.methodName !== '<init>') return false;
        if (!(inv.receiver instanceof NewExpr)) return false;

        return initMap.has(inv.receiver);
    }

    /**
     * Converts a statement while substituting tracked NewExpr instances with their
     * initialized forms (new T(args) instead of new T()).
     */
    private inferTypeFromExpr(expr: Expr, typeContext: JavaTypeNameFormattingContext): string | null {
        try {
            const type = expr.type;
            const sort = type.getSort();
            if (sort === TypeSort.VOID) return null;
            return this.typeNameFormatter.formatType(type, typeContext);
        } catch {
            return null;
        }
    }

    /**
     * Detects varargs patterns: a NewArrayExpr filled by consecutive ArrayStoreStmts
     * (indices 0..N-1) and then used only as a method argument (not stored to a variable
     * or field). Returns the expansion map and statement indices to skip.
     */
    private detectVarargsPatterns(
        statements: readonly Stmt[],
        ctx: IrStatementToJavaAstContext
    ): { expansions: Map<NewArrayExpr, JavaExpr[]>; skipIndices: Set<number> } {
        const expansions = new Map<NewArrayExpr, JavaExpr[]>();
        const skipIndices = new Set<number>();

        // Group ArrayStoreStmts by their NewArrayExpr identity
        const storesByArray = new Map<NewArrayExpr, { stmtIndex: number; arrayIndex: number; value: Expr }[]>();

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i]!;
            if (
                stmt instanceof ArrayStoreStmt &&
                stmt.array instanceof NewArrayExpr &&
                stmt.index instanceof ConstantExpr &&
                typeof stmt.index.value === 'number' &&
                Number.isInteger(stmt.index.value)
            ) {
                const arr = stmt.array;
                const stores = storesByArray.get(arr) ?? [];
                stores.push({ stmtIndex: i, arrayIndex: stmt.index.value, value: stmt.value });
                storesByArray.set(arr, stores);
            }
        }

        for (const [arrExpr, stores] of storesByArray) {
            // Array must be 1-dimensional with a constant size matching the store count
            if (arrExpr.dimensions.length !== 1) continue;
            const dimExpr = arrExpr.dimensions[0];
            if (!(dimExpr instanceof ConstantExpr)) continue;
            if (typeof dimExpr.value !== 'number' || dimExpr.value !== stores.length) continue;

            // Stores must fill indices 0..N-1
            stores.sort((a, b) => a.arrayIndex - b.arrayIndex);
            let consecutive = true;
            for (let j = 0; j < stores.length; j++) {
                if (stores[j]!.arrayIndex !== j) {
                    consecutive = false;
                    break;
                }
            }
            if (!consecutive) continue;

            // The array must NOT be stored to a variable or field directly
            // (those represent real array usage, not varargs)
            let storedDirectly = false;
            for (const stmt of statements) {
                if (
                    (stmt instanceof VarStoreStmt && stmt.value === arrExpr) ||
                    (stmt instanceof FieldStoreStmt && stmt.value === arrExpr)
                ) {
                    storedDirectly = true;
                    break;
                }
            }
            if (storedDirectly) continue;

            // Build expansion: convert element values to JavaExprs
            const elements = stores.map(s => this.exprConverter.convert(s.value, ctx.exprContext));
            expansions.set(arrExpr, elements);
            for (const s of stores) {
                skipIndices.add(s.stmtIndex);
            }
        }

        return { expansions, skipIndices };
    }

    /**
     * Detects array initializer patterns: a NewArrayExpr stored to a variable/field,
     * followed by consecutive ArrayStoreStmts filling indices 0..N-1.
     * Returns a map from NewArrayExpr to JavaArrayInitExpr and indices to skip.
     */
    private detectArrayInitPatterns(
        statements: readonly Stmt[],
        ctx: IrStatementToJavaAstContext
    ): { initializers: Map<NewArrayExpr, JavaArrayInitExpr>; skipIndices: Set<number> } {
        const initializers = new Map<NewArrayExpr, JavaArrayInitExpr>();
        const skipIndices = new Set<number>();

        // Group ArrayStoreStmts by their NewArrayExpr identity
        const storesByArray = new Map<NewArrayExpr, { stmtIndex: number; arrayIndex: number; value: Expr }[]>();

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i]!;
            if (
                stmt instanceof ArrayStoreStmt &&
                stmt.array instanceof NewArrayExpr &&
                stmt.index instanceof ConstantExpr &&
                typeof stmt.index.value === 'number' &&
                Number.isInteger(stmt.index.value)
            ) {
                const arr = stmt.array;
                const stores = storesByArray.get(arr) ?? [];
                stores.push({ stmtIndex: i, arrayIndex: stmt.index.value, value: stmt.value });
                storesByArray.set(arr, stores);
            }
        }

        for (const [arrExpr, stores] of storesByArray) {
            // Array must be 1-dimensional with a constant size matching the store count
            if (arrExpr.dimensions.length !== 1) continue;
            const dimExpr = arrExpr.dimensions[0];
            if (!(dimExpr instanceof ConstantExpr)) continue;
            if (typeof dimExpr.value !== 'number' || dimExpr.value !== stores.length) continue;

            // Stores must fill indices 0..N-1
            stores.sort((a, b) => a.arrayIndex - b.arrayIndex);
            let consecutive = true;
            for (let j = 0; j < stores.length; j++) {
                if (stores[j]!.arrayIndex !== j) {
                    consecutive = false;
                    break;
                }
            }
            if (!consecutive) continue;

            // The array MUST be stored to a variable or field (opposite of varargs)
            let storedDirectly = false;
            for (const stmt of statements) {
                if (
                    (stmt instanceof VarStoreStmt && stmt.value === arrExpr) ||
                    (stmt instanceof FieldStoreStmt && stmt.value === arrExpr)
                ) {
                    storedDirectly = true;
                    break;
                }
            }
            if (!storedDirectly) continue;

            // Build array init expression
            const elementType = this.typeNameFormatter.formatType(arrExpr.elementType, ctx.exprContext.typeContext);
            const elements = stores.map(s => this.exprConverter.convert(s.value, ctx.exprContext));
            initializers.set(arrExpr, new JavaArrayInitExpr(elementType, elements));
            for (const s of stores) {
                skipIndices.add(s.stmtIndex);
            }
        }

        return { initializers, skipIndices };
    }

    private convertWithNewExprSubstitution(
        stmt: Stmt,
        ctx: IrStatementToJavaAstContext,
        initMap: ReadonlyMap<NewExpr, { owner: string; args: readonly Expr[] }>
    ): JavaStmt[] | null {
        if (initMap.size === 0) return null;

        // Helper to convert an IR expr, substituting NewExpr with initialized form
        const convertExpr = (expr: Expr): JavaExpr => {
            if (expr instanceof NewExpr && initMap.has(expr)) {
                const info = initMap.get(expr)!;
                const typeName = this.typeNameFormatter.formatInternalName(info.owner, ctx.exprContext.typeContext);
                const args = info.args.map(a => this.exprConverter.convert(a, ctx.exprContext));
                return new JavaNewClassExpr(typeName, args);
            }
            return this.exprConverter.convert(expr, ctx.exprContext);
        };

        // ReturnStmt returning a tracked NewExpr
        if (stmt instanceof ReturnStmt && stmt.value instanceof NewExpr && initMap.has(stmt.value)) {
            return [new JavaReturnStmt(convertExpr(stmt.value))];
        }

        // VarStoreStmt storing a tracked NewExpr
        if (stmt instanceof VarStoreStmt && stmt.value instanceof NewExpr && initMap.has(stmt.value)) {
            const rawName = ctx.exprContext.resolveVariableName?.(stmt.index) ?? stmt.name ?? `var${stmt.index}`;
            const name = this.sanitizer.sanitize(rawName);
            let declTypeName: string | null = null;
            if (ctx.declaredVariables && !ctx.declaredVariables.has(stmt.index)) {
                ctx.declaredVariables.add(stmt.index);
                declTypeName = ctx.resolveVariableTypeName?.(stmt.index) ?? null;
                if (!declTypeName) {
                    declTypeName = this.inferTypeFromExpr(stmt.value, ctx.exprContext.typeContext);
                }
            }
            return [new JavaAssignStmt(new JavaIdentifierExpr(name), convertExpr(stmt.value), declTypeName)];
        }

        // FieldStoreStmt storing a tracked NewExpr
        if (stmt instanceof FieldStoreStmt && stmt.value instanceof NewExpr && initMap.has(stmt.value)) {
            const fieldName = this.sanitizer.sanitize(stmt.fieldName);
            const value = convertExpr(stmt.value);
            if (stmt.isStatic || !stmt.instance) {
                // Omit class prefix for static fields on the current class
                if (stmt.owner === ctx.exprContext.currentClassInternalName) {
                    return [new JavaAssignStmt(new JavaIdentifierExpr(fieldName), value)];
                }
                const owner = this.typeNameFormatter.formatInternalName(stmt.owner, ctx.exprContext.typeContext);
                const target = new JavaFieldAccessExpr(new JavaTypeNameExpr(owner), fieldName);
                return [new JavaAssignStmt(target, value)];
            }
            const instance = this.exprConverter.convert(stmt.instance, ctx.exprContext);
            const target = new JavaFieldAccessExpr(instance, fieldName);
            return [new JavaAssignStmt(target, value)];
        }

        // ThrowStmt throwing a tracked NewExpr
        if (stmt instanceof ThrowStmt && stmt.exception instanceof NewExpr && initMap.has(stmt.exception)) {
            return [new JavaThrowStmt(convertExpr(stmt.exception))];
        }

        // PopStmt with a tracked NewExpr as standalone expression (e.g., side effect only)
        if (stmt instanceof PopStmt && stmt.value instanceof NewExpr && initMap.has(stmt.value)) {
            return [new JavaExprStmt(convertExpr(stmt.value))];
        }

        return null;
    }
}

