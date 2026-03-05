import type { ControlFlowGraph } from '@blkswn/java-ir';
import { UnconditionalJumpStmt } from '@blkswn/java-ir';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { ControlFlowGraphLinearizer } from '../../../source/cfg/ControlFlowGraphLinearizer';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';

export class LinearControlFlowAstDecompiler {
    private readonly linearizer = new ControlFlowGraphLinearizer();
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();

    public tryDecompile(cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt | null {
        const order = this.linearizer.tryLinearize(cfg);
        if (!order) return null;

        const out: JavaStmt[] = [];

        for (let i = 0; i < order.length; i++) {
            const blockIndex = order[i]!;
            const nextBlockIndex = order[i + 1] ?? null;
            const block = cfg.blocks[blockIndex]!;

            let statements = block.statements;
            if (nextBlockIndex !== null) {
                const last = block.statements[block.statements.length - 1];
                if (last instanceof UnconditionalJumpStmt && last.target === nextBlockIndex) {
                    statements = block.statements.slice(0, Math.max(0, block.statements.length - 1));
                }
            }

            out.push(...this.stmtListConverter.convert(statements, stmtCtx));
        }

        return new JavaBlockStmt(out);
    }
}

