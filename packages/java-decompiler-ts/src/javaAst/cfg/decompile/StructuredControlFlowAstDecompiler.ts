import type { BasicBlock, ControlFlowGraph, MethodIR } from '@blkswn/java-ir';
import { ConditionalJumpStmt, LineNumberStmt, ReturnStmt, SwitchStmt, ThrowStmt, UnconditionalJumpStmt } from '@blkswn/java-ir';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import { JavaBreakStmt } from '../../stmt/JavaBreakStmt';
import { JavaCommentStmt } from '../../stmt/JavaCommentStmt';
import { JavaIfStmt } from '../../stmt/JavaIfStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { JavaThrowStmt } from '../../stmt/JavaThrowStmt';
import { JavaWhileStmt } from '../../stmt/JavaWhileStmt';
import { JavaBinaryExpr } from '../../expr/JavaBinaryExpr';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';
import { ControlFlowGraphNaturalLoopDetector } from '../analysis/ControlFlowGraphNaturalLoopDetector';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';
import { IrConditionalJumpConditionConverter } from '../../ir/conditions/IrConditionalJumpConditionConverter';
import { JavaConditionNegator } from '../../ir/conditions/JavaConditionNegator';
import type { JavaExpr } from '../../expr/JavaExpr';

interface LoopInfo {
    readonly header: number;
    readonly nodes: ReadonlySet<number>;
}

interface DecompileSequenceResult {
    readonly statements: JavaStmt[];
    readonly endBlock: number; // either a stopAt block, or a terminal block index
    readonly endedBecauseReachedStop: boolean;
}

/**
 * Attempts to structure a CFG into a sequence of Java statements by composing:
 * - natural `while` loops (multiple per method)
 * - guarded ifs (`if (cond) throw/return`)
 * - join-style ifs (`if (cond) { side effects }` then continue)
 *
 * This is intentionally conservative: if any control flow pattern can't be structured safely,
 * it returns null so the caller can fall back (e.g., to a label dispatcher).
 */
export class StructuredControlFlowAstDecompiler {
    private readonly loopDetector = new ControlFlowGraphNaturalLoopDetector();
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();
    private readonly condConverter = new IrConditionalJumpConditionConverter();
    private readonly condNegator = new JavaConditionNegator();

    private snapshotDeclaredVars(ctx: IrStatementToJavaAstContext): Set<number> | null {
        return ctx.declaredVariables ? new Set(ctx.declaredVariables) : null;
    }

    private restoreDeclaredVars(ctx: IrStatementToJavaAstContext, snapshot: Set<number> | null): void {
        if (snapshot && ctx.declaredVariables) {
            ctx.declaredVariables.clear();
            for (const v of snapshot) ctx.declaredVariables.add(v);
        }
    }

    public tryDecompile(method: MethodIR, cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt | null {
        // Try/catch structuring is not implemented in this structurer yet.
        if (cfg.exceptionHandlers.length > 0) {
            return null;
        }

        const loopsByHeader = this.detectLoopsByHeader(cfg);
        const visited = new Set<number>();

        const result = this.decompileSequence(cfg, stmtCtx, /* start */ 0, /* stopAt */ new Set(), /* allowed */ null, loopsByHeader, visited);
        if (!result) return null;

        // Ensure we didn't silently drop reachable blocks.
        const reachable = this.computeReachableBlocks(cfg);
        for (const b of reachable) {
            if (!visited.has(b)) {
                return null;
            }
        }

        return new JavaBlockStmt(result.statements);
    }

    private detectLoopsByHeader(cfg: ControlFlowGraph): Map<number, LoopInfo> {
        const loops = this.loopDetector.detect(cfg);
        const byHeader = new Map<number, LoopInfo>();
        for (const loop of loops) {
            const headerBlock = cfg.blocks[loop.header];
            if (!headerBlock) continue;
            const term = this.getControlFlowTerminator(headerBlock);
            if (!(term instanceof ConditionalJumpStmt)) continue;

            const trueInLoop = loop.nodes.has(term.trueTarget);
            const falseInLoop = loop.nodes.has(term.falseTarget);
            if (trueInLoop === falseInLoop) continue;

            byHeader.set(loop.header, { header: loop.header, nodes: loop.nodes });
        }
        return byHeader;
    }

    private decompileSequence(
        cfg: ControlFlowGraph,
        stmtCtx: IrStatementToJavaAstContext,
        startBlock: number,
        stopAt: ReadonlySet<number>,
        allowedRegion: ReadonlySet<number> | null,
        loopsByHeader: ReadonlyMap<number, LoopInfo>,
        visited: Set<number>
    ): DecompileSequenceResult | null {
        const out: JavaStmt[] = [];

        let current = startBlock;
        while (true) {
            if (stopAt.has(current)) {
                return { statements: out, endBlock: current, endedBecauseReachedStop: true };
            }

            if (allowedRegion && !allowedRegion.has(current)) {
                return null;
            }

            if (visited.has(current)) {
                return null;
            }

            // Loop header handling: recognize loops even inside loop bodies (nested loops),
            // but only if the inner loop's nodes are entirely within the allowed region.
            let loopInfo = loopsByHeader.get(current) ?? null;
            if (loopInfo && allowedRegion) {
                const allInRegion = [...loopInfo.nodes].every(n => allowedRegion.has(n));
                if (!allInRegion) loopInfo = null;
            }
            if (loopInfo) {
                const loop = this.tryDecompileWhileLoop(cfg, stmtCtx, loopInfo, loopsByHeader, visited);
                if (!loop) return null;
                out.push(loop.loopStmt);
                current = loop.exitTarget;
                continue;
            }

            const block = cfg.blocks[current];
            if (!block) return null;

            const term = this.getControlFlowTerminator(block);
            const nonTerminator = this.excludeTerminator(block);
            out.push(...this.stmtListConverter.convert(nonTerminator, stmtCtx));

            visited.add(current);

            if (term === null) {
                if (block.successors.size !== 1) {
                    return { statements: out, endBlock: current, endedBecauseReachedStop: false };
                }
                const [next] = block.successors;
                if (next === undefined) return null;
                current = next;
                continue;
            }

            if (term instanceof UnconditionalJumpStmt) {
                current = term.target;
                continue;
            }

            if (term instanceof ReturnStmt || term instanceof ThrowStmt) {
                out.push(...this.stmtListConverter.convert([term], stmtCtx));
                return { statements: out, endBlock: current, endedBecauseReachedStop: false };
            }

            if (term instanceof SwitchStmt) {
                return null;
            }

            if (term instanceof ConditionalJumpStmt) {
                // Try to fold short-circuit boolean patterns (|| / &&) before normal handling.
                const folded = this.tryFoldShortCircuitCondition(cfg, stmtCtx, block, term, visited, allowedRegion);

                let cond: JavaExpr;
                let trueTarget: number;
                let falseTarget: number;

                if (folded) {
                    cond = folded.condition;
                    trueTarget = folded.trueTarget;
                    falseTarget = folded.falseTarget;
                    out.push(...folded.extraStmts);
                    for (const b of folded.consumedBlocks) visited.add(b);
                } else {
                    cond = this.condConverter.convert(term, stmtCtx.exprContext);
                    trueTarget = term.trueTarget;
                    falseTarget = term.falseTarget;
                }

                // Snapshot declaredVariables before speculative branch attempts.
                // Failed attempts should not leave behind variable declarations.
                const declSnapshot = this.snapshotDeclaredVars(stmtCtx);

                // 1) Join-style if: one branch is a side-effect-only chain that rejoins at the other target.
                const joinAtTrue = this.tryBuildBranchToJoin(cfg, falseTarget, trueTarget, stmtCtx, visited);
                if (joinAtTrue) {
                    out.push(new JavaIfStmt(this.condNegator.negate(cond), joinAtTrue.body, null));
                    current = trueTarget;
                    continue;
                }
                this.restoreDeclaredVars(stmtCtx, declSnapshot);

                const joinAtFalse = this.tryBuildBranchToJoin(cfg, trueTarget, falseTarget, stmtCtx, visited);
                if (joinAtFalse) {
                    out.push(new JavaIfStmt(cond, joinAtFalse.body, null));
                    current = falseTarget;
                    continue;
                }
                this.restoreDeclaredVars(stmtCtx, declSnapshot);

                // 2) Guard exit: one branch terminates (return/throw), the other continues.
                // Try each branch independently with snapshot/restore.
                const trueExitSnapshot = this.snapshotDeclaredVars(stmtCtx);
                const trueExit = this.tryBuildExitBranch(cfg, trueTarget, stmtCtx, visited);
                const declAfterTrueExit = this.snapshotDeclaredVars(stmtCtx);
                this.restoreDeclaredVars(stmtCtx, trueExitSnapshot);

                const falseExit = this.tryBuildExitBranch(cfg, falseTarget, stmtCtx, visited);
                const declAfterFalseExit = this.snapshotDeclaredVars(stmtCtx);
                this.restoreDeclaredVars(stmtCtx, trueExitSnapshot);

                if (trueExit && !falseExit) {
                    // Accept trueExit's declarations only
                    this.restoreDeclaredVars(stmtCtx, declAfterTrueExit);
                    out.push(new JavaIfStmt(cond, trueExit.body, null));
                    current = falseTarget;
                    continue;
                }
                if (falseExit && !trueExit) {
                    // Accept falseExit's declarations only
                    this.restoreDeclaredVars(stmtCtx, declAfterFalseExit);
                    out.push(new JavaIfStmt(this.condNegator.negate(cond), falseExit.body, null));
                    current = trueTarget;
                    continue;
                }

                // 3) If/else where both branches terminate.
                if (trueExit && falseExit) {
                    // Accept both branches' declarations
                    if (declAfterTrueExit && stmtCtx.declaredVariables) {
                        for (const v of declAfterTrueExit) stmtCtx.declaredVariables.add(v);
                        for (const v of declAfterFalseExit!) stmtCtx.declaredVariables.add(v);
                    }

                    const rewritten = this.tryRewriteTwoExitBranchesToGuard(cond, trueExit.body, falseExit.body);
                    if (rewritten) {
                        out.push(rewritten.ifStmt);
                        out.push(...rewritten.fallthrough);
                        return { statements: out, endBlock: current, endedBecauseReachedStop: false };
                    }

                    out.push(new JavaIfStmt(cond, trueExit.body, falseExit.body));
                    return { statements: out, endBlock: current, endedBecauseReachedStop: false };
                }

                // 4) If/else with common join point: both branches converge at a common successor.
                const ifElseResult = this.tryBuildIfElseWithJoinFromTargets(cfg, stmtCtx, cond, trueTarget, falseTarget, stopAt, allowedRegion, loopsByHeader, visited);
                if (ifElseResult) {
                    out.push(ifElseResult.ifStmt);
                    current = ifElseResult.joinBlock;
                    continue;
                }
                this.restoreDeclaredVars(stmtCtx, declSnapshot);

                return null;
            }

            return null;
        }
    }

    private tryRewriteTwoExitBranchesToGuard(
        condition: JavaExpr,
        trueExit: JavaBlockStmt,
        falseExit: JavaBlockStmt
    ): { ifStmt: JavaIfStmt; fallthrough: JavaStmt[] } | null {
        const trueEndsWithThrow = this.endsWithThrow(trueExit);
        const falseEndsWithThrow = this.endsWithThrow(falseExit);
        if (trueEndsWithThrow === falseEndsWithThrow) return null;

        const guardIsTrue = trueEndsWithThrow;
        const guardCondition = guardIsTrue ? condition : this.condNegator.negate(condition);
        const guardBody = guardIsTrue ? trueExit : falseExit;
        const fallthroughBody = guardIsTrue ? falseExit : trueExit;

        return {
            ifStmt: new JavaIfStmt(guardCondition, guardBody, null),
            fallthrough: fallthroughBody.statements,
        };
    }

    private endsWithThrow(block: JavaBlockStmt): boolean {
        const last = block.statements[block.statements.length - 1];
        return last instanceof JavaThrowStmt;
    }

    private tryDecompileWhileLoop(
        cfg: ControlFlowGraph,
        stmtCtx: IrStatementToJavaAstContext,
        loop: LoopInfo,
        loopsByHeader: ReadonlyMap<number, LoopInfo>,
        visited: Set<number>
    ): { loopStmt: JavaWhileStmt; exitTarget: number } | null {
        const header = cfg.blocks[loop.header];
        if (!header) return null;

        const term = this.getControlFlowTerminator(header);
        if (!(term instanceof ConditionalJumpStmt)) return null;

        const trueInLoop = loop.nodes.has(term.trueTarget);
        const falseInLoop = loop.nodes.has(term.falseTarget);
        if (trueInLoop === falseInLoop) return null;

        const bodyEntry = trueInLoop ? term.trueTarget : term.falseTarget;
        const exitTarget = trueInLoop ? term.falseTarget : term.trueTarget;

        // Mark header visited (so we don't re-enter it while building the body).
        visited.add(loop.header);

        const headerStmts = this.stmtListConverter.convert(this.excludeTerminator(header), stmtCtx);
        const hasSemanticHeaderStatements = headerStmts.some(s => !(s instanceof JavaCommentStmt));

        const rawCond = this.condConverter.convert(term, stmtCtx.exprContext);
        const stayCond = trueInLoop ? rawCond : this.condNegator.negate(rawCond);

        // Decompile body as a sequence that must flow back to the header.
        const stopAt = new Set<number>([loop.header]);
        const bodyResult = this.decompileSequence(cfg, stmtCtx, bodyEntry, stopAt, loop.nodes, loopsByHeader, visited);
        if (!bodyResult || !bodyResult.endedBecauseReachedStop) return null;

        const bodyStatements: JavaStmt[] = [];
        bodyStatements.push(...headerStmts);

        if (hasSemanticHeaderStatements) {
            // Convert to:
            // while (true) { <headerStmts>; if (!stayCond) break; <body> }
            bodyStatements.push(new JavaIfStmt(this.condNegator.negate(stayCond), new JavaBlockStmt([new JavaBreakStmt()]), null));
            bodyStatements.push(...bodyResult.statements);
            return {
                loopStmt: new JavaWhileStmt(new JavaLiteralExpr('true'), new JavaBlockStmt(bodyStatements)),
                exitTarget,
            };
        }

        bodyStatements.push(...bodyResult.statements);
        return { loopStmt: new JavaWhileStmt(stayCond, new JavaBlockStmt(bodyStatements)), exitTarget };
    }

    private tryBuildExitBranch(
        cfg: ControlFlowGraph,
        startBlockIndex: number,
        stmtCtx: IrStatementToJavaAstContext,
        visitedGlobal: Set<number>
    ): { body: JavaBlockStmt; visitedBlocks: number[] } | null {
        const visited = new Set<number>();
        const visitedBlocks: number[] = [];
        const out: JavaStmt[] = [];

        let current = startBlockIndex;
        while (true) {
            if (visited.has(current)) return null;
            visited.add(current);
            visitedBlocks.push(current);

            const block = cfg.blocks[current];
            if (!block) return null;

            const term = this.getControlFlowTerminator(block);
            if (term instanceof ConditionalJumpStmt || term instanceof SwitchStmt) return null;

            if (term instanceof ReturnStmt || term instanceof ThrowStmt) {
                out.push(...this.stmtListConverter.convert(block.statements, stmtCtx));
                for (const b of visitedBlocks) visitedGlobal.add(b);
                return { body: new JavaBlockStmt(out), visitedBlocks };
            }

            if (term instanceof UnconditionalJumpStmt) {
                out.push(...this.stmtListConverter.convert(this.excludeTerminator(block), stmtCtx));
                current = term.target;
                continue;
            }

            // No explicit terminator: follow single successor.
            out.push(...this.stmtListConverter.convert(block.statements, stmtCtx));
            if (block.successors.size !== 1) return null;
            const [next] = block.successors;
            if (next === undefined) return null;
            current = next;
        }
    }

    private tryBuildBranchToJoin(
        cfg: ControlFlowGraph,
        startBlockIndex: number,
        joinBlockIndex: number,
        stmtCtx: IrStatementToJavaAstContext,
        visitedGlobal: Set<number>
    ): { body: JavaBlockStmt; visitedBlocks: number[] } | null {
        const visited = new Set<number>();
        const visitedBlocks: number[] = [];
        const out: JavaStmt[] = [];

        let current = startBlockIndex;
        while (true) {
            if (current === joinBlockIndex) {
                for (const b of visitedBlocks) visitedGlobal.add(b);
                return { body: new JavaBlockStmt(out), visitedBlocks };
            }

            if (visited.has(current)) return null;
            visited.add(current);
            visitedBlocks.push(current);

            const block = cfg.blocks[current];
            if (!block) return null;

            const term = this.getControlFlowTerminator(block);
            if (term instanceof ConditionalJumpStmt || term instanceof SwitchStmt) return null;
            if (term instanceof ReturnStmt || term instanceof ThrowStmt) return null;

            out.push(...this.stmtListConverter.convert(this.excludeTerminator(block), stmtCtx));

            if (term instanceof UnconditionalJumpStmt) {
                current = term.target;
                continue;
            }

            if (block.successors.size !== 1) return null;
            const [next] = block.successors;
            if (next === undefined) return null;
            current = next;
        }
    }

    /**
     * Attempts to build an if-else structure where both branches converge at a common join point.
     * This handles patterns like: if (cond) { A } else { B } rest
     */
    private tryBuildIfElseWithJoinFromTargets(
        cfg: ControlFlowGraph,
        stmtCtx: IrStatementToJavaAstContext,
        cond: JavaExpr,
        trueTarget: number,
        falseTarget: number,
        stopAt: ReadonlySet<number>,
        allowedRegion: ReadonlySet<number> | null,
        loopsByHeader: ReadonlyMap<number, LoopInfo>,
        visited: Set<number>
    ): { ifStmt: JavaIfStmt; joinBlock: number } | null {
        // Find the immediate post-dominator (common join point) of the two branches.
        // We use a simple heuristic: collect all reachable blocks from each branch,
        // and find the first block reachable from both.
        const trueReachable = this.collectLinearReachable(cfg, trueTarget, visited);
        const falseReachable = this.collectLinearReachable(cfg, falseTarget, visited);

        // Find common blocks
        let joinBlock: number | null = null;
        for (const b of trueReachable) {
            if (falseReachable.has(b)) {
                joinBlock = b;
                break;
            }
        }
        if (joinBlock === null) return null;

        // Build both branches as sequences that stop at the join block
        const trueStopAt = new Set([...stopAt, joinBlock]);
        const falseStopAt = new Set([...stopAt, joinBlock]);

        const savedVisited = new Set(visited);
        const savedDecl = this.snapshotDeclaredVars(stmtCtx);

        const trueResult = this.decompileSequence(cfg, stmtCtx, trueTarget, trueStopAt, allowedRegion, loopsByHeader, visited);
        if (!trueResult || !trueResult.endedBecauseReachedStop || trueResult.endBlock !== joinBlock) {
            // Rollback visited and declaredVariables
            for (const b of visited) {
                if (!savedVisited.has(b)) visited.delete(b);
            }
            this.restoreDeclaredVars(stmtCtx, savedDecl);
            return null;
        }

        const falseResult = this.decompileSequence(cfg, stmtCtx, falseTarget, falseStopAt, allowedRegion, loopsByHeader, visited);
        if (!falseResult || !falseResult.endedBecauseReachedStop || falseResult.endBlock !== joinBlock) {
            // Rollback visited and declaredVariables
            for (const b of visited) {
                if (!savedVisited.has(b)) visited.delete(b);
            }
            this.restoreDeclaredVars(stmtCtx, savedDecl);
            return null;
        }

        const trueBody = new JavaBlockStmt(trueResult.statements);
        const falseBody = falseResult.statements.length > 0 ? new JavaBlockStmt(falseResult.statements) : null;

        return { ifStmt: new JavaIfStmt(cond, trueBody, falseBody), joinBlock };
    }

    /**
     * Collects blocks reachable from a start point, following linear paths and conditionals.
     */
    private collectLinearReachable(cfg: ControlFlowGraph, start: number, alreadyVisited: ReadonlySet<number>): Set<number> {
        const reachable = new Set<number>();
        const stack: number[] = [start];

        while (stack.length > 0) {
            const n = stack.pop()!;
            if (reachable.has(n)) continue;
            reachable.add(n);

            const block = cfg.blocks[n];
            if (!block) continue;
            for (const succ of block.successors) {
                if (!alreadyVisited.has(succ)) {
                    stack.push(succ);
                }
            }
        }

        return reachable;
    }

    private computeReachableBlocks(cfg: ControlFlowGraph): Set<number> {
        const reachable = new Set<number>();
        const stack: number[] = [0];

        while (stack.length > 0) {
            const n = stack.pop()!;
            if (reachable.has(n)) continue;
            reachable.add(n);

            const block = cfg.blocks[n];
            if (!block) continue;

            // Don't follow successors from blocks that terminate execution (return/throw).
            // The CFG may have fallthrough edges from these blocks to dead code.
            const term = this.getControlFlowTerminator(block);
            if (term instanceof ReturnStmt || term instanceof ThrowStmt) continue;

            for (const succ of block.successors) {
                stack.push(succ);
            }
        }

        return reachable;
    }

    /**
     * Folds short-circuit boolean patterns (|| and &&) into compound conditions.
     *
     * OR:  block: if (A) → X else → Y;  Y: if (B) → X else → Z  ⟹  if (A || B) → X else → Z
     * AND: block: if (A) → Y else → Z;  Y: if (B) → X else → Z  ⟹  if (A && B) → X else → Z
     */
    private tryFoldShortCircuitCondition(
        cfg: ControlFlowGraph,
        stmtCtx: IrStatementToJavaAstContext,
        currentBlock: BasicBlock,
        term: ConditionalJumpStmt,
        visited: ReadonlySet<number>,
        allowedRegion: ReadonlySet<number> | null,
    ): { condition: JavaExpr; trueTarget: number; falseTarget: number; consumedBlocks: number[]; extraStmts: JavaStmt[] } | null {
        const consumed: number[] = [];
        const extraStmts: JavaStmt[] = [];
        let currentTrue = term.trueTarget;
        let currentFalse = term.falseTarget;
        let condition = this.condConverter.convert(term, stmtCtx.exprContext);

        // Use line numbers to avoid folding conditions from different source lines.
        // `if (a && b)` on one line compiles identically to `if (a) { if (b) { ... } }` on
        // two lines. Line numbers are the only way to tell them apart.
        const originLine = this.getBlockLineNumber(currentBlock);

        let changed = true;
        while (changed) {
            changed = false;

            // OR: false branch is a side-effect-free conditional whose true target matches ours
            const falseBlock = cfg.blocks[currentFalse];
            if (falseBlock && !visited.has(currentFalse) && this.isBlockSideEffectFreeExcludingTerminator(falseBlock)) {
                // Only fold if the candidate is on the same source line (or line info is unavailable)
                const candidateLine = this.getBlockLineNumber(falseBlock);
                if (originLine !== null && candidateLine !== null && candidateLine !== originLine) {
                    // Different source line — don't fold
                } else {
                    const falseTerm = this.getControlFlowTerminator(falseBlock);
                    if (falseTerm instanceof ConditionalJumpStmt) {
                        if ((!allowedRegion || allowedRegion.has(currentFalse))) {
                            if (falseTerm.trueTarget === currentTrue) {
                                // if (A) → X else → Y; Y: if (B) → X else → Z  ⟹  if (A || B) → X else → Z
                                const condB = this.condConverter.convert(falseTerm, stmtCtx.exprContext);
                                extraStmts.push(...this.stmtListConverter.convert(this.excludeTerminator(falseBlock), stmtCtx));
                                condition = new JavaBinaryExpr(condition, '||', condB);
                                consumed.push(currentFalse);
                                currentFalse = falseTerm.falseTarget;
                                changed = true;
                                continue;
                            }
                            if (falseTerm.falseTarget === currentTrue) {
                                // if (A) → X else → Y; Y: if (B) → Z else → X  ⟹  if (A || !B) → X else → Z
                                const condB = this.condConverter.convert(falseTerm, stmtCtx.exprContext);
                                extraStmts.push(...this.stmtListConverter.convert(this.excludeTerminator(falseBlock), stmtCtx));
                                condition = new JavaBinaryExpr(condition, '||', this.condNegator.negate(condB));
                                consumed.push(currentFalse);
                                currentFalse = falseTerm.trueTarget;
                                changed = true;
                                continue;
                            }
                        }
                    }
                }
            }

            // AND: true branch is a side-effect-free conditional whose false target matches ours
            const trueBlock = cfg.blocks[currentTrue];
            if (trueBlock && !visited.has(currentTrue) && this.isBlockSideEffectFreeExcludingTerminator(trueBlock)) {
                // Only fold if the candidate is on the same source line (or line info is unavailable)
                const candidateLine = this.getBlockLineNumber(trueBlock);
                if (originLine !== null && candidateLine !== null && candidateLine !== originLine) {
                    // Different source line — don't fold
                } else {
                    const trueTerm = this.getControlFlowTerminator(trueBlock);
                    if (trueTerm instanceof ConditionalJumpStmt) {
                        if ((!allowedRegion || allowedRegion.has(currentTrue))) {
                            if (trueTerm.falseTarget === currentFalse) {
                                // if (A) → Y else → Z; Y: if (B) → X else → Z  ⟹  if (A && B) → X else → Z
                                const condB = this.condConverter.convert(trueTerm, stmtCtx.exprContext);
                                extraStmts.push(...this.stmtListConverter.convert(this.excludeTerminator(trueBlock), stmtCtx));
                                condition = new JavaBinaryExpr(condition, '&&', condB);
                                consumed.push(currentTrue);
                                currentTrue = trueTerm.trueTarget;
                                changed = true;
                                continue;
                            }
                            if (trueTerm.trueTarget === currentFalse) {
                                // if (A) → Y else → Z; Y: if (B) → Z else → X  ⟹  if (A && !B) → X else → Z
                                const condB = this.condConverter.convert(trueTerm, stmtCtx.exprContext);
                                extraStmts.push(...this.stmtListConverter.convert(this.excludeTerminator(trueBlock), stmtCtx));
                                condition = new JavaBinaryExpr(condition, '&&', this.condNegator.negate(condB));
                                consumed.push(currentTrue);
                                currentTrue = trueTerm.falseTarget;
                                changed = true;
                                continue;
                            }
                        }
                    }
                }
            }
        }

        if (consumed.length === 0) return null;
        return { condition, trueTarget: currentTrue, falseTarget: currentFalse, consumedBlocks: consumed, extraStmts };
    }

    /**
     * Extracts the source line number from a basic block by finding the last
     * LineNumberStmt before the terminator. Returns null if no line info is present.
     */
    private getBlockLineNumber(block: BasicBlock): number | null {
        const stmts = this.excludeTerminator(block);
        for (let i = stmts.length - 1; i >= 0; i--) {
            if (stmts[i] instanceof LineNumberStmt) {
                return (stmts[i] as LineNumberStmt).line;
            }
        }
        return null;
    }

    /**
     * Returns true if all non-terminator statements in the block are side-effect-free
     * (no expressions, just metadata like LineNumberStmt or FrameStmt).
     */
    private isBlockSideEffectFreeExcludingTerminator(block: BasicBlock): boolean {
        const nonTerm = this.excludeTerminator(block);
        return nonTerm.every(s => s.getExpressions().length === 0);
    }

    private excludeTerminator(block: BasicBlock): readonly import('@blkswn/java-ir').Stmt[] {
        const term = this.getControlFlowTerminator(block);
        if (!term) return block.statements;
        return block.statements.slice(0, Math.max(0, block.statements.length - 1));
    }

    private getControlFlowTerminator(
        block: BasicBlock
    ): ConditionalJumpStmt | UnconditionalJumpStmt | SwitchStmt | ReturnStmt | ThrowStmt | null {
        const last = block.statements[block.statements.length - 1];
        if (!last) return null;
        if (last instanceof ConditionalJumpStmt ||
            last instanceof UnconditionalJumpStmt ||
            last instanceof SwitchStmt ||
            last instanceof ReturnStmt ||
            last instanceof ThrowStmt) {
            return last;
        }
        return null;
    }
}

