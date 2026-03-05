import type { BasicBlock, ControlFlowGraph, MethodIR } from '@blkswn/java-ir';
import { ConditionalJumpStmt, ReturnStmt, SwitchStmt, ThrowStmt, UnconditionalJumpStmt } from '@blkswn/java-ir';
import { TypeSort } from '@blkswn/java-asm';
import { JavaTypeNameFormatter } from '../../../source/formatting/JavaTypeNameFormatter';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import { JavaCommentStmt } from '../../stmt/JavaCommentStmt';
import { JavaContinueStmt } from '../../stmt/JavaContinueStmt';
import { JavaIfStmt } from '../../stmt/JavaIfStmt';
import { JavaReturnStmt } from '../../stmt/JavaReturnStmt';
import { JavaSwitchCase } from '../../stmt/JavaSwitchCase';
import { JavaSwitchStmt } from '../../stmt/JavaSwitchStmt';
import type { JavaStmt } from '../../stmt/JavaStmt';
import { JavaThrowStmt } from '../../stmt/JavaThrowStmt';
import { JavaTryCatchStmt } from '../../stmt/JavaTryCatchStmt';
import { JavaCatchClause } from '../../stmt/JavaCatchClause';
import { JavaWhileStmt } from '../../stmt/JavaWhileStmt';
import { JavaAssignStmt } from '../../stmt/JavaAssignStmt';
import type { JavaExpr } from '../../expr/JavaExpr';
import { JavaBinaryExpr } from '../../expr/JavaBinaryExpr';
import { JavaIdentifierExpr } from '../../expr/JavaIdentifierExpr';
import { JavaInstanceOfExpr } from '../../expr/JavaInstanceOfExpr';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';
import { IrExpressionToJavaAstConverter } from '../../ir/IrExpressionToJavaAstConverter';
import { IrStatementListToJavaAstConverter } from '../../ir/IrStatementListToJavaAstConverter';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { IrConditionalJumpConditionConverter } from '../../ir/conditions/IrConditionalJumpConditionConverter';

/**
 * A last-resort CFG decompiler that emits a semantically-correct Java-like dispatcher:
 *
 *   __label = 0;
 *   while (true) {
 *     switch (__label) {
 *       case 0: ... __label = 1; continue;
 *       case 1: ... if (cond) { __label = 2; continue; } else { __label = 3; continue; }
 *       ...
 *     }
 *   }
 *
 * This allows us to "render" unstructured graphs (and preserve semantics) without falling
 * back to a comment-only IR listing.
 */
export class LabelSwitchControlFlowAstDecompiler {
  private readonly stmtListConverter = new IrStatementListToJavaAstConverter();
  private readonly exprConverter = new IrExpressionToJavaAstConverter();
  private readonly condConverter = new IrConditionalJumpConditionConverter();
  private readonly typeNameFormatter = new JavaTypeNameFormatter();

  public decompile(method: MethodIR, cfg: ControlFlowGraph, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt {
    const labelVar = new JavaIdentifierExpr('__label');
    const caughtVar = new JavaIdentifierExpr('__caughtException');
    const catchVarName = '__ex';

    const switchCases: JavaSwitchCase[] = [];
    for (const block of cfg.blocks) {
      const body = this.decompileBlockIntoDispatcherCase(method, cfg, block, stmtCtx, labelVar);
      switchCases.push(new JavaSwitchCase([block.index], new JavaBlockStmt(body)));
    }

    // Defensive default: return a default value (or void return) if the dispatcher ever
    // enters an unknown label.
    switchCases.push(new JavaSwitchCase(['default'], new JavaBlockStmt([this.buildDefaultReturnStmt(method)])));

    const dispatcher = new JavaSwitchStmt(labelVar, switchCases);

    const loopBodyStmt: JavaStmt = cfg.exceptionHandlers.length > 0
      ? new JavaTryCatchStmt(
        new JavaBlockStmt([dispatcher]),
        [new JavaCatchClause('Throwable', catchVarName, this.buildExceptionDispatcherCatchBody(cfg, stmtCtx, labelVar, caughtVar, new JavaIdentifierExpr(catchVarName)))]
      )
      : dispatcher;

    const loop = new JavaWhileStmt(new JavaLiteralExpr('true'), new JavaBlockStmt([loopBodyStmt]));

    const out: JavaStmt[] = [];
    if (stmtCtx.includeDebugComments) {
      out.push(new JavaCommentStmt(
        cfg.exceptionHandlers.length > 0
          ? 'UNSTRUCTURED CFG - rendering via label dispatcher (with exception handlers)'
          : 'UNSTRUCTURED CFG - rendering via label dispatcher'
      ));
    }
    out.push(new JavaAssignStmt(labelVar, new JavaLiteralExpr('0')));
    out.push(loop);
    return new JavaBlockStmt(out);
  }

  private buildExceptionDispatcherCatchBody(
    cfg: ControlFlowGraph,
    stmtCtx: IrStatementToJavaAstContext,
    labelVar: JavaIdentifierExpr,
    caughtVar: JavaIdentifierExpr,
    caughtValue: JavaIdentifierExpr
  ): JavaBlockStmt {
    const out: JavaStmt[] = [];

    // Expose the caught exception to IR handler blocks via CaughtExceptionExpr.
    out.push(new JavaAssignStmt(caughtVar, caughtValue));

    for (const handler of cfg.exceptionHandlers) {
      const rangeCond = this.buildInTryRangeCondition(labelVar, handler.startBlock, handler.endBlock);
      const typeCond = handler.exceptionType
        ? new JavaInstanceOfExpr(caughtValue, this.typeNameFormatter.formatInternalName(handler.exceptionType, stmtCtx.exprContext.typeContext))
        : null;

      const cond = typeCond ? new JavaBinaryExpr(rangeCond, '&&', typeCond) : rangeCond;
      const thenBranch = new JavaBlockStmt(this.buildSetLabelAndContinue(labelVar, handler.handlerBlock));
      out.push(new JavaIfStmt(cond, thenBranch, null));
    }

    // Not handled by any try/catch: rethrow.
    out.push(new JavaThrowStmt(caughtValue));
    return new JavaBlockStmt(out);
  }

  private buildInTryRangeCondition(labelVar: JavaIdentifierExpr, startBlock: number, endBlock: number): JavaExpr {
    // (__label >= start) && (__label < end)
    const ge = new JavaBinaryExpr(labelVar, '>=', new JavaLiteralExpr(String(startBlock)));
    const lt = new JavaBinaryExpr(labelVar, '<', new JavaLiteralExpr(String(endBlock)));
    return new JavaBinaryExpr(ge, '&&', lt);
  }

  private decompileBlockIntoDispatcherCase(
    method: MethodIR,
    cfg: ControlFlowGraph,
    block: BasicBlock,
    stmtCtx: IrStatementToJavaAstContext,
    labelVar: JavaIdentifierExpr
  ): JavaStmt[] {
    const out: JavaStmt[] = [];

    if (stmtCtx.includeDebugComments) {
      const preds = [...block.predecessors].join(', ');
      const succs = [...block.successors].join(', ');
      out.push(new JavaCommentStmt(`block${block.index}: preds [${preds}], succs [${succs}]`));
    }

    const terminator = this.getControlFlowTerminator(block);

    // Return/throw terminators can be converted directly.
    if (terminator instanceof ReturnStmt || terminator instanceof ThrowStmt) {
      out.push(...this.stmtListConverter.convert(block.statements, stmtCtx));
      return out;
    }

    const toConvert = terminator ? block.statements.slice(0, Math.max(0, block.statements.length - 1)) : block.statements;
    out.push(...this.stmtListConverter.convert(toConvert, stmtCtx));

    if (terminator instanceof UnconditionalJumpStmt) {
      out.push(...this.buildSetLabelAndContinue(labelVar, terminator.target));
      return out;
    }

    if (terminator instanceof ConditionalJumpStmt) {
      const condition = this.condConverter.convert(terminator, stmtCtx.exprContext);
      const thenBranch = new JavaBlockStmt(this.buildSetLabelAndContinue(labelVar, terminator.trueTarget));
      const elseBranch = new JavaBlockStmt(this.buildSetLabelAndContinue(labelVar, terminator.falseTarget));
      out.push(new JavaIfStmt(condition, thenBranch, elseBranch));
      return out;
    }

    if (terminator instanceof SwitchStmt) {
      const key = this.exprConverter.convert(terminator.key, stmtCtx.exprContext);
      const cases = terminator.cases.map(c => new JavaSwitchCase([c.key], new JavaBlockStmt(this.buildSetLabelAndContinue(labelVar, c.target))));
      cases.push(new JavaSwitchCase(['default'], new JavaBlockStmt(this.buildSetLabelAndContinue(labelVar, terminator.defaultTarget))));
      out.push(new JavaSwitchStmt(key, cases));
      return out;
    }

    // No explicit control-flow stmt: follow the single successor if present.
    const succs = [...block.successors];
    const normalSuccs = cfg.exceptionHandlers.length > 0
      ? this.filterExceptionHandlerSuccessors(cfg, block.index, succs)
      : succs;

    if (normalSuccs.length === 1) {
      out.push(...this.buildSetLabelAndContinue(labelVar, normalSuccs[0]!));
      return out;
    }

    // End of control flow or ambiguous successor set (could be exception edges, or a graph shape we didn't expect).
    if (succs.length === 0) {
      out.push(this.buildDefaultReturnStmt(method));
      return out;
    }

    out.push(new JavaCommentStmt(`unstructured block${block.index} has ${succs.length} successors; returning`));
    out.push(this.buildDefaultReturnStmt(method));
    return out;
  }

  private filterExceptionHandlerSuccessors(cfg: ControlFlowGraph, fromBlockIndex: number, successors: readonly number[]): number[] {
    if (cfg.exceptionHandlers.length === 0) return [...successors];

    const exceptionTargets = new Set<number>();
    for (const h of cfg.exceptionHandlers) {
      if (fromBlockIndex >= h.startBlock && fromBlockIndex < h.endBlock) {
        exceptionTargets.add(h.handlerBlock);
      }
    }

    return successors.filter(s => !exceptionTargets.has(s));
  }

  private buildSetLabelAndContinue(labelVar: JavaIdentifierExpr, nextBlockIndex: number): JavaStmt[] {
    return [
      new JavaAssignStmt(labelVar, new JavaLiteralExpr(String(nextBlockIndex))),
      new JavaContinueStmt(),
    ];
  }

  private buildDefaultReturnStmt(method: MethodIR): JavaReturnStmt {
    const sort = method.returnType.getSort();
    if (sort === TypeSort.VOID) {
      return new JavaReturnStmt(null);
    }
    return new JavaReturnStmt(this.buildDefaultReturnExpr(sort));
  }

  private buildDefaultReturnExpr(sort: TypeSort): JavaExpr {
    if (sort === TypeSort.BOOLEAN) return new JavaLiteralExpr('false');
    if (sort === TypeSort.CHAR) return new JavaLiteralExpr("'\\0'");
    if (sort === TypeSort.BYTE || sort === TypeSort.SHORT || sort === TypeSort.INT || sort === TypeSort.LONG) {
      return new JavaLiteralExpr('0');
    }
    if (sort === TypeSort.FLOAT) return new JavaLiteralExpr('0.0f');
    if (sort === TypeSort.DOUBLE) return new JavaLiteralExpr('0.0');
    return new JavaLiteralExpr('null');
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

