import type { MethodIR, ControlFlowGraph, ExceptionHandler, Stmt } from '@blkswn/java-ir';
import { UnconditionalJumpStmt, VarStoreStmt, PhiExpr } from '@blkswn/java-ir';
import { Type } from '@blkswn/java-asm';
import { JavaAssignStmt } from '../../stmt/JavaAssignStmt';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import { JavaCommentStmt } from '../../stmt/JavaCommentStmt';
import { JavaForEachStmt } from '../../stmt/JavaForEachStmt';
import { JavaTryCatchStmt } from '../../stmt/JavaTryCatchStmt';
import { JavaCatchClause } from '../../stmt/JavaCatchClause';
import { JavaWhileStmt } from '../../stmt/JavaWhileStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { JavaMethodCallExpr } from '../../expr/JavaMethodCallExpr';
import { JavaIdentifierExpr } from '../../expr/JavaIdentifierExpr';
import { JavaCastExpr } from '../../expr/JavaCastExpr';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from '../../../source/formatting/JavaTypeNameFormatter';
import { JavaSignatureFormatter } from '../../../source/formatting/JavaSignatureFormatter';
import type { JavaClassDecompilationContext } from '../../../source/context/JavaClassDecompilationContext';
import { JavaIdentifierSanitizer } from '../../../source/naming/JavaIdentifierSanitizer';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { LinearControlFlowAstDecompiler } from './LinearControlFlowAstDecompiler';
import { SwitchControlFlowAstDecompiler } from './SwitchControlFlowAstDecompiler';
import { IfReturnControlFlowAstDecompiler } from './IfReturnControlFlowAstDecompiler';
import { WhileLoopControlFlowAstDecompiler } from './WhileLoopControlFlowAstDecompiler';
import { AcyclicGuardedIfExitControlFlowAstDecompiler } from './AcyclicGuardedIfExitControlFlowAstDecompiler';
import { StructuredControlFlowAstDecompiler } from './StructuredControlFlowAstDecompiler';
import { UnstructuredControlFlowFallbackAstEmitter } from './UnstructuredControlFlowFallbackAstEmitter';
import { JavaAstPrinter } from '../../printing/JavaAstPrinter';
import { JavaSourceWriter } from '../../../source/printing/JavaSourceWriter';

export class JavaMethodBodyAstBuilder {
    private readonly linear = new LinearControlFlowAstDecompiler();
    private readonly switchDecompiler = new SwitchControlFlowAstDecompiler();
    private readonly ifReturnDecompiler = new IfReturnControlFlowAstDecompiler();
    private readonly whileDecompiler = new WhileLoopControlFlowAstDecompiler();
    private readonly guardedIfExitDecompiler = new AcyclicGuardedIfExitControlFlowAstDecompiler();
    private readonly structured = new StructuredControlFlowAstDecompiler();
    private readonly fallback = new UnstructuredControlFlowFallbackAstEmitter();
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();
    private readonly typeNameFormatter = new JavaTypeNameFormatter();
    private readonly signatureFormatter = new JavaSignatureFormatter();
    private readonly sanitizer = new JavaIdentifierSanitizer();

    public build(method: MethodIR, classCtx: JavaClassDecompilationContext, includeDebugComments: boolean): JavaBlockStmt {
        if (!method.cfg) {
            return new JavaBlockStmt([new JavaCommentStmt('abstract or native')]);
        }

        const typeContext: JavaTypeNameFormattingContext = {
            currentPackageName: classCtx.currentPackageName,
            preferSimpleJavaLang: true,
            innerClassSimpleNames: classCtx.innerClassSimpleNames,
            importCollector: classCtx.importCollector,
        };

        // Pre-populate declared variables with method parameters (and 'this')
        const declaredVariables = new Set<number>();
        const paramSlotCount = method.getParameterSlotCount();
        for (let i = 0; i < paramSlotCount; i++) {
            declaredVariables.add(i);
        }

        const resolveVariableTypeName = (index: number): string | null => {
            // Prefer generic signature when available (e.g., List<String> instead of List)
            const signature = method.getVariableSignature(index, 0);
            if (signature) {
                const formatted = this.signatureFormatter.formatTypeSignature(signature, typeContext);
                if (formatted) return formatted;
            }

            const descriptor = method.getVariableDescriptor(index, 0);
            if (!descriptor) return null;
            try {
                const type = Type.getType(descriptor);
                return this.typeNameFormatter.formatType(type, typeContext);
            } catch {
                return null;
            }
        };

        const exprCtx = {
            methodIsStatic: method.isStatic(),
            currentClassInternalName: classCtx.currentClassInternalName,
            currentSuperInternalName: classCtx.currentSuperInternalName,
            typeContext,
            resolveVariableName: (index: number) => method.getVariableName(index, 0),
            classIR: classCtx.classIR,
            buildMethodBody: (m: MethodIR, ctx: typeof classCtx) => this.build(m, ctx, false),
        } as const;

        const stmtCtx: IrStatementToJavaAstContext = {
            exprContext: exprCtx,
            includeDebugComments,
            declaredVariables,
            resolveVariableTypeName,
        };

        const cfg = method.cfg;
        let result: JavaBlockStmt;
        if (cfg.exceptionHandlers.length > 0) {
            // Try to structure the method with basic try-catch support
            const tryCatch = this.tryBuildWithTryCatch(method, cfg, stmtCtx);
            result = tryCatch ?? this.fallback.emit(method, stmtCtx);
        } else {
            result = this.tryStructuredDecompile(method, cfg, stmtCtx)
                ?? this.fallback.emit(method, stmtCtx);
        }

        return this.transformForEachLoops(result);
    }

    private tryStructuredDecompile(method: MethodIR, cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt | null {
        // Each decompiler attempt may mutate declaredVariables. Save a snapshot before
        // each attempt and restore it if the attempt fails, so the next decompiler
        // starts with a clean set.
        const tryDecompiler = (fn: () => JavaBlockStmt | null): JavaBlockStmt | null => {
            const snapshot = stmtCtx.declaredVariables ? new Set(stmtCtx.declaredVariables) : null;
            const result = fn();
            if (!result && snapshot && stmtCtx.declaredVariables) {
                // Restore the set: clear and re-add snapshot values
                stmtCtx.declaredVariables.clear();
                for (const v of snapshot) stmtCtx.declaredVariables.add(v);
            }
            return result;
        };

        const linear = tryDecompiler(() => this.linear.tryDecompile(cfg, stmtCtx));
        if (linear) return linear;

        if (this.switchDecompiler.canHandle(cfg)) {
            return this.switchDecompiler.decompile(cfg, stmtCtx);
        }

        if (this.ifReturnDecompiler.canHandle(cfg)) {
            return this.ifReturnDecompiler.decompile(cfg, stmtCtx);
        }

        const loop = tryDecompiler(() => this.whileDecompiler.tryDecompile(cfg, stmtCtx));
        if (loop) return loop;

        const guarded = tryDecompiler(() => this.guardedIfExitDecompiler.tryDecompile(cfg, stmtCtx));
        if (guarded) return guarded;

        const structured = tryDecompiler(() => this.structured.tryDecompile(method, cfg, stmtCtx));
        if (structured) return structured;

        return null;
    }

    /**
     * Attempts to build a method body with try-catch blocks.
     * Groups exception handlers by protected region and builds structured try/catch statements.
     *
     * The algorithm:
     * 1. Determine the try region using handler startBlock/endBlock boundaries.
     * 2. Find handler-exclusive blocks by BFS from handler entries, bounded by the try region
     *    and post-try join blocks.
     * 3. Find post-try blocks: successors of the try region that are not handler entries.
     * 4. Emit: preamble + try { tryBody } catch { handlers } + postamble.
     */
    private tryBuildWithTryCatch(method: MethodIR, cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt | null {
        const handlers = cfg.exceptionHandlers;
        if (handlers.length === 0) return null;

        // Group handlers by their protected region (startBlock, endBlock)
        const groups = new Map<string, ExceptionHandler[]>();
        for (const h of handlers) {
            const key = `${h.startBlock}:${h.endBlock}`;
            const group = groups.get(key) ?? [];
            group.push(h);
            groups.set(key, group);
        }

        // Find overall try region boundaries
        let minStart = Infinity;
        let maxEnd = -Infinity;
        for (const h of handlers) {
            minStart = Math.min(minStart, h.startBlock);
            maxEnd = Math.max(maxEnd, h.endBlock);
        }

        // Try region: blocks in [minStart, maxEnd)
        const tryRegion = new Set<number>();
        for (let i = minStart; i < maxEnd; i++) {
            tryRegion.add(i);
        }

        // Handler entry blocks
        const handlerEntries = new Set(handlers.map(h => h.handlerBlock));

        // Find post-try join blocks: successors of try-region blocks
        // that are outside the try region and not handler entries.
        // These are where normal (non-exception) flow goes after the try body.
        const postTrySeeds = new Set<number>();
        for (const blockIdx of tryRegion) {
            const block = cfg.blocks[blockIdx];
            if (!block) continue;
            for (const succ of block.successors) {
                if (!tryRegion.has(succ) && !handlerEntries.has(succ)) {
                    postTrySeeds.add(succ);
                }
            }
        }

        // BFS to find all post-try blocks reachable from the seeds
        const postTryBlocks = new Set<number>();
        {
            const queue = [...postTrySeeds];
            while (queue.length > 0) {
                const n = queue.shift()!;
                if (postTryBlocks.has(n) || tryRegion.has(n) || handlerEntries.has(n)) continue;
                postTryBlocks.add(n);
                const block = cfg.blocks[n];
                if (!block) continue;
                for (const succ of block.successors) {
                    if (!postTryBlocks.has(succ)) queue.push(succ);
                }
            }
        }

        // Handler-exclusive blocks: reachable from handler entries,
        // excluding try-region and post-try blocks
        const handlerBlocks = new Set<number>();
        for (const h of handlers) {
            const stack = [h.handlerBlock];
            while (stack.length > 0) {
                const n = stack.pop()!;
                if (handlerBlocks.has(n) || tryRegion.has(n) || postTryBlocks.has(n)) continue;
                handlerBlocks.add(n);
                const block = cfg.blocks[n];
                if (!block) continue;
                for (const succ of block.successors) {
                    if (!handlerBlocks.has(succ)) stack.push(succ);
                }
            }
        }

        const out: JavaStmt[] = [];

        // Preamble: blocks before the try region
        for (let i = 0; i < minStart; i++) {
            if (handlerBlocks.has(i) || postTryBlocks.has(i)) continue;
            const block = cfg.blocks[i];
            if (!block) continue;
            out.push(...this.stmtListConverter.convert(
                this.filterTerminators(block.statements, postTryBlocks, handlerEntries),
                stmtCtx
            ));
        }

        // Try body: blocks in the try region, filtering goto terminators to post-try
        const tryBodyStmts: JavaStmt[] = [];
        for (let i = minStart; i < maxEnd; i++) {
            if (handlerBlocks.has(i)) continue;
            const block = cfg.blocks[i];
            if (!block) continue;
            tryBodyStmts.push(...this.stmtListConverter.convert(
                this.filterTerminators(block.statements, postTryBlocks, handlerEntries),
                stmtCtx
            ));
        }

        // Build catch clauses, bounded to handler-exclusive blocks
        const sortedGroups = Array.from(groups.entries()).sort(
            (a, b) => parseInt(a[0]) - parseInt(b[0])
        );

        const catches: JavaCatchClause[] = [];
        for (const [, group] of sortedGroups) {
            for (const h of group) {
                const exType = h.exceptionType
                    ? this.typeNameFormatter.formatInternalName(h.exceptionType, stmtCtx.exprContext.typeContext)
                    : 'Throwable';

                // Extract catch variable name from handler entry block.
                // The JVM pushes the exception onto the stack at handler entry, and the
                // bytecode stores it with `astore N`, which becomes a VarStoreStmt(PhiExpr).
                const { varName: catchVarName, skipStmtIndex } = this.extractCatchVariable(cfg, h.handlerBlock, stmtCtx);

                const catchBody: JavaStmt[] = [];
                this.collectHandlerStatements(cfg, h.handlerBlock, stmtCtx, catchBody, new Set(), handlerBlocks, postTryBlocks, skipStmtIndex);
                catches.push(new JavaCatchClause(exType, catchVarName, new JavaBlockStmt(catchBody)));
            }
        }

        const coalescedCatches = this.coalesceCatchClauses(catches);
        const tryCatch = new JavaTryCatchStmt(new JavaBlockStmt(tryBodyStmts), coalescedCatches);
        out.push(tryCatch);

        // Postamble: post-try blocks (in order)
        const sortedPostTry = [...postTryBlocks].sort((a, b) => a - b);
        for (const i of sortedPostTry) {
            const block = cfg.blocks[i];
            if (!block) continue;
            out.push(...this.stmtListConverter.convert(
                this.filterTerminators(block.statements, postTryBlocks, handlerEntries),
                stmtCtx
            ));
        }

        return new JavaBlockStmt(out);
    }

    /**
     * Filters out UnconditionalJumpStmt terminators that jump to post-try or handler blocks,
     * since these are now represented structurally by the try-catch.
     */
    private filterTerminators(
        statements: readonly Stmt[],
        postTryBlocks: ReadonlySet<number>,
        handlerEntries: ReadonlySet<number>
    ): Stmt[] {
        return statements.filter(s => {
            if (s instanceof UnconditionalJumpStmt) {
                // Suppress gotos to post-try join blocks (implicit after try-catch)
                if (postTryBlocks.has(s.target)) return false;
                // Suppress gotos to handler entries (shouldn't happen but be safe)
                if (handlerEntries.has(s.target)) return false;
            }
            return true;
        });
    }

    /**
     * Extracts the catch variable name from a handler entry block.
     * The JVM pushes the exception onto the stack at handler entry, and the bytecode
     * stores it with `astore N`. In the IR, this is a VarStoreStmt whose value is a
     * PhiExpr(exception). It may be preceded by LineNumberStmt or other debug stmts.
     *
     * Returns the variable name and the index of the exception store statement to skip.
     */
    private extractCatchVariable(
        cfg: ControlFlowGraph,
        handlerBlock: number,
        stmtCtx: IrStatementToJavaAstContext
    ): { varName: string; skipStmtIndex: number } {
        const block = cfg.blocks[handlerBlock];
        if (!block) {
            return { varName: 'e', skipStmtIndex: -1 };
        }

        for (let i = 0; i < block.statements.length; i++) {
            const s = block.statements[i]!;
            if (s instanceof VarStoreStmt && s.value instanceof PhiExpr && s.value.isExceptionPhi()) {
                const raw = stmtCtx.exprContext.resolveVariableName?.(s.index) ?? s.name ?? 'e';
                const varName = this.sanitizer.sanitize(raw);

                // Mark the catch variable as declared (the catch clause is its declaration)
                stmtCtx.declaredVariables?.add(s.index);

                return { varName, skipStmtIndex: i };
            }
        }

        return { varName: 'e', skipStmtIndex: -1 };
    }

    /**
     * Collects statements from a handler's block chain, bounded to handler-exclusive blocks.
     */
    private collectHandlerStatements(
        cfg: ControlFlowGraph,
        start: number,
        stmtCtx: IrStatementToJavaAstContext,
        out: JavaStmt[],
        visited: Set<number>,
        handlerBlocks: ReadonlySet<number>,
        postTryBlocks: ReadonlySet<number>,
        skipStmtIndex: number = -1
    ): void {
        const stack = [start];
        let isEntryBlock = true;
        while (stack.length > 0) {
            const n = stack.pop()!;
            if (visited.has(n)) continue;
            if (!handlerBlocks.has(n)) continue; // Only emit handler-exclusive blocks
            visited.add(n);
            const block = cfg.blocks[n];
            if (!block) continue;

            let stmts: Stmt[] = [...block.statements];
            // Remove the exception store from the handler entry block
            if (isEntryBlock && skipStmtIndex >= 0 && skipStmtIndex < stmts.length) {
                stmts.splice(skipStmtIndex, 1);
                isEntryBlock = false;
            }

            out.push(...this.stmtListConverter.convert(
                this.filterTerminators(stmts, postTryBlocks, new Set()),
                stmtCtx
            ));
            for (const succ of block.successors) {
                if (!visited.has(succ)) stack.push(succ);
            }
        }
    }

    /**
     * Post-processes a block to convert iterator while-loops into for-each loops.
     *
     * Detects the pattern:
     *   iter = collection.iterator();
     *   while (iter.hasNext()) { T x = (T) iter.next(); ... }
     * And converts to:
     *   for (T x : collection) { ... }
     */
    private transformForEachLoops(block: JavaBlockStmt): JavaBlockStmt {
        const stmts = block.statements;
        const result: JavaStmt[] = [];

        for (let i = 0; i < stmts.length; i++) {
            const stmt = stmts[i]!;

            // Recursively transform nested blocks
            if (stmt instanceof JavaBlockStmt) {
                result.push(this.transformForEachLoops(stmt));
                continue;
            }
            if (stmt instanceof JavaWhileStmt) {
                const transformedBody = this.transformForEachLoops(stmt.body);

                // Check if previous stmt is: iter = collection.iterator()
                const prev = result[result.length - 1];
                const forEach = this.tryMatchForEach(prev, stmt.condition, transformedBody);
                if (forEach) {
                    result.pop(); // Remove the iterator assignment
                    result.push(forEach);
                    continue;
                }

                result.push(new JavaWhileStmt(stmt.condition, transformedBody));
                continue;
            }

            result.push(stmt);
        }

        return new JavaBlockStmt(result);
    }

    /**
     * Tries to match the iterator for-each pattern:
     *   prev: `[Iterator] iter = collection.iterator();`
     *   condition: `iter.hasNext()`
     *   body first stmt: `T x = (T) iter.next();` or `T x = iter.next();`
     */
    private tryMatchForEach(
        prev: JavaStmt | undefined,
        condition: import('../../expr/JavaExpr').JavaExpr,
        body: JavaBlockStmt
    ): JavaForEachStmt | null {
        if (!prev) return null;

        // Previous statement must be: [Type] iterVar = collection.iterator()
        if (!(prev instanceof JavaAssignStmt)) return null;
        if (!(prev.target instanceof JavaIdentifierExpr)) return null;
        if (!(prev.value instanceof JavaMethodCallExpr)) return null;
        if (prev.value.methodName !== 'iterator' || prev.value.args.length !== 0) return null;

        const iterVarName = prev.target.name;
        const iterable = prev.value.target;

        // Condition must be: iterVar.hasNext()
        if (!(condition instanceof JavaMethodCallExpr)) return null;
        if (condition.methodName !== 'hasNext' || condition.args.length !== 0) return null;
        if (!(condition.target instanceof JavaIdentifierExpr)) return null;
        if (condition.target.name !== iterVarName) return null;

        // First statement in body must be: T x = (T) iterVar.next() or T x = iterVar.next()
        if (body.statements.length === 0) return null;
        const firstStmt = body.statements[0]!;
        if (!(firstStmt instanceof JavaAssignStmt)) return null;
        if (!firstStmt.typeName) return null; // Must be a declaration
        if (!(firstStmt.target instanceof JavaIdentifierExpr)) return null;

        // Check if RHS is iter.next() or (T) iter.next()
        let nextCall: JavaMethodCallExpr | null = null;
        if (firstStmt.value instanceof JavaMethodCallExpr) {
            nextCall = firstStmt.value;
        } else if (firstStmt.value instanceof JavaCastExpr && firstStmt.value.expression instanceof JavaMethodCallExpr) {
            nextCall = firstStmt.value.expression;
        }

        if (!nextCall) return null;
        if (nextCall.methodName !== 'next' || nextCall.args.length !== 0) return null;
        if (!(nextCall.target instanceof JavaIdentifierExpr)) return null;
        if (nextCall.target.name !== iterVarName) return null;

        // Match! Build for-each
        const varType = firstStmt.typeName;
        const varName = firstStmt.target.name;
        const remainingBody = new JavaBlockStmt(body.statements.slice(1));

        return new JavaForEachStmt(varType, varName, iterable, remainingBody);
    }

    /**
     * Coalesces adjacent catch clauses with identical bodies and variable names
     * into multi-catch syntax: `catch (A | B e) { ... }`
     */
    private coalesceCatchClauses(catches: JavaCatchClause[]): JavaCatchClause[] {
        if (catches.length <= 1) return catches;

        // Serialize each catch body to a string for comparison
        const bodyStrings = catches.map(c => {
            const writer = new JavaSourceWriter();
            const printer = new JavaAstPrinter(writer);
            printer.printBlock(c.body);
            return writer.toString();
        });

        const result: JavaCatchClause[] = [];
        let i = 0;
        while (i < catches.length) {
            let types = catches[i]!.exceptionTypeName;
            const varName = catches[i]!.exceptionVarName;
            const body = catches[i]!.body;
            const bodyStr = bodyStrings[i]!;

            // Merge subsequent catches with same body and var name
            let j = i + 1;
            while (j < catches.length && catches[j]!.exceptionVarName === varName && bodyStrings[j] === bodyStr) {
                types += ' | ' + catches[j]!.exceptionTypeName;
                j++;
            }

            result.push(new JavaCatchClause(types, varName, body));
            i = j;
        }

        return result;
    }
}

