import { Type, Handle, Label } from '@blkswn/java-asm';
import type { Expr } from '../expr/Expr';
import { ConstantExpr } from '../expr/ConstantExpr';
import { VarExpr } from '../expr/VarExpr';
import { ArithmeticExpr, ArithmeticOp } from '../expr/ArithmeticExpr';
import { NegationExpr } from '../expr/NegationExpr';
import { ComparisonExpr, ComparisonOp } from '../expr/ComparisonExpr';
import { StaticInvocationExpr } from '../expr/StaticInvocationExpr';
import { VirtualInvocationExpr, VirtualInvocationKind } from '../expr/VirtualInvocationExpr';
import { DynamicInvocationExpr } from '../expr/DynamicInvocationExpr';
import { FieldLoadExpr } from '../expr/FieldLoadExpr';
import { ArrayLoadExpr } from '../expr/ArrayLoadExpr';
import { ArrayLengthExpr } from '../expr/ArrayLengthExpr';
import { NewArrayExpr } from '../expr/NewArrayExpr';
import { CastExpr, CastKind } from '../expr/CastExpr';
import { InstanceOfExpr } from '../expr/InstanceOfExpr';
import { NewExpr } from '../expr/NewExpr';
import { CaughtExceptionExpr } from '../expr/CaughtExceptionExpr';
import { PhiExpr } from '../expr/PhiExpr';
import * as Opcodes from '@blkswn/java-asm';

/**
 * Represents the stack state at a block boundary.
 * Used to propagate stack values across blocks.
 */
export interface BlockStackState {
  /**
   * The expressions on the stack (bottom to top).
   */
  stack: Expr[];

  /**
   * Whether this state has been initialized from a frame or predecessor.
   */
  initialized: boolean;

  /**
   * If this is an exception handler entry, the exception type.
   */
  exceptionType?: string | null;

  /**
   * The predecessor block indices that can reach this block.
   */
  predecessors?: number[];
}

/**
 * Simulates the JVM operand stack to convert stack operations into expression trees.
 * Supports per-block stack tracking for proper cross-block stack propagation.
 */
export class StackSimulator {
  /**
   * The operand stack.
   */
  private stack: Expr[] = [];

  /**
   * Per-block entry stack states.
   */
  private blockEntryStates: Map<number, BlockStackState> = new Map();

  /**
   * Per-block exit stack states (after processing all instructions).
   */
  private blockExitStates: Map<number, BlockStackState> = new Map();

  /**
   * The current block index being processed.
   */
  private currentBlockIndex: number = 0;

  /**
   * Pushes an expression onto the stack.
   */
  public push(expr: Expr): void {
    this.stack.push(expr);
  }

  /**
   * Pops an expression from the stack.
   */
  public pop(): Expr {
    const expr = this.stack.pop();
    if (expr === undefined) {
      throw new Error(`Stack underflow in block ${this.currentBlockIndex}`);
    }
    return expr;
  }

  /**
   * Peeks at the top of the stack.
   */
  public peek(): Expr | undefined {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Returns the current stack size.
   */
  public size(): number {
    return this.stack.length;
  }

  /**
   * Clears the stack.
   */
  public clear(): void {
    this.stack = [];
  }

  /**
   * Gets the current stack as a copy.
   */
  public getStack(): Expr[] {
    return [...this.stack];
  }

  /**
   * Sets the current stack from an array.
   */
  public setStack(stack: Expr[]): void {
    this.stack = [...stack];
  }

  /**
   * Sets the current block being processed.
   */
  public setCurrentBlock(blockIndex: number): void {
    this.currentBlockIndex = blockIndex;
  }

  /**
   * Gets the current block index.
   */
  public getCurrentBlock(): number {
    return this.currentBlockIndex;
  }

  /**
   * Saves the current stack as the entry state for a block.
   */
  public saveEntryState(blockIndex: number): void {
    this.blockEntryStates.set(blockIndex, {
      stack: [...this.stack],
      initialized: true
    });
  }

  /**
   * Saves the current stack as the exit state for a block.
   */
  public saveExitState(blockIndex: number): void {
    this.blockExitStates.set(blockIndex, {
      stack: [...this.stack],
      initialized: true
    });
  }

  /**
   * Gets the entry state for a block.
   */
  public getEntryState(blockIndex: number): BlockStackState | undefined {
    return this.blockEntryStates.get(blockIndex);
  }

  /**
   * Gets the exit state for a block.
   */
  public getExitState(blockIndex: number): BlockStackState | undefined {
    return this.blockExitStates.get(blockIndex);
  }

  /**
   * Marks a block as an exception handler entry.
   * Exception handlers always start with just the caught exception on the stack.
   */
  public initializeExceptionHandler(blockIndex: number, exceptionType: string | null, predecessors: number[] = []): void {
    // Use PhiExpr for exception handlers - the exception comes from multiple try blocks
    const phi = PhiExpr.forException(exceptionType, blockIndex, predecessors);

    this.blockEntryStates.set(blockIndex, {
      stack: [phi],
      initialized: true,
      exceptionType,
      predecessors
    });

    // If this is for the current block, also set the current stack
    if (blockIndex === this.currentBlockIndex) {
      this.stack = [phi];
    }
  }

  /**
   * Initializes the stack from frame information.
   * Frame info provides the exact stack state at this point.
   * 
   * @param frameType The frame type from visitFrame
   * @param stackTypes The stack types from the frame
   * @param blockIndex The block index where this frame is
   * @param predecessors The predecessor blocks
   */
  public initializeFromFrame(
    frameType: number,
    stackTypes: Array<string | number | Label | null> | null,
    blockIndex: number = this.currentBlockIndex,
    predecessors: number[] = []
  ): void {
    // F_SAME and F_SAME1 are relative to previous frame
    // F_FULL and F_NEW provide complete stack info

    if (frameType === Opcodes.F_SAME) {
      // Stack is empty
      this.stack = [];
    } else if (frameType === Opcodes.F_SAME1) {
      // Stack has exactly one element - use PhiExpr since it comes from merge
      if (stackTypes && stackTypes.length > 0) {
        const type = this.frameTypeToType(stackTypes[0]);
        this.stack = [PhiExpr.fromFrame(type, 0, blockIndex, predecessors)];
      } else {
        this.stack = [];
      }
    } else if (frameType === Opcodes.F_FULL || frameType === Opcodes.F_NEW) {
      // Full stack info provided - each slot is a PhiExpr
      this.stack = [];
      if (stackTypes) {
        for (let i = 0; i < stackTypes.length; i++) {
          const type = this.frameTypeToType(stackTypes[i]);
          this.stack.push(PhiExpr.fromFrame(type, i, blockIndex, predecessors));
        }
      }
    } else if (frameType === Opcodes.F_APPEND || frameType === Opcodes.F_CHOP) {
      // These only affect locals, stack is empty
      this.stack = [];
    }
  }

  /**
   * Converts a frame type descriptor to a Type.
   */
  private frameTypeToType(frameType: string | number | Label | null): Type {
    if (frameType === null) {
      return Type.getObjectType('java/lang/Object');
    }

    if (typeof frameType === 'string') {
      // Internal name like "java/lang/String"
      return Type.getObjectType(frameType);
    }

    if (typeof frameType === 'number') {
      switch (frameType) {
        case Opcodes.TOP:
          return Type.getObjectType('java/lang/Object');
        case Opcodes.INTEGER:
          return Type.INT_TYPE;
        case Opcodes.FLOAT:
          return Type.FLOAT_TYPE;
        case Opcodes.DOUBLE:
          return Type.DOUBLE_TYPE;
        case Opcodes.LONG:
          return Type.LONG_TYPE;
        case Opcodes.NULL:
          return Type.getObjectType('java/lang/Object');
        case Opcodes.UNINITIALIZED_THIS:
          return Type.getObjectType('java/lang/Object');
        default:
          return Type.getObjectType('java/lang/Object');
      }
    }

    // Label - uninitialized type
    return Type.getObjectType('java/lang/Object');
  }

  /**
   * Propagates stack from predecessor block.
   * Call this when entering a new block from a fallthrough or jump.
   */
  public propagateFromPredecessor(predecessorBlockIndex: number): void {
    const exitState = this.blockExitStates.get(predecessorBlockIndex);
    if (exitState) {
      this.stack = [...exitState.stack];
    }
  }

  /**
   * Duplicates the top of the stack (DUP).
   */
  public dup(): void {
    const top = this.peek();
    if (top !== undefined) {
      this.push(top);
    }
  }

  /**
   * Duplicates and inserts (DUP_X1).
   */
  public dupX1(): void {
    const value1 = this.pop();
    const value2 = this.pop();
    this.push(value1);
    this.push(value2);
    this.push(value1);
  }

  /**
   * Duplicates and inserts (DUP_X2).
   */
  public dupX2(): void {
    const value1 = this.pop();
    const value2 = this.pop();
    const value3 = this.pop();
    this.push(value1);
    this.push(value3);
    this.push(value2);
    this.push(value1);
  }

  /**
   * Duplicates two values (DUP2).
   */
  public dup2(): void {
    const value1 = this.pop();
    const value2 = this.pop();
    this.push(value2);
    this.push(value1);
    this.push(value2);
    this.push(value1);
  }

  /**
   * DUP2_X1: Duplicate top two and insert below third.
   */
  public dup2X1(): void {
    const value1 = this.pop();
    const value2 = this.pop();
    const value3 = this.pop();
    this.push(value2);
    this.push(value1);
    this.push(value3);
    this.push(value2);
    this.push(value1);
  }

  /**
   * DUP2_X2: Duplicate top two and insert below fourth.
   */
  public dup2X2(): void {
    const value1 = this.pop();
    const value2 = this.pop();
    const value3 = this.pop();
    const value4 = this.pop();
    this.push(value2);
    this.push(value1);
    this.push(value4);
    this.push(value3);
    this.push(value2);
    this.push(value1);
  }

  /**
   * Swaps top two values (SWAP).
   */
  public swap(): void {
    const value1 = this.pop();
    const value2 = this.pop();
    this.push(value1);
    this.push(value2);
  }

  // -------------------------------------------------------------------------
  // Expression building methods
  // -------------------------------------------------------------------------

  /**
   * Handles a constant instruction.
   */
  public handleConstant(opcode: number): void {
    switch (opcode) {
      case Opcodes.ACONST_NULL:
        this.push(ConstantExpr.null());
        break;
      case Opcodes.ICONST_M1:
        this.push(ConstantExpr.int(-1));
        break;
      case Opcodes.ICONST_0:
        this.push(ConstantExpr.int(0));
        break;
      case Opcodes.ICONST_1:
        this.push(ConstantExpr.int(1));
        break;
      case Opcodes.ICONST_2:
        this.push(ConstantExpr.int(2));
        break;
      case Opcodes.ICONST_3:
        this.push(ConstantExpr.int(3));
        break;
      case Opcodes.ICONST_4:
        this.push(ConstantExpr.int(4));
        break;
      case Opcodes.ICONST_5:
        this.push(ConstantExpr.int(5));
        break;
      case Opcodes.LCONST_0:
        this.push(ConstantExpr.long(0));
        break;
      case Opcodes.LCONST_1:
        this.push(ConstantExpr.long(1));
        break;
      case Opcodes.FCONST_0:
        this.push(ConstantExpr.float(0));
        break;
      case Opcodes.FCONST_1:
        this.push(ConstantExpr.float(1));
        break;
      case Opcodes.FCONST_2:
        this.push(ConstantExpr.float(2));
        break;
      case Opcodes.DCONST_0:
        this.push(ConstantExpr.double(0));
        break;
      case Opcodes.DCONST_1:
        this.push(ConstantExpr.double(1));
        break;
    }
  }

  /**
   * Handles BIPUSH/SIPUSH.
   */
  public handleIntInsn(opcode: number, operand: number): void {
    if (opcode === Opcodes.BIPUSH || opcode === Opcodes.SIPUSH) {
      this.push(ConstantExpr.int(operand));
    }
  }

  /**
   * Handles LDC.
   */
  public handleLdc(value: unknown): void {
    if (value === null) {
      this.push(ConstantExpr.null());
    } else if (typeof value === 'number') {
      // Determine type based on the value
      if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
        this.push(ConstantExpr.int(value));
      } else {
        this.push(ConstantExpr.double(value));
      }
    } else if (typeof value === 'bigint') {
      this.push(ConstantExpr.long(value));
    } else if (typeof value === 'string') {
      this.push(ConstantExpr.string(value));
    } else if (value instanceof Type) {
      this.push(ConstantExpr.class(value));
    } else {
      // Handle, ConstantDynamic, etc.
      this.push(new ConstantExpr(Type.getObjectType('java/lang/Object'), value));
    }
  }

  /**
   * Handles variable load.
   */
  public handleVarLoad(opcode: number, varIndex: number, varName: string | null = null): void {
    let type: Type;
    switch (opcode) {
      case Opcodes.ILOAD:
        type = Type.INT_TYPE;
        break;
      case Opcodes.LLOAD:
        type = Type.LONG_TYPE;
        break;
      case Opcodes.FLOAD:
        type = Type.FLOAT_TYPE;
        break;
      case Opcodes.DLOAD:
        type = Type.DOUBLE_TYPE;
        break;
      case Opcodes.ALOAD:
        type = Type.getObjectType('java/lang/Object');
        break;
      default:
        throw new Error(`Unknown var load opcode: ${opcode}`);
    }
    this.push(new VarExpr(type, varIndex, varName));
  }

  /**
   * Handles array load.
   */
  public handleArrayLoad(opcode: number): Expr {
    const index = this.pop();
    const array = this.pop();
    let elementType: Type;
    switch (opcode) {
      case Opcodes.IALOAD:
        elementType = Type.INT_TYPE;
        break;
      case Opcodes.LALOAD:
        elementType = Type.LONG_TYPE;
        break;
      case Opcodes.FALOAD:
        elementType = Type.FLOAT_TYPE;
        break;
      case Opcodes.DALOAD:
        elementType = Type.DOUBLE_TYPE;
        break;
      case Opcodes.AALOAD:
        elementType = Type.getObjectType('java/lang/Object');
        break;
      case Opcodes.BALOAD:
        elementType = Type.BYTE_TYPE;
        break;
      case Opcodes.CALOAD:
        elementType = Type.CHAR_TYPE;
        break;
      case Opcodes.SALOAD:
        elementType = Type.SHORT_TYPE;
        break;
      default:
        throw new Error(`Unknown array load opcode: ${opcode}`);
    }
    const expr = new ArrayLoadExpr(elementType, array, index);
    this.push(expr);
    return expr;
  }

  /**
   * Handles arithmetic operations.
   */
  public handleArithmetic(opcode: number): void {
    let type: Type;
    let op: ArithmeticOp;

    // Determine operation
    switch (opcode) {
      case Opcodes.IADD: case Opcodes.LADD: case Opcodes.FADD: case Opcodes.DADD:
        op = ArithmeticOp.ADD;
        break;
      case Opcodes.ISUB: case Opcodes.LSUB: case Opcodes.FSUB: case Opcodes.DSUB:
        op = ArithmeticOp.SUB;
        break;
      case Opcodes.IMUL: case Opcodes.LMUL: case Opcodes.FMUL: case Opcodes.DMUL:
        op = ArithmeticOp.MUL;
        break;
      case Opcodes.IDIV: case Opcodes.LDIV: case Opcodes.FDIV: case Opcodes.DDIV:
        op = ArithmeticOp.DIV;
        break;
      case Opcodes.IREM: case Opcodes.LREM: case Opcodes.FREM: case Opcodes.DREM:
        op = ArithmeticOp.REM;
        break;
      case Opcodes.ISHL: case Opcodes.LSHL:
        op = ArithmeticOp.SHL;
        break;
      case Opcodes.ISHR: case Opcodes.LSHR:
        op = ArithmeticOp.SHR;
        break;
      case Opcodes.IUSHR: case Opcodes.LUSHR:
        op = ArithmeticOp.USHR;
        break;
      case Opcodes.IAND: case Opcodes.LAND:
        op = ArithmeticOp.AND;
        break;
      case Opcodes.IOR: case Opcodes.LOR:
        op = ArithmeticOp.OR;
        break;
      case Opcodes.IXOR: case Opcodes.LXOR:
        op = ArithmeticOp.XOR;
        break;
      default:
        throw new Error(`Unknown arithmetic opcode: ${opcode}`);
    }

    // Determine type
    if ([Opcodes.LADD, Opcodes.LSUB, Opcodes.LMUL, Opcodes.LDIV, Opcodes.LREM,
    Opcodes.LSHL, Opcodes.LSHR, Opcodes.LUSHR, Opcodes.LAND, Opcodes.LOR, Opcodes.LXOR].includes(opcode)) {
      type = Type.LONG_TYPE;
    } else if ([Opcodes.FADD, Opcodes.FSUB, Opcodes.FMUL, Opcodes.FDIV, Opcodes.FREM].includes(opcode)) {
      type = Type.FLOAT_TYPE;
    } else if ([Opcodes.DADD, Opcodes.DSUB, Opcodes.DMUL, Opcodes.DDIV, Opcodes.DREM].includes(opcode)) {
      type = Type.DOUBLE_TYPE;
    } else {
      type = Type.INT_TYPE;
    }

    const right = this.pop();
    const left = this.pop();
    this.push(new ArithmeticExpr(type, left, right, op));
  }

  /**
   * Handles negation operations.
   */
  public handleNegation(opcode: number): void {
    let type: Type;
    switch (opcode) {
      case Opcodes.INEG:
        type = Type.INT_TYPE;
        break;
      case Opcodes.LNEG:
        type = Type.LONG_TYPE;
        break;
      case Opcodes.FNEG:
        type = Type.FLOAT_TYPE;
        break;
      case Opcodes.DNEG:
        type = Type.DOUBLE_TYPE;
        break;
      default:
        throw new Error(`Unknown negation opcode: ${opcode}`);
    }
    const operand = this.pop();
    this.push(new NegationExpr(type, operand));
  }

  /**
   * Handles comparison operations (lcmp, fcmpl, fcmpg, dcmpl, dcmpg).
   */
  public handleComparison(opcode: number): void {
    let op: ComparisonOp;
    switch (opcode) {
      case Opcodes.LCMP:
        op = ComparisonOp.LCMP;
        break;
      case Opcodes.FCMPL:
        op = ComparisonOp.FCMPL;
        break;
      case Opcodes.FCMPG:
        op = ComparisonOp.FCMPG;
        break;
      case Opcodes.DCMPL:
        op = ComparisonOp.DCMPL;
        break;
      case Opcodes.DCMPG:
        op = ComparisonOp.DCMPG;
        break;
      default:
        throw new Error(`Unknown comparison opcode: ${opcode}`);
    }
    const right = this.pop();
    const left = this.pop();
    this.push(new ComparisonExpr(left, right, op));
  }

  /**
   * Handles type conversions.
   */
  public handleConversion(opcode: number): void {
    const operand = this.pop();
    let fromType: Type;
    let toType: Type;

    switch (opcode) {
      case Opcodes.I2L:
        fromType = Type.INT_TYPE; toType = Type.LONG_TYPE;
        break;
      case Opcodes.I2F:
        fromType = Type.INT_TYPE; toType = Type.FLOAT_TYPE;
        break;
      case Opcodes.I2D:
        fromType = Type.INT_TYPE; toType = Type.DOUBLE_TYPE;
        break;
      case Opcodes.L2I:
        fromType = Type.LONG_TYPE; toType = Type.INT_TYPE;
        break;
      case Opcodes.L2F:
        fromType = Type.LONG_TYPE; toType = Type.FLOAT_TYPE;
        break;
      case Opcodes.L2D:
        fromType = Type.LONG_TYPE; toType = Type.DOUBLE_TYPE;
        break;
      case Opcodes.F2I:
        fromType = Type.FLOAT_TYPE; toType = Type.INT_TYPE;
        break;
      case Opcodes.F2L:
        fromType = Type.FLOAT_TYPE; toType = Type.LONG_TYPE;
        break;
      case Opcodes.F2D:
        fromType = Type.FLOAT_TYPE; toType = Type.DOUBLE_TYPE;
        break;
      case Opcodes.D2I:
        fromType = Type.DOUBLE_TYPE; toType = Type.INT_TYPE;
        break;
      case Opcodes.D2L:
        fromType = Type.DOUBLE_TYPE; toType = Type.LONG_TYPE;
        break;
      case Opcodes.D2F:
        fromType = Type.DOUBLE_TYPE; toType = Type.FLOAT_TYPE;
        break;
      case Opcodes.I2B:
        fromType = Type.INT_TYPE; toType = Type.BYTE_TYPE;
        break;
      case Opcodes.I2C:
        fromType = Type.INT_TYPE; toType = Type.CHAR_TYPE;
        break;
      case Opcodes.I2S:
        fromType = Type.INT_TYPE; toType = Type.SHORT_TYPE;
        break;
      default:
        throw new Error(`Unknown conversion opcode: ${opcode}`);
    }

    this.push(new CastExpr(toType, operand, fromType, CastKind.PRIMITIVE));
  }

  /**
   * Handles field get.
   */
  public handleFieldGet(opcode: number, owner: string, name: string, descriptor: string): void {
    const isStatic = opcode === Opcodes.GETSTATIC;
    const instance = isStatic ? null : this.pop();
    const fieldType = Type.getType(descriptor);
    this.push(new FieldLoadExpr(fieldType, owner, name, descriptor, instance, isStatic));
  }

  /**
   * Handles method invocation (non-dynamic).
   */
  public handleMethodInsn(
    opcode: number,
    owner: string,
    name: string,
    descriptor: string,
    isInterface: boolean
  ): Expr {
    const returnType = Type.getReturnType(descriptor);
    const argTypes = Type.getArgumentTypes(descriptor);

    // Pop arguments in reverse order
    const args: Expr[] = [];
    for (let i = argTypes.length - 1; i >= 0; i--) {
      args.unshift(this.pop());
    }

    let expr: Expr;

    if (opcode === Opcodes.INVOKESTATIC) {
      expr = new StaticInvocationExpr(returnType, owner, name, descriptor, args);
    } else {
      const receiver = this.pop();
      let kind: VirtualInvocationKind;
      switch (opcode) {
        case Opcodes.INVOKEVIRTUAL:
          kind = VirtualInvocationKind.VIRTUAL;
          break;
        case Opcodes.INVOKESPECIAL:
          kind = VirtualInvocationKind.SPECIAL;
          break;
        case Opcodes.INVOKEINTERFACE:
          kind = VirtualInvocationKind.INTERFACE;
          break;
        default:
          throw new Error(`Unknown method opcode: ${opcode}`);
      }
      expr = new VirtualInvocationExpr(returnType, owner, name, descriptor, receiver, args, kind, isInterface);
    }

    // Push result if not void
    if (returnType.getSort() !== 0) { // VOID = 0
      this.push(expr);
    }

    return expr;
  }

  /**
   * Handles invokedynamic.
   */
  public handleInvokeDynamic(
    name: string,
    descriptor: string,
    bootstrapMethod: Handle,
    bootstrapArgs: unknown[]
  ): Expr {
    const returnType = Type.getReturnType(descriptor);
    const argTypes = Type.getArgumentTypes(descriptor);

    // Pop arguments in reverse order
    const args: Expr[] = [];
    for (let i = argTypes.length - 1; i >= 0; i--) {
      args.unshift(this.pop());
    }

    const expr = new DynamicInvocationExpr(returnType, name, descriptor, args, bootstrapMethod, bootstrapArgs);

    // Push result if not void
    if (returnType.getSort() !== 0) { // VOID = 0
      this.push(expr);
    }

    return expr;
  }

  /**
   * Handles type instructions (NEW, ANEWARRAY, CHECKCAST, INSTANCEOF).
   */
  public handleTypeInsn(opcode: number, type: string): void {
    const objectType = Type.getObjectType(type);

    switch (opcode) {
      case Opcodes.NEW:
        this.push(new NewExpr(objectType));
        break;
      case Opcodes.ANEWARRAY: {
        const count = this.pop();
        const arrayType = Type.getType('[L' + type + ';');
        this.push(new NewArrayExpr(arrayType, objectType, [count]));
        break;
      }
      case Opcodes.CHECKCAST: {
        const operand = this.pop();
        // Array type descriptors start with '[' - must use Type.getType for proper parsing
        const castType = type.startsWith('[') ? Type.getType(type) : objectType;
        this.push(new CastExpr(castType, operand, operand.type, CastKind.CHECKCAST));
        break;
      }
      case Opcodes.INSTANCEOF: {
        const operand = this.pop();
        // Array type descriptors start with '[' - must use Type.getType for proper parsing
        const checkType = type.startsWith('[') ? Type.getType(type) : objectType;
        this.push(new InstanceOfExpr(operand, checkType));
        break;
      }
    }
  }

  /**
   * Handles NEWARRAY instruction.
   */
  public handleNewArray(arrayTypeCode: number): void {
    const count = this.pop();
    let elementType: Type;
    let arrayType: Type;

    switch (arrayTypeCode) {
      case 4: // T_BOOLEAN
        elementType = Type.BOOLEAN_TYPE;
        arrayType = Type.getType('[Z');
        break;
      case 5: // T_CHAR
        elementType = Type.CHAR_TYPE;
        arrayType = Type.getType('[C');
        break;
      case 6: // T_FLOAT
        elementType = Type.FLOAT_TYPE;
        arrayType = Type.getType('[F');
        break;
      case 7: // T_DOUBLE
        elementType = Type.DOUBLE_TYPE;
        arrayType = Type.getType('[D');
        break;
      case 8: // T_BYTE
        elementType = Type.BYTE_TYPE;
        arrayType = Type.getType('[B');
        break;
      case 9: // T_SHORT
        elementType = Type.SHORT_TYPE;
        arrayType = Type.getType('[S');
        break;
      case 10: // T_INT
        elementType = Type.INT_TYPE;
        arrayType = Type.getType('[I');
        break;
      case 11: // T_LONG
        elementType = Type.LONG_TYPE;
        arrayType = Type.getType('[J');
        break;
      default:
        throw new Error(`Unknown array type code: ${arrayTypeCode}`);
    }

    this.push(new NewArrayExpr(arrayType, elementType, [count]));
  }

  /**
   * Handles MULTIANEWARRAY instruction.
   */
  public handleMultiANewArray(descriptor: string, numDimensions: number): void {
    const dimensions: Expr[] = [];
    for (let i = 0; i < numDimensions; i++) {
      dimensions.unshift(this.pop());
    }

    const arrayType = Type.getType(descriptor);
    // Get element type by stripping array dimensions
    let elementDescriptor = descriptor;
    for (let i = 0; i < numDimensions; i++) {
      elementDescriptor = elementDescriptor.substring(1);
    }
    const elementType = Type.getType(elementDescriptor);

    this.push(new NewArrayExpr(arrayType, elementType, dimensions));
  }

  /**
   * Handles ARRAYLENGTH instruction.
   */
  public handleArrayLength(): void {
    const array = this.pop();
    this.push(new ArrayLengthExpr(array));
  }

  /**
   * Pushes a caught exception expression (at exception handler entry).
   * Uses PhiExpr since exceptions can come from multiple points in the try block.
   */
  public pushCaughtException(exceptionType: string | null, blockIndex?: number, predecessors?: number[]): void {
    const phi = PhiExpr.forException(
      exceptionType,
      blockIndex ?? this.currentBlockIndex,
      predecessors ?? []
    );
    this.push(phi);
  }

  /**
   * Adds a predecessor to a block's entry state.
   */
  public addPredecessor(blockIndex: number, predecessorIndex: number): void {
    const state = this.blockEntryStates.get(blockIndex);
    if (state) {
      if (!state.predecessors) {
        state.predecessors = [];
      }
      if (!state.predecessors.includes(predecessorIndex)) {
        state.predecessors.push(predecessorIndex);
      }
    }
  }
}
