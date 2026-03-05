import { Type, TypeSort } from '@blkswn/java-asm';
import type { MethodVisitor } from '@blkswn/java-asm';
import * as Opcodes from '@blkswn/java-asm';
import { ArrayLengthExpr } from '../../expr/ArrayLengthExpr';
import { ArrayLoadExpr } from '../../expr/ArrayLoadExpr';
import { ArithmeticExpr, ArithmeticOp } from '../../expr/ArithmeticExpr';
import { CastExpr, CastKind } from '../../expr/CastExpr';
import { ComparisonExpr, ComparisonOp } from '../../expr/ComparisonExpr';
import { ConstantExpr } from '../../expr/ConstantExpr';
import { DynamicInvocationExpr } from '../../expr/DynamicInvocationExpr';
import { Expr } from '../../expr/Expr';
import { FieldLoadExpr } from '../../expr/FieldLoadExpr';
import { InstanceOfExpr } from '../../expr/InstanceOfExpr';
import { NegationExpr } from '../../expr/NegationExpr';
import { NewArrayExpr } from '../../expr/NewArrayExpr';
import { NewExpr } from '../../expr/NewExpr';
import { PhiExpr } from '../../expr/PhiExpr';
import { StaticInvocationExpr } from '../../expr/StaticInvocationExpr';
import { VarExpr } from '../../expr/VarExpr';
import { VirtualInvocationExpr, VirtualInvocationKind } from '../../expr/VirtualInvocationExpr';
import { IRExpressionLocalBindings } from './IRExpressionLocalBindings';

/**
 * Emits JVM bytecode (via ASM MethodVisitor) for IR expressions.
 */
export class IRExpressionEmitter {
  constructor(
    private readonly mv: MethodVisitor,
    private readonly bindings: IRExpressionLocalBindings
  ) { }

  /**
   * Emits bytecode that leaves this expression's value on the operand stack.
   * Shared expressions (by object identity) are automatically cached into
   * synthetic locals and reloaded.
   */
  public emit(expr: Expr): void {
    const boundLocal = this.bindings.getOrAllocateLocal(expr);
    if (boundLocal !== null) {
      if (this.bindings.isMaterialized(expr)) {
        this.emitLoadLocal(expr.type, boundLocal);
        return;
      }

      // Materialize once: compute, store, then reload.
      this.emitUnbound(expr);
      this.emitStoreLocal(expr.type, boundLocal);
      this.bindings.markMaterialized(expr);
      this.emitLoadLocal(expr.type, boundLocal);
      return;
    }

    this.emitUnbound(expr);
  }

  private emitUnbound(expr: Expr): void {
    // Note: do not call expr.toString() here; compilation must be structural.
    if (expr instanceof VarExpr) {
      this.emitLoadLocal(expr.type, expr.index);
      return;
    }

    if (expr instanceof ConstantExpr) {
      this.emitConstant(expr);
      return;
    }

    if (expr instanceof ArithmeticExpr) {
      this.emit(expr.left);
      this.emit(expr.right);
      const baseOpcode = this.getArithmeticBaseOpcode(expr.op);
      const opcode = expr.type.getOpcode(baseOpcode);
      this.mv.visitInsn(opcode);
      return;
    }

    if (expr instanceof NegationExpr) {
      this.emit(expr.operand);
      const opcode = expr.type.getOpcode(Opcodes.INEG);
      this.mv.visitInsn(opcode);
      return;
    }

    if (expr instanceof ComparisonExpr) {
      this.emit(expr.left);
      this.emit(expr.right);
      this.mv.visitInsn(this.getComparisonOpcode(expr.op));
      return;
    }

    if (expr instanceof StaticInvocationExpr) {
      for (const arg of expr.args) {
        this.emit(arg);
      }
      // Note: StaticInvocationExpr does not currently carry isInterface; default false.
      this.mv.visitMethodInsn(Opcodes.INVOKESTATIC, expr.owner, expr.methodName, expr.methodDescriptor, false);
      return;
    }

    if (expr instanceof VirtualInvocationExpr) {
      this.emit(expr.receiver);
      for (const arg of expr.args) {
        this.emit(arg);
      }
      this.mv.visitMethodInsn(
        this.getVirtualInvokeOpcode(expr.kind),
        expr.owner,
        expr.methodName,
        expr.methodDescriptor,
        expr.isInterface
      );
      return;
    }

    if (expr instanceof DynamicInvocationExpr) {
      for (const arg of expr.args) {
        this.emit(arg);
      }
      this.mv.visitInvokeDynamicInsn(
        expr.methodName,
        expr.methodDescriptor,
        expr.bootstrapMethod,
        ...expr.bootstrapArgs
      );
      return;
    }

    if (expr instanceof FieldLoadExpr) {
      if (!expr.isStatic) {
        if (!expr.instance) {
          throw new Error('GETFIELD requires a non-null instance expression');
        }
        this.emit(expr.instance);
      }
      this.mv.visitFieldInsn(
        expr.isStatic ? Opcodes.GETSTATIC : Opcodes.GETFIELD,
        expr.owner,
        expr.fieldName,
        expr.fieldDescriptor
      );
      return;
    }

    if (expr instanceof ArrayLoadExpr) {
      this.emit(expr.array);
      this.emit(expr.index);
      const opcode = expr.type.getOpcode(Opcodes.IALOAD);
      this.mv.visitInsn(opcode);
      return;
    }

    if (expr instanceof ArrayLengthExpr) {
      this.emit(expr.array);
      this.mv.visitInsn(Opcodes.ARRAYLENGTH);
      return;
    }

    if (expr instanceof NewArrayExpr) {
      this.emitNewArray(expr);
      return;
    }

    if (expr instanceof CastExpr) {
      this.emit(expr.operand);
      if (expr.kind === CastKind.CHECKCAST) {
        this.mv.visitTypeInsn(Opcodes.CHECKCAST, expr.type.getInternalName());
      } else {
        this.mv.visitInsn(this.getPrimitiveCastOpcode(expr.fromType, expr.type));
      }
      return;
    }

    if (expr instanceof InstanceOfExpr) {
      this.emit(expr.operand);
      this.mv.visitTypeInsn(Opcodes.INSTANCEOF, expr.checkType.getInternalName());
      return;
    }

    if (expr instanceof NewExpr) {
      this.mv.visitTypeInsn(Opcodes.NEW, expr.type.getInternalName());
      return;
    }

    if (expr instanceof PhiExpr) {
      // NOTE: PhiExpr is a placeholder for a value coming from a control-flow merge.
      // A correct bytecode compiler would need to lower these to explicit stack/locals
      // across predecessors. For now we emit a conservative default value to keep
      // roundtrip compilation possible.
      this.emitDefaultValue(expr.type);
      return;
    }

    throw new Error(`Unsupported Expr for bytecode emission: ${expr.constructor.name}`);
  }

  private emitDefaultValue(type: Type): void {
    switch (type.getSort()) {
      case TypeSort.VOID:
        return; // nothing to push
      case TypeSort.LONG:
        this.mv.visitInsn(Opcodes.LCONST_0);
        return;
      case TypeSort.FLOAT:
        this.mv.visitInsn(Opcodes.FCONST_0);
        return;
      case TypeSort.DOUBLE:
        this.mv.visitInsn(Opcodes.DCONST_0);
        return;
      case TypeSort.OBJECT:
      case TypeSort.ARRAY:
        this.mv.visitInsn(Opcodes.ACONST_NULL);
        return;
      case TypeSort.BOOLEAN:
      case TypeSort.BYTE:
      case TypeSort.CHAR:
      case TypeSort.SHORT:
      case TypeSort.INT:
      default:
        this.mv.visitInsn(Opcodes.ICONST_0);
    }
  }

  private emitLoadLocal(type: Type, index: number): void {
    const opcode = type.getOpcode(Opcodes.ILOAD);
    this.mv.visitVarInsn(opcode, index);
  }

  private emitStoreLocal(type: Type, index: number): void {
    const opcode = type.getOpcode(Opcodes.ISTORE);
    this.mv.visitVarInsn(opcode, index);
  }

  private emitConstant(expr: ConstantExpr): void {
    const { value } = expr;

    if (value === null) {
      this.mv.visitInsn(Opcodes.ACONST_NULL);
      return;
    }

    // Prefer specialized const opcodes for a few common cases (especially to avoid LDC limitations).
    if (expr.type.getSort() === TypeSort.INT || expr.type.getSort() === TypeSort.BOOLEAN || expr.type.getSort() === TypeSort.BYTE || expr.type.getSort() === TypeSort.CHAR || expr.type.getSort() === TypeSort.SHORT) {
      const n = Number(value);
      if (n === -1) return void this.mv.visitInsn(Opcodes.ICONST_M1);
      if (n >= 0 && n <= 5) return void this.mv.visitInsn(Opcodes.ICONST_0 + n);
      if (n >= -128 && n <= 127) return void this.mv.visitIntInsn(Opcodes.BIPUSH, n);
      if (n >= -32768 && n <= 32767) return void this.mv.visitIntInsn(Opcodes.SIPUSH, n);
      this.mv.visitLdcInsn(n);
      return;
    }

    if (expr.type.getSort() === TypeSort.LONG) {
      const n = typeof value === 'bigint' ? value : BigInt(Number(value));
      if (n === 0n) return void this.mv.visitInsn(Opcodes.LCONST_0);
      if (n === 1n) return void this.mv.visitInsn(Opcodes.LCONST_1);
      this.mv.visitLdcInsn(n);
      return;
    }

    if (expr.type.getSort() === TypeSort.FLOAT) {
      const n = Number(value);
      if (n === 0) return void this.mv.visitInsn(Opcodes.FCONST_0);
      if (n === 1) return void this.mv.visitInsn(Opcodes.FCONST_1);
      if (n === 2) return void this.mv.visitInsn(Opcodes.FCONST_2);
      this.mv.visitLdcInsn(n);
      return;
    }

    if (expr.type.getSort() === TypeSort.DOUBLE) {
      const n = Number(value);
      if (n === 0) return void this.mv.visitInsn(Opcodes.DCONST_0);
      if (n === 1) return void this.mv.visitInsn(Opcodes.DCONST_1);
      // NOTE: java-asm-ts currently treats raw numbers as float constants in LDC.
      // For now, fall back to LDC of the number (may not round-trip perfectly).
      this.mv.visitLdcInsn(n);
      return;
    }

    // Strings, Type, Handle, ConstantDynamic, etc.
    this.mv.visitLdcInsn(value);
  }

  private emitNewArray(expr: NewArrayExpr): void {
    // Push dimensions in order.
    for (const dim of expr.dimensions) {
      this.emit(dim);
    }

    if (expr.dimensions.length > 1) {
      // MULTIANEWARRAY uses the full array descriptor.
      this.mv.visitMultiANewArrayInsn(expr.type.getDescriptor(), expr.dimensions.length);
      return;
    }

    // Single dimension.
    const elementSort = expr.elementType.getSort();
    switch (elementSort) {
      case TypeSort.BOOLEAN:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_BOOLEAN);
        return;
      case TypeSort.CHAR:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_CHAR);
        return;
      case TypeSort.BYTE:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_BYTE);
        return;
      case TypeSort.SHORT:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_SHORT);
        return;
      case TypeSort.INT:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_INT);
        return;
      case TypeSort.FLOAT:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_FLOAT);
        return;
      case TypeSort.LONG:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_LONG);
        return;
      case TypeSort.DOUBLE:
        this.mv.visitIntInsn(Opcodes.NEWARRAY, Opcodes.T_DOUBLE);
        return;
      default:
        // Reference (object or array) element.
        this.mv.visitTypeInsn(Opcodes.ANEWARRAY, expr.elementType.getInternalName());
    }
  }

  private getArithmeticBaseOpcode(op: ArithmeticOp): number {
    switch (op) {
      case ArithmeticOp.ADD:
        return Opcodes.IADD;
      case ArithmeticOp.SUB:
        return Opcodes.ISUB;
      case ArithmeticOp.MUL:
        return Opcodes.IMUL;
      case ArithmeticOp.DIV:
        return Opcodes.IDIV;
      case ArithmeticOp.REM:
        return Opcodes.IREM;
      case ArithmeticOp.SHL:
        return Opcodes.ISHL;
      case ArithmeticOp.SHR:
        return Opcodes.ISHR;
      case ArithmeticOp.USHR:
        return Opcodes.IUSHR;
      case ArithmeticOp.AND:
        return Opcodes.IAND;
      case ArithmeticOp.OR:
        return Opcodes.IOR;
      case ArithmeticOp.XOR:
        return Opcodes.IXOR;
    }
  }

  private getComparisonOpcode(op: ComparisonOp): number {
    switch (op) {
      case ComparisonOp.LCMP:
        return Opcodes.LCMP;
      case ComparisonOp.FCMPL:
        return Opcodes.FCMPL;
      case ComparisonOp.FCMPG:
        return Opcodes.FCMPG;
      case ComparisonOp.DCMPL:
        return Opcodes.DCMPL;
      case ComparisonOp.DCMPG:
        return Opcodes.DCMPG;
    }
  }

  private getVirtualInvokeOpcode(kind: VirtualInvocationKind): number {
    switch (kind) {
      case VirtualInvocationKind.VIRTUAL:
        return Opcodes.INVOKEVIRTUAL;
      case VirtualInvocationKind.SPECIAL:
        return Opcodes.INVOKESPECIAL;
      case VirtualInvocationKind.INTERFACE:
        return Opcodes.INVOKEINTERFACE;
    }
  }

  private getPrimitiveCastOpcode(fromType: Type, toType: Type): number {
    const from = fromType.getSort();
    const to = toType.getSort();

    // int -> *
    if (from === TypeSort.INT || from === TypeSort.BOOLEAN || from === TypeSort.BYTE || from === TypeSort.CHAR || from === TypeSort.SHORT) {
      if (to === TypeSort.LONG) return Opcodes.I2L;
      if (to === TypeSort.FLOAT) return Opcodes.I2F;
      if (to === TypeSort.DOUBLE) return Opcodes.I2D;
      if (to === TypeSort.BYTE) return Opcodes.I2B;
      if (to === TypeSort.CHAR) return Opcodes.I2C;
      if (to === TypeSort.SHORT) return Opcodes.I2S;
    }

    // long -> *
    if (from === TypeSort.LONG) {
      if (to === TypeSort.INT) return Opcodes.L2I;
      if (to === TypeSort.FLOAT) return Opcodes.L2F;
      if (to === TypeSort.DOUBLE) return Opcodes.L2D;
    }

    // float -> *
    if (from === TypeSort.FLOAT) {
      if (to === TypeSort.INT) return Opcodes.F2I;
      if (to === TypeSort.LONG) return Opcodes.F2L;
      if (to === TypeSort.DOUBLE) return Opcodes.F2D;
    }

    // double -> *
    if (from === TypeSort.DOUBLE) {
      if (to === TypeSort.INT) return Opcodes.D2I;
      if (to === TypeSort.LONG) return Opcodes.D2L;
      if (to === TypeSort.FLOAT) return Opcodes.D2F;
    }

    throw new Error(`Unsupported primitive cast: ${fromType.getDescriptor()} -> ${toType.getDescriptor()}`);
  }
}

