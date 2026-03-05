import type { ControlFlowGraph, BasicBlock } from '@blkswn/java-ir';
import { SwitchStmt, ReturnStmt, ThrowStmt } from '@blkswn/java-ir';
import type { JavaSourceWriter } from '../printing/JavaSourceWriter';
import { IrStatementToJavaSourceConverter, type IrStatementToJavaSourceContext } from '../ir/IrStatementToJavaSourceConverter';
import { IrExpressionToJavaSourceConverter, type IrExpressionToJavaSourceContext } from '../ir/IrExpressionToJavaSourceConverter';

export class SwitchControlFlowDecompiler {
  private readonly exprConverter = new IrExpressionToJavaSourceConverter();
  private readonly stmtConverter = new IrStatementToJavaSourceConverter();

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

  public emit(
    cfg: ControlFlowGraph,
    writer: JavaSourceWriter,
    ctx: {
      readonly exprCtx: IrExpressionToJavaSourceContext;
      readonly stmtCtx: IrStatementToJavaSourceContext;
    }
  ): void {
    const entry = cfg.blocks[0]!;
    const term = entry.getTerminator() as SwitchStmt;

    // Emit entry statements before the switch terminator.
    this.emitBlockStatements(entry, writer, ctx, /* excludeTerminator */ true);

    const key = this.exprConverter.convert(term.key, ctx.exprCtx);
    writer.writeLine(`switch (${key}) {`);
    writer.indent();

    // Group cases by target to keep fallthrough semantics when multiple keys share a block.
    const targetToKeys = new Map<number, number[]>();
    for (const c of term.cases) {
      const keys = targetToKeys.get(c.target) ?? [];
      keys.push(c.key);
      targetToKeys.set(c.target, keys);
    }

    const emitCaseBodyForTarget = (target: number): void => {
      const block = cfg.blocks[target]!;
      writer.indent();
      this.emitBlockStatements(block, writer, ctx, /* excludeTerminator */ false);
      const terminator = block.getTerminator();
      if (!(terminator instanceof ReturnStmt) && !(terminator instanceof ThrowStmt)) {
        writer.writeLine('break;');
      }
      writer.dedent();
    };

    // Emit explicit cases (in original order)
    const emittedTargets = new Set<number>();
    for (const c of term.cases) {
      if (emittedTargets.has(c.target)) continue;
      emittedTargets.add(c.target);
      const keys = targetToKeys.get(c.target) ?? [c.key];
      for (const k of keys) {
        writer.writeLine(`case ${k}:`);
      }
      emitCaseBodyForTarget(c.target);
    }

    // Default
    writer.writeLine('default:');
    emitCaseBodyForTarget(term.defaultTarget);

    writer.dedent();
    writer.writeLine('}');
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

