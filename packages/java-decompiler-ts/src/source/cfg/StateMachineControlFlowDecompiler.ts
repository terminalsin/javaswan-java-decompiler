import { Type, TypeSort } from '@blkswn/java-asm';
import type { ControlFlowGraph, BasicBlock } from '@blkswn/java-ir';
import { ConditionalJumpStmt, SwitchStmt, UnconditionalJumpStmt } from '@blkswn/java-ir';
import { ReturnStmt, ThrowStmt } from '@blkswn/java-ir';
import type { JavaSourceWriter } from '../printing/JavaSourceWriter';
import { IrExpressionToJavaSourceConverter, type IrExpressionToJavaSourceContext } from '../ir/IrExpressionToJavaSourceConverter';
import { IrStatementToJavaSourceConverter, type IrStatementToJavaSourceContext } from '../ir/IrStatementToJavaSourceConverter';

export class StateMachineControlFlowDecompiler {
  private readonly exprConverter = new IrExpressionToJavaSourceConverter();
  private readonly stmtConverter = new IrStatementToJavaSourceConverter();

  public emit(
    cfg: ControlFlowGraph,
    writer: JavaSourceWriter,
    ctx: {
      readonly exprCtx: IrExpressionToJavaSourceContext;
      readonly stmtCtx: IrStatementToJavaSourceContext;
      readonly returnType: Type;
    }
  ): void {
    const pcVar = '__pc';

    writer.writeLine(`int ${pcVar} = 0;`);
    writer.writeLine('while (true) {');
    writer.indent();
    writer.writeLine(`switch (${pcVar}) {`);
    writer.indent();

    for (const block of cfg.blocks) {
      writer.writeLine(`case ${block.index}: {`);
      writer.indent();
      this.emitCaseBlock(cfg, block, writer, ctx, pcVar);
      writer.dedent();
      writer.writeLine('}');
    }

    writer.writeLine('default:');
    writer.indent();
    writer.writeLine(this.defaultReturnStatement(ctx.returnType));
    writer.dedent();

    writer.dedent();
    writer.writeLine('}');
    writer.dedent();
    writer.writeLine('}');
  }

  private emitCaseBlock(
    cfg: ControlFlowGraph,
    block: BasicBlock,
    writer: JavaSourceWriter,
    ctx: { readonly exprCtx: IrExpressionToJavaSourceContext; readonly stmtCtx: IrStatementToJavaSourceContext; readonly returnType: Type },
    pcVar: string
  ): void {
    const term = block.getTerminator();

    if (term instanceof ConditionalJumpStmt) {
      this.emitNonTerminatorStatements(block, writer, ctx, /* excludeLast */ true);
      const cond = this.formatCondition(term, ctx.exprCtx);
      writer.writeLine(`if (${cond}) { ${pcVar} = ${term.trueTarget}; continue; }`);
      writer.writeLine(`${pcVar} = ${term.falseTarget}; continue;`);
      return;
    }

    if (term instanceof UnconditionalJumpStmt) {
      this.emitNonTerminatorStatements(block, writer, ctx, /* excludeLast */ true);
      writer.writeLine(`${pcVar} = ${term.target}; continue;`);
      return;
    }

    if (term instanceof SwitchStmt) {
      this.emitNonTerminatorStatements(block, writer, ctx, /* excludeLast */ true);
      const key = this.exprConverter.convert(term.key, ctx.exprCtx);
      writer.writeLine(`switch (${key}) {`);
      writer.indent();
      for (const c of term.cases) {
        writer.writeLine(`case ${c.key}: ${pcVar} = ${c.target}; continue;`);
      }
      writer.writeLine(`default: ${pcVar} = ${term.defaultTarget}; continue;`);
      writer.dedent();
      writer.writeLine('}');
      return;
    }

    // Non-branch terminators: just emit statements; they should end the case via return/throw.
    if (term instanceof ReturnStmt || term instanceof ThrowStmt) {
      this.emitNonTerminatorStatements(block, writer, ctx, /* excludeLast */ false);
      return;
    }

    // No explicit terminator: follow single successor if possible.
    this.emitNonTerminatorStatements(block, writer, ctx, /* excludeLast */ false);
    if (block.successors.size === 1) {
      const [next] = block.successors;
      writer.writeLine(`${pcVar} = ${next}; continue;`);
      return;
    }

    writer.writeLine(this.defaultReturnStatement(ctx.returnType));
  }

  private emitNonTerminatorStatements(
    block: BasicBlock,
    writer: JavaSourceWriter,
    ctx: { readonly stmtCtx: IrStatementToJavaSourceContext },
    excludeLast: boolean
  ): void {
    const count = excludeLast ? Math.max(0, block.statements.length - 1) : block.statements.length;
    for (let i = 0; i < count; i++) {
      const stmt = block.statements[i]!;
      const lines = this.stmtConverter.convert(stmt, ctx.stmtCtx);
      for (const line of lines) {
        writer.writeLine(line);
      }
    }
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

  private defaultReturnStatement(returnType: Type): string {
    const sort = returnType.getSort();
    if (sort === TypeSort.VOID) {
      return 'return;';
    }
    if (sort === TypeSort.BOOLEAN) {
      return 'return false;';
    }
    if (sort === TypeSort.CHAR) {
      return "return '\\0';";
    }
    if (
      sort === TypeSort.BYTE ||
      sort === TypeSort.SHORT ||
      sort === TypeSort.INT ||
      sort === TypeSort.LONG
    ) {
      return 'return 0;';
    }
    if (sort === TypeSort.FLOAT) {
      return 'return 0.0f;';
    }
    if (sort === TypeSort.DOUBLE) {
      return 'return 0.0;';
    }
    return 'return null;';
  }
}

