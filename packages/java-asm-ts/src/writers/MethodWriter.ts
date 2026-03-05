import { ByteVector } from '../core/ByteVector';
import { MethodVisitor } from '../visitors/MethodVisitor';
import { AnnotationVisitor } from '../visitors/AnnotationVisitor';
import { Attribute } from '../attributes/Attribute';
import { SymbolTable } from '../core/SymbolTable';
import { Label } from '../core/Label';
import { Handle } from '../core/Handle';
import { Type } from '../core/Type';
import { ASM9, ACC_DEPRECATED, ACC_SYNTHETIC, ACC_STATIC } from '../core/Opcodes';
import * as Opcodes from '../core/Opcodes';
import { AnnotationWriter } from './AnnotationWriter';
import { InsnWriter } from './instructions/InsnWriter';
import { IntInsnWriter } from './instructions/IntInsnWriter';
import { VarInsnWriter } from './instructions/VarInsnWriter';
import { TypeInsnWriter } from './instructions/TypeInsnWriter';
import { FieldInsnWriter } from './instructions/FieldInsnWriter';
import { MethodInsnWriter } from './instructions/MethodInsnWriter';
import { InvokeDynamicInsnWriter } from './instructions/InvokeDynamicInsnWriter';
import { JumpInsnWriter } from './instructions/JumpInsnWriter';
import { LdcInsnWriter } from './instructions/LdcInsnWriter';
import { IincInsnWriter } from './instructions/IincInsnWriter';
import { TableSwitchInsnWriter } from './instructions/TableSwitchInsnWriter';
import { LookupSwitchInsnWriter } from './instructions/LookupSwitchInsnWriter';
import { MultiANewArrayInsnWriter } from './instructions/MultiANewArrayInsnWriter';
import { COMPUTE_MAXS } from './ClassWriter';

/**
 * A MethodVisitor that generates the corresponding method_info structure.
 */
export class MethodWriter extends MethodVisitor {
  /** Next method writer in the chain. */
  nextMethodWriter: MethodWriter | null = null;

  /** The symbol table. */
  private readonly symbolTable: SymbolTable;

  /** Access flags. */
  private readonly accessFlags: number;

  /** Name index. */
  private readonly nameIndex: number;

  /** Descriptor. */
  private readonly descriptor: string;

  /** Descriptor index. */
  private readonly descriptorIndex: number;

  /** Signature index. */
  private signatureIndex: number = 0;

  /** Exceptions. */
  private readonly exceptionsIndex: number[] = [];

  /** Compute flags. */
  private readonly computeFlags: number;

  /** The bytecode. */
  private readonly code: ByteVector;

  /** Max stack (if not computed). */
  private maxStack: number = 0;

  /** Max locals (if not computed). */
  private maxLocals: number = 0;

  /** Current stack size. */
  private currentStackSize: number = 0;

  /** Max stack size seen so far. */
  private maxStackSize: number = 0;

  /** Number of local variables used. */
  private currentLocals: number = 0;

  /** Exception table. */
  private readonly exceptionTable: ByteVector;

  /** Exception table count. */
  private exceptionTableCount: number = 0;

  /** Code attributes count. */
  private codeAttributeCount: number = 0;

  /** Line number table. */
  private lineNumberTable: ByteVector | null = null;

  /** Line number table count. */
  private lineNumberTableCount: number = 0;

  /** Local variable table. */
  private localVariableTable: ByteVector | null = null;

  /** Local variable table count. */
  private localVariableTableCount: number = 0;

  /** Stack map table. */
  private stackMapTable: ByteVector | null = null;

  /** Runtime visible annotations. */
  private runtimeVisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible annotations. */
  private runtimeInvisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime visible parameter annotations. */
  private runtimeVisibleParameterAnnotations: AnnotationWriter[] | null = null;

  /** Runtime invisible parameter annotations. */
  private runtimeInvisibleParameterAnnotations: AnnotationWriter[] | null = null;

  /** Annotation default. */
  private annotationDefault: ByteVector | null = null;

  /** Method parameters. */
  private parameters: ByteVector | null = null;

  /** Method parameters count. */
  private parametersCount: number = 0;

  /** Visible annotable parameter count. */
  private visibleAnnotableParameterCount: number = 0;

  /** Invisible annotable parameter count. */
  private invisibleAnnotableParameterCount: number = 0;

  /** Other attributes. */
  private firstAttribute: Attribute | null = null;

  /** First label. */
  private firstLabel: Label | null = null;

  /** Last label. */
  private lastLabel: Label | null = null;

  /** Current bytecode offset. */
  private currentBytecodeOffset: number = 0;

  /** Whether code has been visited. */
  private hasCode: boolean = false;

  /**
   * Constructs a new MethodWriter.
   */
  constructor(
    symbolTable: SymbolTable,
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: string[] | null,
    computeFlags: number
  ) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.accessFlags = access;
    this.nameIndex = symbolTable.addConstantUtf8(name);
    this.descriptor = descriptor;
    this.descriptorIndex = symbolTable.addConstantUtf8(descriptor);
    this.computeFlags = computeFlags;
    this.code = new ByteVector();
    this.exceptionTable = new ByteVector();

    if (signature !== null) {
      this.signatureIndex = symbolTable.addConstantUtf8(signature);
    }

    if (exceptions !== null) {
      for (const exception of exceptions) {
        this.exceptionsIndex.push(symbolTable.addConstantClass(exception).index);
      }
    }

    // Initialize max locals from method descriptor
    this.initializeMaxLocals(access, descriptor);
  }

  private initializeMaxLocals(access: number, descriptor: string): void {
    // Start with 'this' if not static
    let locals = (access & ACC_STATIC) === 0 ? 1 : 0;
    
    // Add parameter slots
    const argumentsAndReturnSizes = Type.getArgumentsAndReturnSizes(descriptor);
    locals += argumentsAndReturnSizes >> 2;
    if ((access & ACC_STATIC) === 0) {
      locals--; // Adjust for receiver already counted
    }
    
    this.currentLocals = locals;
    this.maxLocals = locals;
  }

  override visitParameter(name: string | null, access: number): void {
    if (this.parameters === null) {
      this.parameters = new ByteVector();
    }
    this.parametersCount++;
    this.parameters.putShort(name === null ? 0 : this.symbolTable.addConstantUtf8(name));
    this.parameters.putShort(access);
  }

  override visitAnnotationDefault(): AnnotationVisitor | null {
    this.annotationDefault = new ByteVector();
    return new AnnotationDefaultWriter(this.symbolTable, this.annotationDefault);
  }

  override visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    const annotationWriter = AnnotationWriter.create(this.symbolTable, descriptor);
    if (visible) {
      annotationWriter.nextAnnotation = this.runtimeVisibleAnnotations;
      this.runtimeVisibleAnnotations = annotationWriter;
    } else {
      annotationWriter.nextAnnotation = this.runtimeInvisibleAnnotations;
      this.runtimeInvisibleAnnotations = annotationWriter;
    }
    return annotationWriter;
  }

  override visitAnnotableParameterCount(parameterCount: number, visible: boolean): void {
    if (visible) {
      this.visibleAnnotableParameterCount = parameterCount;
      this.runtimeVisibleParameterAnnotations = new Array(parameterCount).fill(null);
    } else {
      this.invisibleAnnotableParameterCount = parameterCount;
      this.runtimeInvisibleParameterAnnotations = new Array(parameterCount).fill(null);
    }
  }

  override visitParameterAnnotation(
    parameter: number,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    const annotationWriter = AnnotationWriter.create(this.symbolTable, descriptor);
    if (visible) {
      if (this.runtimeVisibleParameterAnnotations === null) {
        this.runtimeVisibleParameterAnnotations = [];
      }
      annotationWriter.nextAnnotation = this.runtimeVisibleParameterAnnotations[parameter] ?? null;
      this.runtimeVisibleParameterAnnotations[parameter] = annotationWriter;
    } else {
      if (this.runtimeInvisibleParameterAnnotations === null) {
        this.runtimeInvisibleParameterAnnotations = [];
      }
      annotationWriter.nextAnnotation = this.runtimeInvisibleParameterAnnotations[parameter] ?? null;
      this.runtimeInvisibleParameterAnnotations[parameter] = annotationWriter;
    }
    return annotationWriter;
  }

  override visitAttribute(attribute: Attribute): void {
    if (attribute.isCodeAttribute()) {
      attribute.nextAttribute = this.firstAttribute;
      this.firstAttribute = attribute;
    } else {
      attribute.nextAttribute = this.firstAttribute;
      this.firstAttribute = attribute;
    }
  }

  override visitCode(): void {
    this.hasCode = true;
  }

  override visitFrame(
    type: number,
    numLocal: number,
    local: Array<string | number | Label | null> | null,
    numStack: number,
    stack: Array<string | number | Label | null> | null
  ): void {
    // Frame writing would go here - simplified for now
  }

  override visitInsn(opcode: number): void {
    InsnWriter.writeInsn(this.code, opcode);
    this.currentBytecodeOffset++;
    this.updateStackSize(opcode);
  }

  override visitIntInsn(opcode: number, operand: number): void {
    IntInsnWriter.writeIntInsn(this.code, opcode, operand);
    this.currentBytecodeOffset += IntInsnWriter.getInsnSize(opcode);
    this.updateStackSizeInt(opcode, operand);
  }

  override visitVarInsn(opcode: number, varIndex: number): void {
    VarInsnWriter.writeVarInsn(this.code, opcode, varIndex);
    this.currentBytecodeOffset += VarInsnWriter.getInsnSize(opcode, varIndex);
    this.updateStackSizeVar(opcode, varIndex);
  }

  override visitTypeInsn(opcode: number, type: string): void {
    TypeInsnWriter.writeTypeInsn(this.code, opcode, type, this.symbolTable);
    this.currentBytecodeOffset += 3;
    this.updateStackSizeType(opcode);
  }

  override visitFieldInsn(opcode: number, owner: string, name: string, descriptor: string): void {
    FieldInsnWriter.writeFieldInsn(this.code, opcode, owner, name, descriptor, this.symbolTable);
    this.currentBytecodeOffset += 3;
    this.updateStackSizeField(opcode, descriptor);
  }

  override visitMethodInsn(
    opcode: number,
    owner: string,
    name: string,
    descriptor: string,
    isInterface: boolean
  ): void {
    MethodInsnWriter.writeMethodInsn(
      this.code,
      opcode,
      owner,
      name,
      descriptor,
      isInterface,
      this.symbolTable
    );
    this.currentBytecodeOffset += MethodInsnWriter.getInsnSize(opcode);
    this.updateStackSizeMethod(opcode, descriptor);
  }

  override visitInvokeDynamicInsn(
    name: string,
    descriptor: string,
    bootstrapMethodHandle: Handle,
    ...bootstrapMethodArguments: unknown[]
  ): void {
    InvokeDynamicInsnWriter.writeInvokeDynamicInsn(
      this.code,
      name,
      descriptor,
      bootstrapMethodHandle,
      bootstrapMethodArguments,
      this.symbolTable
    );
    this.currentBytecodeOffset += 5;
    this.updateStackSizeMethod(Opcodes.INVOKEDYNAMIC, descriptor);
  }

  override visitJumpInsn(opcode: number, label: Label): void {
    JumpInsnWriter.writeJumpInsn(this.code, opcode, label, this.currentBytecodeOffset);
    this.currentBytecodeOffset += 3;
    this.updateStackSizeJump(opcode);
  }

  override visitLabel(label: Label): void {
    // Resolve the label offset and patch any forward references written so far.
    // This makes forward jumps (and switch targets) work in a single-pass write.
    label.resolve(this.code.data, this.stackMapTable, this.currentBytecodeOffset);
    if (this.lastLabel !== null) {
      this.lastLabel.nextBasicBlock = label;
    }
    this.lastLabel = label;
    if (this.firstLabel === null) {
      this.firstLabel = label;
    }
  }

  override visitLdcInsn(value: unknown): void {
    LdcInsnWriter.writeLdcInsn(this.code, value, this.symbolTable);
    // Size varies based on constant type and pool index
    if (typeof value === 'bigint' || (typeof value === 'number' && !Number.isInteger(value))) {
      this.currentBytecodeOffset += 3;
      this.currentStackSize += 2;
    } else {
      this.currentBytecodeOffset += 2;
      this.currentStackSize += 1;
    }
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  override visitIincInsn(varIndex: number, increment: number): void {
    IincInsnWriter.writeIincInsn(this.code, varIndex, increment);
    this.currentBytecodeOffset += IincInsnWriter.getInsnSize(varIndex, increment);
    // IINC doesn't change stack
  }

  override visitTableSwitchInsn(min: number, max: number, dflt: Label, ...labels: Label[]): void {
    TableSwitchInsnWriter.writeTableSwitchInsn(
      this.code,
      min,
      max,
      dflt,
      labels,
      this.currentBytecodeOffset
    );
    this.currentBytecodeOffset += TableSwitchInsnWriter.getInsnSize(
      this.currentBytecodeOffset,
      min,
      max
    );
    this.currentStackSize--; // Pops the key
  }

  override visitLookupSwitchInsn(dflt: Label, keys: number[], labels: Label[]): void {
    LookupSwitchInsnWriter.writeLookupSwitchInsn(
      this.code,
      dflt,
      keys,
      labels,
      this.currentBytecodeOffset
    );
    this.currentBytecodeOffset += LookupSwitchInsnWriter.getInsnSize(
      this.currentBytecodeOffset,
      keys.length
    );
    this.currentStackSize--; // Pops the key
  }

  override visitMultiANewArrayInsn(descriptor: string, numDimensions: number): void {
    MultiANewArrayInsnWriter.writeMultiANewArrayInsn(
      this.code,
      descriptor,
      numDimensions,
      this.symbolTable
    );
    this.currentBytecodeOffset += 4;
    this.currentStackSize -= numDimensions - 1; // Pops n dimensions, pushes array
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  override visitTryCatchBlock(
    start: Label,
    end: Label,
    handler: Label,
    type: string | null
  ): void {
    this.exceptionTableCount++;
    this.exceptionTable.putShort(start.bytecodeOffset);
    this.exceptionTable.putShort(end.bytecodeOffset);
    this.exceptionTable.putShort(handler.bytecodeOffset);
    this.exceptionTable.putShort(type === null ? 0 : this.symbolTable.addConstantClass(type).index);
  }

  override visitLocalVariable(
    name: string,
    descriptor: string,
    signature: string | null,
    start: Label,
    end: Label,
    index: number
  ): void {
    if (this.localVariableTable === null) {
      this.localVariableTable = new ByteVector();
    }
    this.localVariableTableCount++;
    this.localVariableTable.putShort(start.bytecodeOffset);
    this.localVariableTable.putShort(end.bytecodeOffset - start.bytecodeOffset);
    this.localVariableTable.putShort(this.symbolTable.addConstantUtf8(name));
    this.localVariableTable.putShort(this.symbolTable.addConstantUtf8(descriptor));
    this.localVariableTable.putShort(index);
  }

  override visitLineNumber(line: number, start: Label): void {
    if (this.lineNumberTable === null) {
      this.lineNumberTable = new ByteVector();
    }
    this.lineNumberTableCount++;
    this.lineNumberTable.putShort(start.bytecodeOffset);
    this.lineNumberTable.putShort(line);
  }

  override visitMaxs(maxStack: number, maxLocals: number): void {
    if ((this.computeFlags & COMPUTE_MAXS) !== 0) {
      this.maxStack = this.maxStackSize;
      this.maxLocals = Math.max(this.maxLocals, this.currentLocals);
    } else {
      this.maxStack = maxStack;
      this.maxLocals = maxLocals;
    }
  }

  override visitEnd(): void {
    // Nothing to do
  }

  // Stack size tracking helpers
  private updateStackSize(opcode: number): void {
    const stackChange = this.getStackChange(opcode);
    this.currentStackSize += stackChange;
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  private updateStackSizeInt(opcode: number, operand: number): void {
    if (opcode === Opcodes.BIPUSH || opcode === Opcodes.SIPUSH) {
      this.currentStackSize++;
    } else if (opcode === Opcodes.NEWARRAY) {
      // Stack unchanged (pop int, push array)
    }
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  private updateStackSizeVar(opcode: number, varIndex: number): void {
    // Update max locals
    let slots = 1;
    if (opcode === Opcodes.LLOAD || opcode === Opcodes.DLOAD ||
        opcode === Opcodes.LSTORE || opcode === Opcodes.DSTORE) {
      slots = 2;
    }
    this.maxLocals = Math.max(this.maxLocals, varIndex + slots);

    // Update stack
    if (opcode >= Opcodes.ILOAD && opcode <= Opcodes.ALOAD) {
      this.currentStackSize++;
      if (opcode === Opcodes.LLOAD || opcode === Opcodes.DLOAD) {
        this.currentStackSize++;
      }
    } else if (opcode >= Opcodes.ISTORE && opcode <= Opcodes.ASTORE) {
      this.currentStackSize--;
      if (opcode === Opcodes.LSTORE || opcode === Opcodes.DSTORE) {
        this.currentStackSize--;
      }
    }
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  private updateStackSizeType(opcode: number): void {
    if (opcode === Opcodes.NEW) {
      this.currentStackSize++;
    } else if (opcode === Opcodes.ANEWARRAY) {
      // Stack unchanged
    }
    // CHECKCAST and INSTANCEOF don't change stack size
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  private updateStackSizeField(opcode: number, descriptor: string): void {
    const size = descriptor === 'J' || descriptor === 'D' ? 2 : 1;
    if (opcode === Opcodes.GETSTATIC) {
      this.currentStackSize += size;
    } else if (opcode === Opcodes.PUTSTATIC) {
      this.currentStackSize -= size;
    } else if (opcode === Opcodes.GETFIELD) {
      this.currentStackSize += size - 1; // Pop objectref, push value
    } else if (opcode === Opcodes.PUTFIELD) {
      this.currentStackSize -= size + 1; // Pop value and objectref
    }
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  private updateStackSizeMethod(opcode: number, descriptor: string): void {
    const argumentsAndReturnSizes = Type.getArgumentsAndReturnSizes(descriptor);
    const argSize = (argumentsAndReturnSizes >> 2) - 1; // Subtract 1 for receiver slot adjustment
    const returnSize = argumentsAndReturnSizes & 0x03;

    if (opcode === Opcodes.INVOKESTATIC || opcode === Opcodes.INVOKEDYNAMIC) {
      this.currentStackSize -= argSize;
    } else {
      this.currentStackSize -= argSize + 1; // Include objectref
    }
    this.currentStackSize += returnSize;
    this.maxStackSize = Math.max(this.maxStackSize, this.currentStackSize);
  }

  private updateStackSizeJump(opcode: number): void {
    if (opcode >= Opcodes.IFEQ && opcode <= Opcodes.IFLE) {
      this.currentStackSize--;
    } else if (opcode >= Opcodes.IF_ICMPEQ && opcode <= Opcodes.IF_ACMPNE) {
      this.currentStackSize -= 2;
    } else if (opcode === Opcodes.IFNULL || opcode === Opcodes.IFNONNULL) {
      this.currentStackSize--;
    }
    // GOTO doesn't change stack
  }

  private getStackChange(opcode: number): number {
    // Simplified stack change calculation
    switch (opcode) {
      case Opcodes.NOP:
      case Opcodes.SWAP:
        return 0;
      case Opcodes.ACONST_NULL:
      case Opcodes.ICONST_M1:
      case Opcodes.ICONST_0:
      case Opcodes.ICONST_1:
      case Opcodes.ICONST_2:
      case Opcodes.ICONST_3:
      case Opcodes.ICONST_4:
      case Opcodes.ICONST_5:
      case Opcodes.FCONST_0:
      case Opcodes.FCONST_1:
      case Opcodes.FCONST_2:
      case Opcodes.DUP:
      case Opcodes.DUP_X1:
      case Opcodes.DUP_X2:
        return 1;
      case Opcodes.LCONST_0:
      case Opcodes.LCONST_1:
      case Opcodes.DCONST_0:
      case Opcodes.DCONST_1:
      case Opcodes.DUP2:
      case Opcodes.DUP2_X1:
      case Opcodes.DUP2_X2:
        return 2;
      case Opcodes.POP:
      case Opcodes.IADD:
      case Opcodes.FADD:
      case Opcodes.ISUB:
      case Opcodes.FSUB:
      case Opcodes.IMUL:
      case Opcodes.FMUL:
      case Opcodes.IDIV:
      case Opcodes.FDIV:
      case Opcodes.IREM:
      case Opcodes.FREM:
      case Opcodes.ISHL:
      case Opcodes.ISHR:
      case Opcodes.IUSHR:
      case Opcodes.IAND:
      case Opcodes.IOR:
      case Opcodes.IXOR:
      case Opcodes.L2I:
      case Opcodes.L2F:
      case Opcodes.D2I:
      case Opcodes.D2F:
      case Opcodes.FCMPL:
      case Opcodes.FCMPG:
      case Opcodes.IALOAD:
      case Opcodes.FALOAD:
      case Opcodes.AALOAD:
      case Opcodes.BALOAD:
      case Opcodes.CALOAD:
      case Opcodes.SALOAD:
      case Opcodes.ARRAYLENGTH:
      case Opcodes.MONITORENTER:
      case Opcodes.MONITOREXIT:
      case Opcodes.ATHROW:
        return -1;
      case Opcodes.POP2:
      case Opcodes.LADD:
      case Opcodes.DADD:
      case Opcodes.LSUB:
      case Opcodes.DSUB:
      case Opcodes.LMUL:
      case Opcodes.DMUL:
      case Opcodes.LDIV:
      case Opcodes.DDIV:
      case Opcodes.LREM:
      case Opcodes.DREM:
      case Opcodes.LSHL:
      case Opcodes.LSHR:
      case Opcodes.LUSHR:
      case Opcodes.LAND:
      case Opcodes.LOR:
      case Opcodes.LXOR:
      case Opcodes.LALOAD:
      case Opcodes.DALOAD:
        return -2;
      case Opcodes.IASTORE:
      case Opcodes.FASTORE:
      case Opcodes.AASTORE:
      case Opcodes.BASTORE:
      case Opcodes.CASTORE:
      case Opcodes.SASTORE:
      case Opcodes.LCMP:
      case Opcodes.DCMPL:
      case Opcodes.DCMPG:
        return -3;
      case Opcodes.LASTORE:
      case Opcodes.DASTORE:
        return -4;
      case Opcodes.I2L:
      case Opcodes.I2D:
      case Opcodes.F2L:
      case Opcodes.F2D:
        return 1;
      case Opcodes.RETURN:
        return 0;
      case Opcodes.IRETURN:
      case Opcodes.FRETURN:
      case Opcodes.ARETURN:
        return -1;
      case Opcodes.LRETURN:
      case Opcodes.DRETURN:
        return -2;
      default:
        return 0;
    }
  }

  /**
   * Computes the size of the method_info structure.
   */
  computeMethodInfoSize(): number {
    let size = 8; // access_flags + name_index + descriptor_index + attributes_count

    if (this.hasCode) {
      this.symbolTable.addConstantUtf8('Code');
      // attribute_name_index + attribute_length + max_stack + max_locals + code_length
      size += 18;
      size += this.code.length;
      // exception_table_length + exception_table
      size += 2 + this.exceptionTableCount * 8;
      // Code attributes count
      size += 2;

      // LineNumberTable
      if (this.lineNumberTable !== null) {
        this.symbolTable.addConstantUtf8('LineNumberTable');
        size += 8 + this.lineNumberTable.length;
      }

      // LocalVariableTable
      if (this.localVariableTable !== null) {
        this.symbolTable.addConstantUtf8('LocalVariableTable');
        size += 8 + this.localVariableTable.length;
      }
    }

    if (this.exceptionsIndex.length > 0) {
      this.symbolTable.addConstantUtf8('Exceptions');
      size += 8 + 2 * this.exceptionsIndex.length;
    }

    if (this.signatureIndex !== 0) {
      this.symbolTable.addConstantUtf8('Signature');
      size += 8;
    }

    if ((this.accessFlags & ACC_DEPRECATED) !== 0) {
      this.symbolTable.addConstantUtf8('Deprecated');
      size += 6;
    }

    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) {
      this.symbolTable.addConstantUtf8('Synthetic');
      size += 6;
    }

    if (this.parameters !== null) {
      this.symbolTable.addConstantUtf8('MethodParameters');
      size += 7 + this.parameters.length;
    }

    if (this.annotationDefault !== null) {
      this.symbolTable.addConstantUtf8('AnnotationDefault');
      size += 6 + this.annotationDefault.length;
    }

    if (this.runtimeVisibleAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeVisibleAnnotations');
      size += 8 + this.runtimeVisibleAnnotations.computeAnnotationsSize();
    }

    if (this.runtimeInvisibleAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeInvisibleAnnotations');
      size += 8 + this.runtimeInvisibleAnnotations.computeAnnotationsSize();
    }

    return size;
  }

  /**
   * Writes the method_info structure.
   */
  putMethodInfo(output: ByteVector): void {
    const accessMask = ACC_DEPRECATED | ACC_SYNTHETIC;
    output.putShort(this.accessFlags & ~accessMask);
    output.putShort(this.nameIndex);
    output.putShort(this.descriptorIndex);

    // Count attributes
    let attributeCount = 0;
    if (this.hasCode) attributeCount++;
    if (this.exceptionsIndex.length > 0) attributeCount++;
    if (this.signatureIndex !== 0) attributeCount++;
    if ((this.accessFlags & ACC_DEPRECATED) !== 0) attributeCount++;
    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) attributeCount++;
    if (this.parameters !== null) attributeCount++;
    if (this.annotationDefault !== null) attributeCount++;
    if (this.runtimeVisibleAnnotations !== null) attributeCount++;
    if (this.runtimeInvisibleAnnotations !== null) attributeCount++;

    output.putShort(attributeCount);

    // Write Code attribute
    if (this.hasCode) {
      let codeAttributeCount = 0;
      if (this.lineNumberTable !== null) codeAttributeCount++;
      if (this.localVariableTable !== null) codeAttributeCount++;

      const codeAttributeLength =
        12 +
        this.code.length +
        this.exceptionTableCount * 8 +
        (this.lineNumberTable !== null ? 8 + this.lineNumberTable.length : 0) +
        (this.localVariableTable !== null ? 8 + this.localVariableTable.length : 0);

      output.putShort(this.symbolTable.addConstantUtf8('Code'));
      output.putInt(codeAttributeLength);
      output.putShort(this.maxStack);
      output.putShort(this.maxLocals);
      output.putInt(this.code.length);
      output.putByteArray(this.code.data, 0, this.code.length);
      output.putShort(this.exceptionTableCount);
      output.putByteArray(this.exceptionTable.data, 0, this.exceptionTable.length);
      output.putShort(codeAttributeCount);

      if (this.lineNumberTable !== null) {
        output.putShort(this.symbolTable.addConstantUtf8('LineNumberTable'));
        output.putInt(2 + this.lineNumberTable.length);
        output.putShort(this.lineNumberTableCount);
        output.putByteArray(this.lineNumberTable.data, 0, this.lineNumberTable.length);
      }

      if (this.localVariableTable !== null) {
        output.putShort(this.symbolTable.addConstantUtf8('LocalVariableTable'));
        output.putInt(2 + this.localVariableTable.length);
        output.putShort(this.localVariableTableCount);
        output.putByteArray(this.localVariableTable.data, 0, this.localVariableTable.length);
      }
    }

    // Write Exceptions attribute
    if (this.exceptionsIndex.length > 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Exceptions'));
      output.putInt(2 + 2 * this.exceptionsIndex.length);
      output.putShort(this.exceptionsIndex.length);
      for (const index of this.exceptionsIndex) {
        output.putShort(index);
      }
    }

    // Write Signature attribute
    if (this.signatureIndex !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Signature'));
      output.putInt(2);
      output.putShort(this.signatureIndex);
    }

    // Write Deprecated attribute
    if ((this.accessFlags & ACC_DEPRECATED) !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Deprecated'));
      output.putInt(0);
    }

    // Write Synthetic attribute
    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Synthetic'));
      output.putInt(0);
    }

    // Write MethodParameters attribute
    if (this.parameters !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('MethodParameters'));
      output.putInt(1 + this.parameters.length);
      output.putByte(this.parametersCount);
      output.putByteArray(this.parameters.data, 0, this.parameters.length);
    }

    // Write AnnotationDefault attribute
    if (this.annotationDefault !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('AnnotationDefault'));
      output.putInt(this.annotationDefault.length);
      output.putByteArray(this.annotationDefault.data, 0, this.annotationDefault.length);
    }

    // Write RuntimeVisibleAnnotations attribute
    if (this.runtimeVisibleAnnotations !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('RuntimeVisibleAnnotations'));
      this.runtimeVisibleAnnotations.putAnnotations(this.symbolTable, output);
    }

    // Write RuntimeInvisibleAnnotations attribute
    if (this.runtimeInvisibleAnnotations !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('RuntimeInvisibleAnnotations'));
      this.runtimeInvisibleAnnotations.putAnnotations(this.symbolTable, output);
    }
  }
}

/**
 * AnnotationVisitor for annotation default values.
 */
class AnnotationDefaultWriter extends AnnotationVisitor {
  private readonly symbolTable: SymbolTable;
  private readonly output: ByteVector;

  constructor(symbolTable: SymbolTable, output: ByteVector) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.output = output;
  }

  override visit(name: string | null, value: unknown): void {
    this.writeElementValue(value);
  }

  override visitEnum(name: string | null, descriptor: string, value: string): void {
    this.output.putByte('e'.charCodeAt(0));
    this.output.putShort(this.symbolTable.addConstantUtf8(descriptor));
    this.output.putShort(this.symbolTable.addConstantUtf8(value));
  }

  override visitAnnotation(name: string | null, descriptor: string): AnnotationVisitor | null {
    this.output.putByte('@'.charCodeAt(0));
    return AnnotationWriter.create(this.symbolTable, descriptor);
  }

  override visitArray(name: string | null): AnnotationVisitor | null {
    this.output.putByte('['.charCodeAt(0));
    this.output.putShort(0); // Placeholder
    return new AnnotationDefaultWriter(this.symbolTable, this.output);
  }

  override visitEnd(): void {
    // Nothing to do
  }

  private writeElementValue(value: unknown): void {
    if (typeof value === 'boolean') {
      this.output.putByte('Z'.charCodeAt(0));
      this.output.putShort(this.symbolTable.addConstantInteger(value ? 1 : 0).index);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        this.output.putByte('I'.charCodeAt(0));
        this.output.putShort(this.symbolTable.addConstantInteger(value).index);
      } else {
        this.output.putByte('D'.charCodeAt(0));
        this.output.putShort(this.symbolTable.addConstantDouble(value).index);
      }
    } else if (typeof value === 'bigint') {
      this.output.putByte('J'.charCodeAt(0));
      this.output.putShort(this.symbolTable.addConstantLong(value).index);
    } else if (typeof value === 'string') {
      this.output.putByte('s'.charCodeAt(0));
      this.output.putShort(this.symbolTable.addConstantUtf8(value));
    } else if (value instanceof Type) {
      this.output.putByte('c'.charCodeAt(0));
      this.output.putShort(this.symbolTable.addConstantUtf8(value.getDescriptor()));
    }
  }
}
