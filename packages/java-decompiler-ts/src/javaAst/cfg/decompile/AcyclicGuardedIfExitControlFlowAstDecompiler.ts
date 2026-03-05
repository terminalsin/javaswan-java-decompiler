import type { BasicBlock, ControlFlowGraph } from '@blkswn/java-ir';
import { ConditionalJumpStmt, UnconditionalJumpStmt, ReturnStmt, ThrowStmt, SwitchStmt } from '@blkswn/java-ir';
import type { JavaExpr } from '../../expr/JavaExpr';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { JavaIfStmt } from '../../stmt/JavaIfStmt';
import { JavaThrowStmt } from '../../stmt/JavaThrowStmt';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';
import { IrConditionalJumpConditionConverter } from '../../ir/conditions/IrConditionalJumpConditionConverter';
import { JavaConditionNegator } from '../../ir/conditions/JavaConditionNegator';

/**
 * Decompiles simple acyclic control flow into "guard clause" style Java:
 *
 * - if (cond) { throw/return ... }  // then fallthrough continues
 * - chains of such guards
 * - final if/else where both branches return/throw
 *
 * This is intentionally conservative and only aims to avoid IR-listing fallbacks on
 * straightforward branching.
 */
export class AcyclicGuardedIfExitControlFlowAstDecompiler {
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();
    private readonly condConverter = new IrConditionalJumpConditionConverter();
    private readonly condNegator = new JavaConditionNegator();

    public tryDecompile(cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt | null {
        const visited = new Set<number>();
        const out: JavaStmt[] = [];

        let current = 0;
        while (true) {
            if (visited.has(current)) {
                return null;
            }
            visited.add(current);

            const block = cfg.blocks[current];
            if (!block) return null;

            const term = this.getControlFlowTerminator(block);

            // Most blocks: emit statements excluding terminator (handled below)
            const nonTerminatorStatements = this.excludeTerminator(block);
            out.push(...this.stmtListConverter.convert(nonTerminatorStatements, stmtCtx));

            if (term === null) {
                if (block.successors.size === 1) {
                    const [next] = block.successors;
                    if (next === undefined) return new JavaBlockStmt(out);
                    current = next;
                    continue;
                }
                return new JavaBlockStmt(out);
            }

            if (term instanceof UnconditionalJumpStmt) {
                current = term.target;
                continue;
            }

            if (term instanceof ReturnStmt || term instanceof ThrowStmt) {
                out.push(...this.stmtListConverter.convert([term], stmtCtx));
                return new JavaBlockStmt(out);
            }

            if (term instanceof SwitchStmt) {
                return null;
            }

            if (term instanceof ConditionalJumpStmt) {
                // Pattern: simple diamond where one side is a side-effect-only branch that rejoins at the other target.
                // This yields `if (cond) { ... }` with a join continuation.
                const rawCondition = this.condConverter.convert(term, stmtCtx.exprContext);

                // Speculative branch-building may process VarStoreStmts and pollute
                // declaredVariables. Save/restore around attempts that may fail.
                const saveDeclaredVars = (): Set<number> | null =>
                    stmtCtx.declaredVariables ? new Set(stmtCtx.declaredVariables) : null;
                const restoreDeclaredVars = (snapshot: Set<number> | null): void => {
                    if (snapshot && stmtCtx.declaredVariables) {
                        stmtCtx.declaredVariables.clear();
                        for (const v of snapshot) stmtCtx.declaredVariables.add(v);
                    }
                };

                // Join at trueTarget (condition true skips side-effect; false executes it then joins)
                let snapshot = saveDeclaredVars();
                const joinAtTrue = this.tryBuildBranchToJoin(cfg, term.falseTarget, term.trueTarget, stmtCtx);
                if (joinAtTrue) {
                    const ifCondition = this.condNegator.negate(rawCondition);
                    out.push(new JavaIfStmt(ifCondition, joinAtTrue.body, null));
                    for (const b of joinAtTrue.visitedBlocks) visited.add(b);
                    current = term.trueTarget;
                    continue;
                }
                restoreDeclaredVars(snapshot);

                // Join at falseTarget (condition true executes side-effect then joins; false skips)
                snapshot = saveDeclaredVars();
                const joinAtFalse = this.tryBuildBranchToJoin(cfg, term.trueTarget, term.falseTarget, stmtCtx);
                if (joinAtFalse) {
                    const ifCondition = rawCondition;
                    out.push(new JavaIfStmt(ifCondition, joinAtFalse.body, null));
                    for (const b of joinAtFalse.visitedBlocks) visited.add(b);
                    current = term.falseTarget;
                    continue;
                }
                restoreDeclaredVars(snapshot);

                snapshot = saveDeclaredVars();
                const trueExit = this.tryBuildExitBranch(cfg, term.trueTarget, stmtCtx);
                if (!trueExit) restoreDeclaredVars(snapshot);

                const snapshotAfterTrue = saveDeclaredVars();
                const falseExit = this.tryBuildExitBranch(cfg, term.falseTarget, stmtCtx);
                if (!falseExit) restoreDeclaredVars(snapshotAfterTrue);

                if (trueExit && falseExit) {
                    const rewritten = this.tryRewriteTwoExitBranchesToGuard(rawCondition, trueExit, falseExit);
                    if (rewritten) {
                        out.push(rewritten.ifStmt);
                        out.push(...rewritten.fallthrough);
                        return new JavaBlockStmt(out);
                    }

                    out.push(new JavaIfStmt(rawCondition, trueExit, falseExit));
                    return new JavaBlockStmt(out);
                }

                if (trueExit || falseExit) {
                    // Restore to before both exit attempts so the continuation
                    // path gets clean declaredVariables state for type declarations.
                    restoreDeclaredVars(snapshot);

                    const exitIsTrue = Boolean(trueExit);
                    const exitBranch = trueExit ?? falseExit!;
                    const continueTarget = exitIsTrue ? term.falseTarget : term.trueTarget;

                    const exitCondition = exitIsTrue ? rawCondition : this.condNegator.negate(rawCondition);

                    out.push(new JavaIfStmt(exitCondition, exitBranch, null));

                    current = continueTarget;
                    continue;
                }

                return null;
            }

            return null;
        }
    }

    private tryBuildExitBranch(
        cfg: ControlFlowGraph,
        startBlockIndex: number,
        stmtCtx: IrStatementToJavaAstContext
    ): JavaBlockStmt | null {
        const visited = new Set<number>();
        const out: JavaStmt[] = [];

        let current = startBlockIndex;
        while (true) {
            if (visited.has(current)) return null;
            visited.add(current);

            const block = cfg.blocks[current];
            if (!block) return null;

            const term = this.getControlFlowTerminator(block);
            if (term instanceof ConditionalJumpStmt || term instanceof SwitchStmt) {
                return null;
            }

            if (term instanceof ReturnStmt || term instanceof ThrowStmt) {
                const all = block.statements;
                out.push(...this.stmtListConverter.convert(all, stmtCtx));
                return new JavaBlockStmt(out);
            }

            if (term instanceof UnconditionalJumpStmt) {
                const nonTerm = this.excludeTerminator(block);
                out.push(...this.stmtListConverter.convert(nonTerm, stmtCtx));
                current = term.target;
                continue;
            }

            // No explicit terminator: follow single successor
            out.push(...this.stmtListConverter.convert(block.statements, stmtCtx));
            if (block.successors.size !== 1) return null;
            const [next] = block.successors;
            if (next === undefined) return null;
            current = next;
        }
    }

    private tryRewriteTwoExitBranchesToGuard(
        condition: JavaExpr,
        trueExit: JavaBlockStmt,
        falseExit: JavaBlockStmt
    ): { ifStmt: JavaIfStmt; fallthrough: JavaStmt[] } | null {
        // Prefer `if (cond) throw ...; <rest>` over `if/else` when possible.
        const trueEndsWithThrow = this.endsWithThrow(trueExit);
        const falseEndsWithThrow = this.endsWithThrow(falseExit);

        // Only rewrite if it looks like a "guard + rest" (i.e., one branch is a throw).
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

    private tryBuildBranchToJoin(
        cfg: ControlFlowGraph,
        startBlockIndex: number,
        joinBlockIndex: number,
        stmtCtx: IrStatementToJavaAstContext
    ): { body: JavaBlockStmt; visitedBlocks: number[] } | null {
        const visited = new Set<number>();
        const visitedBlocks: number[] = [];
        const out: JavaStmt[] = [];

        let current = startBlockIndex;
        while (true) {
            if (current === joinBlockIndex) {
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

            // Emit block statements excluding a control-flow terminator.
            out.push(...this.stmtListConverter.convert(this.excludeTerminator(block), stmtCtx));

            if (term instanceof UnconditionalJumpStmt) {
                current = term.target;
                continue;
            }

            // No explicit terminator: allow fallthrough to join.
            if (block.successors.size !== 1) return null;
            const [next] = block.successors;
            if (next === undefined) return null;
            current = next;
        }
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

