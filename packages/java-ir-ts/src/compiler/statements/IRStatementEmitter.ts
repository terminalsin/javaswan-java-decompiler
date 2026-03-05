import type { Label, MethodVisitor } from '@blkswn/java-asm';
import { Label as AsmLabel } from '@blkswn/java-asm';
import * as Opcodes from '@blkswn/java-asm';
import { TypeSort } from '@blkswn/java-asm';
import { PhiExpr } from '../../expr/PhiExpr';
import { ArrayStoreStmt } from '../../stmt/ArrayStoreStmt';
import { ConditionalJumpStmt, ConditionalOp } from '../../stmt/ConditionalJumpStmt';
import { FieldStoreStmt } from '../../stmt/FieldStoreStmt';
import { FrameStmt, FrameType } from '../../stmt/FrameStmt';
import { LineNumberStmt } from '../../stmt/LineNumberStmt';
import { MonitorStmt, MonitorKind } from '../../stmt/MonitorStmt';
import { NopStmt } from '../../stmt/NopStmt';
import { PopStmt } from '../../stmt/PopStmt';
import { ReturnStmt } from '../../stmt/ReturnStmt';
import { Stmt } from '../../stmt/Stmt';
import { SwitchStmt } from '../../stmt/SwitchStmt';
import { ThrowStmt } from '../../stmt/ThrowStmt';
import { UnconditionalJumpStmt } from '../../stmt/UnconditionalJumpStmt';
import { VarStoreStmt } from '../../stmt/VarStoreStmt';
import type { BasicBlock } from '../../ir/BasicBlock';
import { IRExpressionEmitter } from '../expressions/IRExpressionEmitter';

/**
 * Emits JVM bytecode (via ASM MethodVisitor) for IR statements.
 */
export class IRStatementEmitter {
  constructor(
    private readonly mv: MethodVisitor,
    private readonly exprEmitter: IRExpressionEmitter,
    private readonly labelByBlockIndex: ReadonlyMap<number, Label>,
    private readonly endLabel: Label
  ) { }

  public emit(stmt: Stmt, block: BasicBlock): void {
    if (stmt instanceof LineNumberStmt) {
      // Line numbers require a label with a resolved bytecode offset.
      const lineLabel = new AsmLabel();
      this.mv.visitLabel(lineLabel);
      this.mv.visitLineNumber(stmt.line, lineLabel);
      return;
    }

    if (stmt instanceof FrameStmt) {
      // Best-effort: pass through the frame data.
      // Note: java-asm-ts MethodWriter.visitFrame is currently a no-op.
      const frameOpcode = this.getAsmFrameType(stmt.frameType);
      const locals = stmt.locals.length > 0 ? [...stmt.locals] : null;
      const stack = stmt.stack.length > 0 ? [...stmt.stack] : null;
      this.mv.visitFrame(frameOpcode, stmt.locals.length, locals, stmt.stack.length, stack);
      return;
    }

    if (stmt instanceof NopStmt) {
      this.mv.visitInsn(Opcodes.NOP);
      return;
    }

    if (stmt instanceof VarStoreStmt) {
      // Special case: exception handler entry has an implicit caught exception on the stack.
      if (stmt.value instanceof PhiExpr && stmt.value.isExceptionPhi()) {
        // Note: IR builder may introduce exception-phi values for finally/monitor-exit paths
        // even when BasicBlock.isExceptionHandler isn't set. We treat this as "pop exception from stack".
        const storeOpcode = stmt.value.type.getOpcode(Opcodes.ISTORE);
        this.mv.visitVarInsn(storeOpcode, stmt.index);
        return;
      }

      this.exprEmitter.emit(stmt.value);
      const storeOpcode = stmt.value.type.getOpcode(Opcodes.ISTORE);
      this.mv.visitVarInsn(storeOpcode, stmt.index);
      return;
    }

    if (stmt instanceof ArrayStoreStmt) {
      this.exprEmitter.emit(stmt.array);
      this.exprEmitter.emit(stmt.index);
      this.exprEmitter.emit(stmt.value);

      const opcode = stmt.elementType.getOpcode(Opcodes.IASTORE);
      this.mv.visitInsn(opcode);
      return;
    }

    if (stmt instanceof FieldStoreStmt) {
      if (stmt.isStatic) {
        this.exprEmitter.emit(stmt.value);
        this.mv.visitFieldInsn(Opcodes.PUTSTATIC, stmt.owner, stmt.fieldName, stmt.fieldDescriptor);
      } else {
        if (!stmt.instance) {
          throw new Error('PUTFIELD requires a non-null instance expression');
        }
        // Stack order: objectref, value
        this.exprEmitter.emit(stmt.instance);
        this.exprEmitter.emit(stmt.value);
        this.mv.visitFieldInsn(Opcodes.PUTFIELD, stmt.owner, stmt.fieldName, stmt.fieldDescriptor);
      }
      return;
    }

    if (stmt instanceof ConditionalJumpStmt) {
      this.emitConditionalJump(stmt);
      return;
    }

    if (stmt instanceof UnconditionalJumpStmt) {
      this.mv.visitJumpInsn(Opcodes.GOTO, this.getBlockLabel(stmt.target));
      return;
    }

    if (stmt instanceof SwitchStmt) {
      this.exprEmitter.emit(stmt.key);
      // Use LOOKUPSWITCH (always valid, even if not optimal).
      const sorted = [...stmt.cases].slice().sort((a, b) => a.key - b.key);
      const keys = sorted.map(c => c.key);
      const labels = sorted.map(c => this.getBlockLabel(c.target));
      this.mv.visitLookupSwitchInsn(this.getBlockLabel(stmt.defaultTarget), keys, labels);
      return;
    }

    if (stmt instanceof ThrowStmt) {
      this.exprEmitter.emit(stmt.exception);
      this.mv.visitInsn(Opcodes.ATHROW);
      return;
    }

    if (stmt instanceof PopStmt) {
      this.exprEmitter.emit(stmt.value);
      const size = stmt.value.type.getSize();
      if (size === 0) {
        // e.g., "pop <void invocation>" is a recording artifact; no stack effect.
        return;
      }
      this.mv.visitInsn(size === 2 ? Opcodes.POP2 : Opcodes.POP);
      return;
    }

    if (stmt instanceof MonitorStmt) {
      this.exprEmitter.emit(stmt.object);
      this.mv.visitInsn(stmt.kind === MonitorKind.ENTER ? Opcodes.MONITORENTER : Opcodes.MONITOREXIT);
      return;
    }

    if (stmt instanceof ReturnStmt) {
      if (stmt.value === null) {
        this.mv.visitInsn(Opcodes.RETURN);
      } else {
        this.exprEmitter.emit(stmt.value);
        const opcode = stmt.value.type.getOpcode(Opcodes.IRETURN);
        this.mv.visitInsn(opcode);
      }
      return;
    }

    throw new Error(`Unsupported Stmt for bytecode emission: ${stmt.constructor.name}`);
  }

  private emitConditionalJump(stmt: ConditionalJumpStmt): void {
    const trueLabel = this.getBlockLabel(stmt.trueTarget);
    const falseLabel = this.getBlockLabel(stmt.falseTarget);

    if (stmt.right === null) {
      this.exprEmitter.emit(stmt.left);
      const leftSort = stmt.left.type.getSort();
      const opcode = this.getUnaryIfOpcode(stmt.op, leftSort);
      this.mv.visitJumpInsn(opcode, trueLabel);
      this.mv.visitJumpInsn(Opcodes.GOTO, falseLabel);
      return;
    }

    this.exprEmitter.emit(stmt.left);
    this.exprEmitter.emit(stmt.right);

    const isRef = stmt.left.type.getSort() === TypeSort.OBJECT || stmt.left.type.getSort() === TypeSort.ARRAY;
    const opcode = this.getBinaryIfOpcode(stmt.op, isRef);
    this.mv.visitJumpInsn(opcode, trueLabel);
    this.mv.visitJumpInsn(Opcodes.GOTO, falseLabel);
  }

  private getUnaryIfOpcode(op: ConditionalOp, leftSort: number): number {
    const isRef = leftSort === TypeSort.OBJECT || leftSort === TypeSort.ARRAY;

    switch (op) {
      case ConditionalOp.EQ:
        return isRef ? Opcodes.IFNULL : Opcodes.IFEQ;
      case ConditionalOp.NE:
        return isRef ? Opcodes.IFNONNULL : Opcodes.IFNE;
      case ConditionalOp.LT:
        return Opcodes.IFLT;
      case ConditionalOp.GE:
        return Opcodes.IFGE;
      case ConditionalOp.GT:
        return Opcodes.IFGT;
      case ConditionalOp.LE:
        return Opcodes.IFLE;
    }
  }

  private getBinaryIfOpcode(op: ConditionalOp, isRef: boolean): number {
    if (isRef) {
      switch (op) {
        case ConditionalOp.EQ:
          return Opcodes.IF_ACMPEQ;
        case ConditionalOp.NE:
          return Opcodes.IF_ACMPNE;
        default:
          throw new Error(`Unsupported reference comparison op: ${op}`);
      }
    }

    switch (op) {
      case ConditionalOp.EQ:
        return Opcodes.IF_ICMPEQ;
      case ConditionalOp.NE:
        return Opcodes.IF_ICMPNE;
      case ConditionalOp.LT:
        return Opcodes.IF_ICMPLT;
      case ConditionalOp.GE:
        return Opcodes.IF_ICMPGE;
      case ConditionalOp.GT:
        return Opcodes.IF_ICMPGT;
      case ConditionalOp.LE:
        return Opcodes.IF_ICMPLE;
    }
  }

  private getBlockLabel(blockIndex: number): Label {
    if (blockIndex === -1) {
      return this.endLabel;
    }

    const label = this.labelByBlockIndex.get(blockIndex);
    if (!label) {
      throw new Error(`Missing label for block${blockIndex}`);
    }
    return label;
  }

  private getAsmFrameType(frameType: FrameType): number {
    switch (frameType) {
      case FrameType.FULL:
        return Opcodes.F_FULL;
      case FrameType.SAME:
        return Opcodes.F_SAME;
      case FrameType.SAME1:
        return Opcodes.F_SAME1;
      case FrameType.APPEND:
        return Opcodes.F_APPEND;
      case FrameType.CHOP:
        return Opcodes.F_CHOP;
    }
  }
}

