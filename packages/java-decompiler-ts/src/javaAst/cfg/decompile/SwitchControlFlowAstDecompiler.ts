import type { ControlFlowGraph, BasicBlock } from '@blkswn/java-ir';
import { SwitchStmt, ReturnStmt, ThrowStmt } from '@blkswn/java-ir';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { JavaSwitchCase } from '../../stmt/JavaSwitchCase';
import { JavaSwitchStmt } from '../../stmt/JavaSwitchStmt';
import { IrExpressionToJavaAstConverter } from '../../ir/IrExpressionToJavaAstConverter';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';

export class SwitchControlFlowAstDecompiler {
    private readonly exprConverter = new IrExpressionToJavaAstConverter();
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();

    public canHandle(cfg: ControlFlowGraph): boolean {
        const entry = cfg.blocks[0];
        if (!entry) return false;
        const term = entry.getTerminator();
        if (!(term instanceof SwitchStmt)) return false;

        const targets = new Set<number>(term.cases.map(c => c.target));
        targets.add(term.defaultTarget);

        for (const targetIndex of targets) {
            const block = cfg.blocks[targetIndex];
            if (!block) return false;
            const t = block.getTerminator();
            if (!(t instanceof ReturnStmt) && !(t instanceof ThrowStmt)) {
                return false;
            }
        }

        return true;
    }

    public decompile(cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt {
        const entry = cfg.blocks[0]!;
        const term = entry.getTerminator() as SwitchStmt;

        const out: JavaStmt[] = [];
        out.push(...this.convertBlockStatements(entry, stmtCtx, /* excludeTerminator */ true));

        const keyExpr = this.exprConverter.convert(term.key, stmtCtx.exprContext);

        // Group cases by target (multiple case labels can share a block).
        const targetToLabels = new Map<number, number[]>();
        for (const c of term.cases) {
            const labels = targetToLabels.get(c.target) ?? [];
            labels.push(c.key);
            targetToLabels.set(c.target, labels);
        }

        const cases: JavaSwitchCase[] = [];
        const emittedTargets = new Set<number>();
        for (const c of term.cases) {
            if (emittedTargets.has(c.target)) continue;
            emittedTargets.add(c.target);

            const labels = targetToLabels.get(c.target) ?? [c.key];
            const body = new JavaBlockStmt(this.convertBlockStatements(cfg.blocks[c.target]!, stmtCtx, false));
            cases.push(new JavaSwitchCase(labels, body));
        }

        // Default
        cases.push(new JavaSwitchCase(['default'], new JavaBlockStmt(this.convertBlockStatements(cfg.blocks[term.defaultTarget]!, stmtCtx, false))));

        out.push(new JavaSwitchStmt(keyExpr, cases));
        return new JavaBlockStmt(out);
    }

    private convertBlockStatements(block: BasicBlock, stmtCtx: IrStatementToJavaAstContext, excludeTerminator: boolean): JavaStmt[] {
        const slice = excludeTerminator ? block.statements.slice(0, Math.max(0, block.statements.length - 1)) : block.statements;
        return this.stmtListConverter.convert(slice, stmtCtx);
    }
}

