import type { BasicBlock, ControlFlowGraph, Stmt } from '@blkswn/java-ir';
import {
    ConditionalJumpStmt,
    UnconditionalJumpStmt,
    SwitchStmt,
    ReturnStmt,
    ThrowStmt,
} from '@blkswn/java-ir';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { JavaBreakStmt } from '../../stmt/JavaBreakStmt';
import { JavaCommentStmt } from '../../stmt/JavaCommentStmt';
import { JavaIfStmt } from '../../stmt/JavaIfStmt';
import { JavaWhileStmt } from '../../stmt/JavaWhileStmt';
import { ControlFlowGraphNaturalLoopDetector } from '../analysis/ControlFlowGraphNaturalLoopDetector';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';
import { IrConditionalJumpConditionConverter } from '../../ir/conditions/IrConditionalJumpConditionConverter';
import { JavaConditionNegator } from '../../ir/conditions/JavaConditionNegator';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';

/**
 * Detects and decompiles a simple natural loop into a `while` statement.
 *
 * Current scope (intentionally conservative):
 * - loop header is block0
 * - header ends with a ConditionalJumpStmt
 * - exactly one loop edge back to header
 * - loop body is a single linear chain ending in `goto header`
 * - loop exit leads directly to a return/throw block
 */
export class WhileLoopControlFlowAstDecompiler {
    private readonly loopDetector = new ControlFlowGraphNaturalLoopDetector();
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();
    private readonly condConverter = new IrConditionalJumpConditionConverter();
    private readonly condNegator = new JavaConditionNegator();

    public tryDecompile(cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt | null {
        const loops = this.loopDetector.detect(cfg);
        for (const loop of loops) {
            const result = this.tryDecompileWithHeader(cfg, stmtCtx, loop);
            if (result) return result;
        }

        return null;
    }

    private tryDecompileWithHeader(
        cfg: ControlFlowGraph,
        stmtCtx: IrStatementToJavaAstContext,
        loop: { readonly header: number; readonly nodes: ReadonlySet<number> }
    ): JavaBlockStmt | null {
        const headerIndex = loop.header;
        const header = cfg.blocks[headerIndex];
        if (!header) return null;

        const term = header.getTerminator();
        if (!(term instanceof ConditionalJumpStmt)) return null;

        const trueInLoop = loop.nodes.has(term.trueTarget);
        const falseInLoop = loop.nodes.has(term.falseTarget);
        if (trueInLoop === falseInLoop) {
            return null;
        }

        const bodyEntry = trueInLoop ? term.trueTarget : term.falseTarget;
        const exitTarget = trueInLoop ? term.falseTarget : term.trueTarget;

        if (loop.nodes.has(exitTarget)) return null;

        // Preheader: a linear chain from entry block 0 to the loop header.
        const preheaderBlocks = this.tryFindLinearPreheaderPath(cfg, headerIndex, loop.nodes);
        if (!preheaderBlocks) return null;

        const bodyOrder = this.tryLinearizeLoopBody(cfg, loop.nodes, headerIndex, bodyEntry);
        if (!bodyOrder) return null;

        const out: JavaStmt[] = [];

        // Emit preheader statements (excluding the final jump into the header).
        for (let i = 0; i < preheaderBlocks.length; i++) {
            const b = cfg.blocks[preheaderBlocks[i]!]!;
            const isLast = i === preheaderBlocks.length - 1;
            out.push(...this.convertPreheaderBlock(b, stmtCtx, /* excludeTerminator */ isLast));
        }

        // Build loop body (prefer `while(cond)` when the header has no semantic statements).
        const headerStatements = this.convertBlockStatements(header, stmtCtx, /* excludeTerminator */ true);
        const headerStatementCount = headerStatements.length;
        const hasSemanticHeaderStatements = headerStatements.some(s => !(s instanceof JavaCommentStmt));

        const rawCond = this.condConverter.convert(term, stmtCtx.exprContext);
        const stayCond = trueInLoop ? rawCond : this.condNegator.negate(rawCond);

        const bodyStatements: JavaStmt[] = [];
        bodyStatements.push(...headerStatements);

        for (const blockIndex of bodyOrder) {
            const block = cfg.blocks[blockIndex]!;
            bodyStatements.push(...this.convertLoopBlock(block, stmtCtx, headerIndex));
        }

        if (hasSemanticHeaderStatements) {
            const breakCond = this.condNegator.negate(stayCond);
            bodyStatements.splice(headerStatementCount, 0, new JavaIfStmt(breakCond, new JavaBlockStmt([new JavaBreakStmt()]), null));
            out.push(new JavaWhileStmt(new JavaLiteralExpr('true'), new JavaBlockStmt(bodyStatements)));
        } else {
            out.push(new JavaWhileStmt(stayCond, new JavaBlockStmt(bodyStatements)));
        }

        const exitBlock = cfg.blocks[exitTarget];
        if (!exitBlock) return null;

        const exitTerm = exitBlock.getTerminator();
        if (!(exitTerm instanceof ReturnStmt) && !(exitTerm instanceof ThrowStmt)) {
            return null;
        }

        out.push(...this.convertBlockStatements(exitBlock, stmtCtx, /* excludeTerminator */ false));

        return new JavaBlockStmt(out);
    }

    private tryFindLinearPreheaderPath(
        cfg: ControlFlowGraph,
        headerIndex: number,
        loopNodes: ReadonlySet<number>
    ): number[] | null {
        // Entry must be reachable.
        if (!cfg.blocks[0]) return null;

        const visited = new Set<number>();
        const path: number[] = [];

        let current = 0;
        while (current !== headerIndex) {
            if (visited.has(current)) return null;
            visited.add(current);

            // Preheader blocks must not be part of the loop itself.
            if (loopNodes.has(current)) return null;

            const block = cfg.blocks[current];
            if (!block) return null;

            // Must be a single-successor chain.
            if (block.successors.size !== 1) return null;
            const [next] = block.successors;
            if (next === undefined) return null;

            path.push(current);

            current = next;
            if (path.length > cfg.blocks.length) return null;
        }

        // If header is entry, path is empty.
        return path;
    }

    private convertPreheaderBlock(block: BasicBlock, stmtCtx: IrStatementToJavaAstContext, excludeTerminator: boolean): JavaStmt[] {
        // When excludeTerminator=true, we drop the final `goto header`.
        return this.convertBlockStatements(block, stmtCtx, excludeTerminator);
    }

    private tryLinearizeLoopBody(
        cfg: ControlFlowGraph,
        loopNodes: ReadonlySet<number>,
        headerIndex: number,
        bodyEntry: number
    ): number[] | null {
        const order: number[] = [];
        const visited = new Set<number>();

        let current = bodyEntry;
        while (current !== headerIndex) {
            if (visited.has(current)) return null;
            visited.add(current);
            order.push(current);

            const block = cfg.blocks[current];
            if (!block) return null;

            // Disallow exits from the loop body (no breaks/continues yet).
            for (const succ of block.successors) {
                if (!loopNodes.has(succ)) {
                    return null;
                }
            }

            const inLoopSuccs = [...block.successors].filter(s => loopNodes.has(s));
            if (inLoopSuccs.length !== 1) return null;

            const next = inLoopSuccs[0]!;
            if (next === headerIndex) {
                break;
            }

            current = next;
        }

        // Must cover all loop nodes except the header.
        if (visited.size !== loopNodes.size - 1) {
            return null;
        }

        return order;
    }

    private convertLoopBlock(block: BasicBlock, stmtCtx: IrStatementToJavaAstContext, headerIndex: number): JavaStmt[] {
        const term = block.getTerminator();
        if (term instanceof UnconditionalJumpStmt && term.target === headerIndex) {
            // Drop trailing back-edge.
            return this.convertBlockStatements(block, stmtCtx, /* excludeTerminator */ true);
        }
        return this.convertBlockStatements(block, stmtCtx, /* excludeTerminator */ false);
    }

    private convertBlockStatements(block: BasicBlock, stmtCtx: IrStatementToJavaAstContext, excludeTerminator: boolean): JavaStmt[] {
        const slice = excludeTerminator ? this.excludeTerminator(block) : block.statements;
        return this.stmtListConverter.convert(slice, stmtCtx);
    }

    private excludeTerminator(block: BasicBlock): readonly Stmt[] {
        const last = block.statements[block.statements.length - 1];
        if (!last) return block.statements;
        if (last instanceof ConditionalJumpStmt ||
            last instanceof UnconditionalJumpStmt ||
            last instanceof SwitchStmt ||
            last instanceof ReturnStmt ||
            last instanceof ThrowStmt) {
            return block.statements.slice(0, block.statements.length - 1);
        }
        return block.statements;
    }
}

