import type { ControlFlowGraph, BasicBlock } from '@blkswn/java-ir';
import { ConditionalJumpStmt, ReturnStmt, ThrowStmt } from '@blkswn/java-ir';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import { JavaIfStmt } from '../../stmt/JavaIfStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';
import { IrConditionalJumpConditionConverter } from '../../ir/conditions/IrConditionalJumpConditionConverter';

export class IfReturnControlFlowAstDecompiler {
    private readonly stmtListConverter = new IrStatementListToJavaAstConverter();
    private readonly conditionConverter = new IrConditionalJumpConditionConverter();

    public canHandle(cfg: ControlFlowGraph): boolean {
        const entry = cfg.blocks[0];
        if (!entry) return false;
        const term = entry.getTerminator();
        if (!(term instanceof ConditionalJumpStmt)) return false;

        const tBlock = cfg.blocks[term.trueTarget];
        const fBlock = cfg.blocks[term.falseTarget];
        if (!tBlock || !fBlock) return false;

        const tTerm = tBlock.getTerminator();
        const fTerm = fBlock.getTerminator();
        if (!(tTerm instanceof ReturnStmt) && !(tTerm instanceof ThrowStmt)) return false;
        if (!(fTerm instanceof ReturnStmt) && !(fTerm instanceof ThrowStmt)) return false;

        return true;
    }

    public decompile(cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt {
        const entry = cfg.blocks[0]!;
        const term = entry.getTerminator() as ConditionalJumpStmt;

        const out: JavaStmt[] = [];
        out.push(...this.convertBlockStatements(entry, stmtCtx, /* excludeTerminator */ true));

        const condition = this.conditionConverter.convert(term, stmtCtx.exprContext);

        const thenBranch = new JavaBlockStmt(this.convertBlockStatements(cfg.blocks[term.trueTarget]!, stmtCtx, false));
        const elseBranch = new JavaBlockStmt(this.convertBlockStatements(cfg.blocks[term.falseTarget]!, stmtCtx, false));

        out.push(new JavaIfStmt(condition, thenBranch, elseBranch));
        return new JavaBlockStmt(out);
    }

    private convertBlockStatements(block: BasicBlock, stmtCtx: IrStatementToJavaAstContext, excludeTerminator: boolean): JavaStmt[] {
        const slice = excludeTerminator ? block.statements.slice(0, Math.max(0, block.statements.length - 1)) : block.statements;
        return this.stmtListConverter.convert(slice, stmtCtx);
    }
}

