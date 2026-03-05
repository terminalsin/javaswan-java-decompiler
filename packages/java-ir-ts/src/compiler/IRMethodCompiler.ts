import type { Label, MethodVisitor } from '@blkswn/java-asm';
import { Label as AsmLabel, Type } from '@blkswn/java-asm';
import * as Opcodes from '@blkswn/java-asm';
import type { MethodIR } from '../ir/MethodIR';
import type { BasicBlock } from '../ir/BasicBlock';
import { IRExpressionReferenceCounter } from '../analysis/IRExpressionReferenceCounter';
import { IRLocalAllocator } from './locals/IRLocalAllocator';
import { IRExpressionLocalBindings } from './expressions/IRExpressionLocalBindings';
import { IRExpressionEmitter } from './expressions/IRExpressionEmitter';
import { IRStatementEmitter } from './statements/IRStatementEmitter';
import { ConditionalJumpStmt } from '../stmt/ConditionalJumpStmt';
import { ReturnStmt } from '../stmt/ReturnStmt';
import { SwitchStmt } from '../stmt/SwitchStmt';
import { ThrowStmt } from '../stmt/ThrowStmt';
import { UnconditionalJumpStmt } from '../stmt/UnconditionalJumpStmt';

export interface IRMethodCompileOptions {
  /**
   * If true, adds synthetic gotos for blocks that have a single successor which
   * is not the immediately following block in emission order.
   */
  readonly enforceExplicitFallthrough?: boolean;
}

/**
 * Compiles a MethodIR CFG into JVM bytecode instructions (via ASM MethodVisitor).
 */
export class IRMethodCompiler {
  public compile(methodIR: MethodIR, mv: MethodVisitor, options: IRMethodCompileOptions = {}): void {
    if (!methodIR.cfg) {
      return;
    }

    mv.visitCode();

    const cfg = methodIR.cfg;
    const labelByBlockIndex = new Map<number, Label>();
    for (const block of cfg.blocks) {
      labelByBlockIndex.set(block.index, new AsmLabel());
    }
    const endLabel = new AsmLabel();

    const localAllocator = new IRLocalAllocator(this.getInitialTempLocalIndex(methodIR));
    const refCounts = new IRExpressionReferenceCounter().countInMethod(methodIR);
    const bindings = new IRExpressionLocalBindings(refCounts, localAllocator);
    const exprEmitter = new IRExpressionEmitter(mv, bindings);
    const stmtEmitter = new IRStatementEmitter(mv, exprEmitter, labelByBlockIndex, endLabel);

    for (const block of cfg.blocks) {
      const label = labelByBlockIndex.get(block.index)!;
      mv.visitLabel(label);

      for (const stmt of block.statements) {
        stmtEmitter.emit(stmt, block);
      }

      if (options.enforceExplicitFallthrough) {
        this.emitSyntheticFallthroughIfNeeded(block, cfg.blocks, mv, labelByBlockIndex);
      }
    }

    // Mark end-of-method label (used for local variable scopes and try/catch end ranges).
    mv.visitLabel(endLabel);

    // java-asm-ts MethodWriter currently records try/catch entries using label.bytecodeOffset,
    // so we must emit try/catch blocks AFTER labels are visited (opposite of ASM docs).
    for (const handler of cfg.exceptionHandlers) {
      const start = labelByBlockIndex.get(handler.startBlock);
      const end = handler.endBlock >= cfg.size ? endLabel : labelByBlockIndex.get(handler.endBlock);
      const h = labelByBlockIndex.get(handler.handlerBlock);
      if (!start || !end || !h) {
        throw new Error(`Invalid exception handler block indices: ${JSON.stringify(handler)}`);
      }
      mv.visitTryCatchBlock(start, end, h, handler.exceptionType);
    }

    // Emit local variable table (optional, but enables nicer debugging output).
    for (const lv of methodIR.localVariables) {
      const start = labelByBlockIndex.get(lv.startBlock) ?? labelByBlockIndex.get(0) ?? endLabel;
      const end = lv.endBlock >= cfg.size ? endLabel : (labelByBlockIndex.get(lv.endBlock) ?? endLabel);
      mv.visitLocalVariable(lv.name, lv.descriptor, lv.signature, start, end, lv.index);
    }

    // Let ClassWriter/MethodWriter compute maxs if enabled.
    mv.visitMaxs(0, 0);
  }

  private getInitialTempLocalIndex(methodIR: MethodIR): number {
    // Prefer the original maxLocals when available to avoid clobbering real locals.
    const original = methodIR.maxLocals;

    // Fallback: compute from signature.
    let computed = methodIR.isStatic() ? 0 : 1; // 'this'
    for (const t of methodIR.parameterTypes) {
      computed += t.getSize();
    }

    return Math.max(original, computed);
  }

  private emitSyntheticFallthroughIfNeeded(
    block: BasicBlock,
    blocksInOrder: readonly BasicBlock[],
    mv: MethodVisitor,
    labelByBlockIndex: ReadonlyMap<number, Label>
  ): void {
    const terminator = block.getTerminator();
    if (terminator instanceof ConditionalJumpStmt ||
      terminator instanceof UnconditionalJumpStmt ||
      terminator instanceof SwitchStmt ||
      terminator instanceof ReturnStmt ||
      terminator instanceof ThrowStmt) {
      return;
    }

    if (block.successors.size !== 1) {
      return;
    }

    const succ = [...block.successors][0]!;
    const nextBlock = blocksInOrder[block.index + 1];
    if (nextBlock && nextBlock.index === succ) {
      return; // fallthrough already matches layout
    }

    const target = labelByBlockIndex.get(succ);
    if (!target) {
      throw new Error(`Missing label for successor block${succ}`);
    }
    mv.visitJumpInsn(Opcodes.GOTO, target);
  }
}

