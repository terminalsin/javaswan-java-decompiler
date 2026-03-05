import { ASM5, ASM9 } from '../core/Opcodes';
import type { AnnotationVisitor } from './AnnotationVisitor';
import type { Attribute } from '../attributes/Attribute';
import type { Handle } from '../core/Handle';
import type { Label } from '../core/Label';
import type { TypePath } from '../core/TypePath';

/**
 * A visitor to visit a Java method. The methods of this class must be called in the following order:
 * ( visitParameter )* [ visitAnnotationDefault ] ( visitAnnotation | visitAnnotableParameterCount |
 * visitParameterAnnotation | visitTypeAnnotation | visitAttribute )* [ visitCode ( visitFrame |
 * visitXxxInsn | visitLabel | visitInsnAnnotation | visitTryCatchBlock | visitTryCatchAnnotation |
 * visitLocalVariable | visitLocalVariableAnnotation | visitLineNumber )* visitMaxs ] visitEnd.
 *
 * In addition, the visitXxxInsn and visitLabel methods must be called in the sequential order of the
 * bytecode instructions of the visited code, visitInsnAnnotation must be called after the annotated
 * instruction, visitTryCatchBlock must be called before the labels passed as arguments have been
 * visited, visitTryCatchAnnotation must be called after the corresponding try catch block has been
 * visited, and visitLocalVariable, visitLocalVariableAnnotation and visitLineNumber methods must be
 * called after the labels passed as arguments have been visited.
 */
export abstract class MethodVisitor {
  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /** The method visitor to which this visitor must delegate method calls. May be null. */
  protected mv: MethodVisitor | null;

  /**
   * Constructs a new MethodVisitor.
   * @param api the ASM API version (ASM4 to ASM9)
   * @param methodVisitor the method visitor to delegate to
   */
  constructor(api: number, methodVisitor: MethodVisitor | null = null) {
    if (api !== ASM9 && (api < 0x40000 || api > 0x90100)) {
      throw new Error('Unsupported API version: ' + api);
    }
    this.api = api;
    this.mv = methodVisitor;
  }

  /**
   * Returns the delegate method visitor.
   */
  getDelegate(): MethodVisitor | null {
    return this.mv;
  }

  // -------------------------------------------------------------------------
  // Parameters, annotations and non standard attributes
  // -------------------------------------------------------------------------

  /**
   * Visits a parameter of this method.
   * @param name parameter name or null
   * @param access parameter access flags (ACC_FINAL, ACC_SYNTHETIC, ACC_MANDATED)
   */
  visitParameter(name: string | null, access: number): void {
    if (this.api < ASM5) {
      throw new Error('visitParameter requires ASM5+');
    }
    this.mv?.visitParameter(name, access);
  }

  /**
   * Visits the default value of this annotation interface method.
   * @returns a visitor to visit the actual default value, or null
   */
  visitAnnotationDefault(): AnnotationVisitor | null {
    if (this.mv !== null) {
      return this.mv.visitAnnotationDefault();
    }
    return null;
  }

  /**
   * Visits an annotation of this method.
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    if (this.mv !== null) {
      return this.mv.visitAnnotation(descriptor, visible);
    }
    return null;
  }

  /**
   * Visits an annotation on the type of the method.
   * @param typeRef a reference to the annotated type
   * @param typePath the path to the annotated type argument (or null)
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitTypeAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.api < ASM5) {
      throw new Error('visitTypeAnnotation requires ASM5+');
    }
    if (this.mv !== null) {
      return this.mv.visitTypeAnnotation(typeRef, typePath, descriptor, visible);
    }
    return null;
  }

  /**
   * Visits the number of annotable parameters.
   * @param parameterCount the number of method parameters
   * @param visible true if visible at runtime
   */
  visitAnnotableParameterCount(parameterCount: number, visible: boolean): void {
    if (this.mv !== null) {
      this.mv.visitAnnotableParameterCount(parameterCount, visible);
    }
  }

  /**
   * Visits an annotation of a method parameter.
   * @param parameter the parameter index
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitParameterAnnotation(
    parameter: number,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.mv !== null) {
      return this.mv.visitParameterAnnotation(parameter, descriptor, visible);
    }
    return null;
  }

  /**
   * Visits a non standard attribute of this method.
   * @param attribute an attribute
   */
  visitAttribute(attribute: Attribute): void {
    this.mv?.visitAttribute(attribute);
  }

  /**
   * Starts the visit of the method's code, if any (i.e. non abstract method).
   */
  visitCode(): void {
    this.mv?.visitCode();
  }

  /**
   * Visits the current state of the local variables and operand stack elements.
   * @param type the type of this stack map frame (F_NEW, F_FULL, F_APPEND, F_CHOP, F_SAME, F_SAME1)
   * @param numLocal the number of local variables
   * @param local the local variable types
   * @param numStack the number of operand stack elements
   * @param stack the operand stack element types
   */
  visitFrame(
    type: number,
    numLocal: number,
    local: Array<string | number | Label | null> | null,
    numStack: number,
    stack: Array<string | number | Label | null> | null
  ): void {
    this.mv?.visitFrame(type, numLocal, local, numStack, stack);
  }

  // -------------------------------------------------------------------------
  // Normal instructions
  // -------------------------------------------------------------------------

  /**
   * Visits a zero operand instruction.
   * @param opcode the opcode (NOP, ACONST_NULL, ICONST_M1-5, LCONST_0-1, FCONST_0-2, DCONST_0-1,
   *        IALOAD-SALOAD, IASTORE-SASTORE, POP, POP2, DUP, DUP_X1, DUP_X2, DUP2, DUP2_X1, DUP2_X2,
   *        SWAP, IADD-DREM, INEG-DNEG, ISHL-LXOR, I2L-I2S, LCMP, FCMPL, FCMPG, DCMPL, DCMPG,
   *        IRETURN-RETURN, ARRAYLENGTH, ATHROW, MONITORENTER, or MONITOREXIT)
   */
  visitInsn(opcode: number): void {
    this.mv?.visitInsn(opcode);
  }

  /**
   * Visits an instruction with a single int operand.
   * @param opcode the opcode (BIPUSH, SIPUSH or NEWARRAY)
   * @param operand the operand (for NEWARRAY, one of T_BOOLEAN-T_LONG)
   */
  visitIntInsn(opcode: number, operand: number): void {
    this.mv?.visitIntInsn(opcode, operand);
  }

  /**
   * Visits a local variable instruction.
   * @param opcode the opcode (ILOAD-ALOAD, ISTORE-ASTORE, or RET)
   * @param varIndex the operand (local variable index)
   */
  visitVarInsn(opcode: number, varIndex: number): void {
    this.mv?.visitVarInsn(opcode, varIndex);
  }

  /**
   * Visits a type instruction.
   * @param opcode the opcode (NEW, ANEWARRAY, CHECKCAST or INSTANCEOF)
   * @param type the internal name of the class, or array descriptor
   */
  visitTypeInsn(opcode: number, type: string): void {
    this.mv?.visitTypeInsn(opcode, type);
  }

  /**
   * Visits a field instruction.
   * @param opcode the opcode (GETSTATIC, PUTSTATIC, GETFIELD or PUTFIELD)
   * @param owner the internal name of the field's owner class
   * @param name the field's name
   * @param descriptor the field's descriptor
   */
  visitFieldInsn(opcode: number, owner: string, name: string, descriptor: string): void {
    this.mv?.visitFieldInsn(opcode, owner, name, descriptor);
  }

  /**
   * Visits a method instruction.
   * @param opcode the opcode (INVOKEVIRTUAL, INVOKESPECIAL, INVOKESTATIC, INVOKEINTERFACE)
   * @param owner the internal name of the method's owner class
   * @param name the method's name
   * @param descriptor the method's descriptor
   * @param isInterface true if the method's owner class is an interface
   */
  visitMethodInsn(
    opcode: number,
    owner: string,
    name: string,
    descriptor: string,
    isInterface: boolean
  ): void {
    if (this.api < ASM5) {
      // For ASM4, isInterface must match opcode
      if (isInterface !== (opcode === 185 /* INVOKEINTERFACE */)) {
        throw new Error('INVOKESPECIAL/STATIC on interfaces requires ASM5+');
      }
      // Call deprecated version
      this.visitMethodInsnDeprecated(opcode, owner, name, descriptor);
      return;
    }
    this.mv?.visitMethodInsn(opcode, owner, name, descriptor, isInterface);
  }

  /**
   * @deprecated Use visitMethodInsn with isInterface parameter instead.
   */
  protected visitMethodInsnDeprecated(
    opcode: number,
    owner: string,
    name: string,
    descriptor: string
  ): void {
    // Default to ASM4 behavior
    const isInterface = opcode === 185; // INVOKEINTERFACE
    this.mv?.visitMethodInsn(opcode, owner, name, descriptor, isInterface);
  }

  /**
   * Visits an invokedynamic instruction.
   * @param name the method's name
   * @param descriptor the method's descriptor
   * @param bootstrapMethodHandle the bootstrap method handle
   * @param bootstrapMethodArguments the bootstrap method constant arguments
   */
  visitInvokeDynamicInsn(
    name: string,
    descriptor: string,
    bootstrapMethodHandle: Handle,
    ...bootstrapMethodArguments: unknown[]
  ): void {
    if (this.api < ASM5) {
      throw new Error('visitInvokeDynamicInsn requires ASM5+');
    }
    this.mv?.visitInvokeDynamicInsn(name, descriptor, bootstrapMethodHandle, ...bootstrapMethodArguments);
  }

  /**
   * Visits a jump instruction.
   * @param opcode the opcode (IFEQ, IFNE, IFLT, IFGE, IFGT, IFLE, IF_ICMPEQ, IF_ICMPNE, IF_ICMPLT,
   *        IF_ICMPGE, IF_ICMPGT, IF_ICMPLE, IF_ACMPEQ, IF_ACMPNE, GOTO, JSR, IFNULL, IFNONNULL)
   * @param label the target label
   */
  visitJumpInsn(opcode: number, label: Label): void {
    this.mv?.visitJumpInsn(opcode, label);
  }

  /**
   * Visits a label.
   * @param label a Label object
   */
  visitLabel(label: Label): void {
    this.mv?.visitLabel(label);
  }

  // -------------------------------------------------------------------------
  // Special instructions
  // -------------------------------------------------------------------------

  /**
   * Visits a LDC instruction.
   * @param value the constant to be loaded (Integer, Float, Long, Double, String, Type, Handle, or ConstantDynamic)
   */
  visitLdcInsn(value: unknown): void {
    if (this.api < ASM5) {
      if (value instanceof Object && ('getTag' in value || 'getName' in value)) {
        throw new Error('LDC of Handle/ConstantDynamic requires ASM5+');
      }
    }
    this.mv?.visitLdcInsn(value);
  }

  /**
   * Visits an IINC instruction.
   * @param varIndex local variable index
   * @param increment amount to increment by
   */
  visitIincInsn(varIndex: number, increment: number): void {
    this.mv?.visitIincInsn(varIndex, increment);
  }

  /**
   * Visits a TABLESWITCH instruction.
   * @param min the minimum key value
   * @param max the maximum key value
   * @param dflt beginning of the default handler block
   * @param labels beginnings of the handler blocks
   */
  visitTableSwitchInsn(min: number, max: number, dflt: Label, ...labels: Label[]): void {
    this.mv?.visitTableSwitchInsn(min, max, dflt, ...labels);
  }

  /**
   * Visits a LOOKUPSWITCH instruction.
   * @param dflt beginning of the default handler block
   * @param keys the values of the keys
   * @param labels beginnings of the handler blocks
   */
  visitLookupSwitchInsn(dflt: Label, keys: number[], labels: Label[]): void {
    this.mv?.visitLookupSwitchInsn(dflt, keys, labels);
  }

  /**
   * Visits a MULTIANEWARRAY instruction.
   * @param descriptor the type descriptor
   * @param numDimensions the number of dimensions
   */
  visitMultiANewArrayInsn(descriptor: string, numDimensions: number): void {
    this.mv?.visitMultiANewArrayInsn(descriptor, numDimensions);
  }

  /**
   * Visits an annotation on an instruction.
   * @param typeRef a reference to the annotated type
   * @param typePath the path to the annotated type argument (or null)
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitInsnAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.api < ASM5) {
      throw new Error('visitInsnAnnotation requires ASM5+');
    }
    if (this.mv !== null) {
      return this.mv.visitInsnAnnotation(typeRef, typePath, descriptor, visible);
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Exceptions table entries, debug information, max stack and max locals
  // -------------------------------------------------------------------------

  /**
   * Visits a try catch block.
   * @param start beginning of the exception handler's scope
   * @param end end of the exception handler's scope
   * @param handler beginning of the exception handler's code
   * @param type internal name of the type of exceptions handled (or null for any exception)
   */
  visitTryCatchBlock(start: Label, end: Label, handler: Label, type: string | null): void {
    this.mv?.visitTryCatchBlock(start, end, handler, type);
  }

  /**
   * Visits an annotation on an exception handler type.
   * @param typeRef a reference to the annotated type
   * @param typePath the path to the annotated type argument (or null)
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitTryCatchAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.api < ASM5) {
      throw new Error('visitTryCatchAnnotation requires ASM5+');
    }
    if (this.mv !== null) {
      return this.mv.visitTryCatchAnnotation(typeRef, typePath, descriptor, visible);
    }
    return null;
  }

  /**
   * Visits a local variable declaration.
   * @param name the name of a local variable
   * @param descriptor the type descriptor of the local variable
   * @param signature the type signature of the local variable (may be null)
   * @param start the first instruction in the local variable scope
   * @param end the last instruction in the local variable scope
   * @param index the local variable index
   */
  visitLocalVariable(
    name: string,
    descriptor: string,
    signature: string | null,
    start: Label,
    end: Label,
    index: number
  ): void {
    this.mv?.visitLocalVariable(name, descriptor, signature, start, end, index);
  }

  /**
   * Visits an annotation on a local variable type.
   * @param typeRef a reference to the annotated type
   * @param typePath the path to the annotated type argument (or null)
   * @param start the first instructions in the local variable scope
   * @param end the last instructions in the local variable scope
   * @param index the local variable indices
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitLocalVariableAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    start: Label[],
    end: Label[],
    index: number[],
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.api < ASM5) {
      throw new Error('visitLocalVariableAnnotation requires ASM5+');
    }
    if (this.mv !== null) {
      return this.mv.visitLocalVariableAnnotation(
        typeRef,
        typePath,
        start,
        end,
        index,
        descriptor,
        visible
      );
    }
    return null;
  }

  /**
   * Visits a line number declaration.
   * @param line a line number in the original source file
   * @param start the first instruction corresponding to this line number
   */
  visitLineNumber(line: number, start: Label): void {
    this.mv?.visitLineNumber(line, start);
  }

  /**
   * Visits the maximum stack size and the maximum number of local variables of the method.
   * @param maxStack maximum stack size
   * @param maxLocals maximum number of local variables
   */
  visitMaxs(maxStack: number, maxLocals: number): void {
    this.mv?.visitMaxs(maxStack, maxLocals);
  }

  /**
   * Visits the end of the method.
   */
  visitEnd(): void {
    this.mv?.visitEnd();
  }
}
