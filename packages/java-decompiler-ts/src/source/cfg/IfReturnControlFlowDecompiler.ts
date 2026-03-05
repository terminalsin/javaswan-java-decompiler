import type { ControlFlowGraph, BasicBlock } from '@blkswn/java-ir';
import { ConditionalJumpStmt, ReturnStmt, ThrowStmt } from '@blkswn/java-ir';
import { TypeSort } from '@blkswn/java-asm';
import type { JavaSourceWriter } from '../printing/JavaSourceWriter';
import { IrStatementToJavaSourceConverter, type IrStatementToJavaSourceContext } from '../ir/IrStatementToJavaSourceConverter';
import { IrExpressionToJavaSourceConverter, type IrExpressionToJavaSourceContext } from '../ir/IrExpressionToJavaSourceConverter';

export class IfReturnControlFlowDecompiler {
  private readonly exprConverter = new IrExpressionToJavaSourceConverter();
  private readonly stmtConverter = new IrStatementToJavaSourceConverter();

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

  public emit(
    cfg: ControlFlowGraph,
    writer: JavaSourceWriter,
    ctx: {
      readonly exprCtx: IrExpressionToJavaSourceContext;
      readonly stmtCtx: IrStatementToJavaSourceContext;
    }
  ): void {
    const entry = cfg.blocks[0]!;
    const term = entry.getTerminator() as ConditionalJumpStmt;

    this.emitBlockStatements(entry, writer, ctx, /* excludeTerminator */ true);

    const condition = this.formatCondition(term, ctx.exprCtx);
    writer.writeLine(`if (${condition}) {`);
    writer.indent();
    this.emitBlockStatements(cfg.blocks[term.trueTarget]!, writer, ctx, /* excludeTerminator */ false);
    writer.dedent();
    writer.writeLine('} else {');
    writer.indent();
    this.emitBlockStatements(cfg.blocks[term.falseTarget]!, writer, ctx, /* excludeTerminator */ false);
    writer.dedent();
    writer.writeLine('}');
  }

  private formatCondition(stmt: ConditionalJumpStmt, exprCtx: IrExpressionToJavaSourceContext): string {
    const left = this.exprConverter.convert(stmt.left, exprCtx);
    if (stmt.right) {
      const right = this.exprConverter.convert(stmt.right, exprCtx);
      return `${left} ${stmt.op} ${right}`;
    }

    const sort = stmt.left.type.getSort();
    const right = sort === TypeSort.OBJECT || sort === TypeSort.ARRAY ? 'null' : '0';
    return `${left} ${stmt.op} ${right}`;
  }

  private emitBlockStatements(
    block: BasicBlock,
    writer: JavaSourceWriter,
    ctx: { readonly stmtCtx: IrStatementToJavaSourceContext },
    excludeTerminator: boolean
  ): void {
    const count = excludeTerminator ? Math.max(0, block.statements.length - 1) : block.statements.length;
    for (let i = 0; i < count; i++) {
      const stmt = block.statements[i]!;
      const lines = this.stmtConverter.convert(stmt, ctx.stmtCtx);
      for (const line of lines) {
        writer.writeLine(line);
      }
    }
  }
}

