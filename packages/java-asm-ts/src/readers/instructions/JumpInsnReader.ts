import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { Label } from '../../core/Label';
import {
  IFEQ,
  IFNE,
  IFLT,
  IFGE,
  IFGT,
  IFLE,
  IF_ICMPEQ,
  IF_ICMPNE,
  IF_ICMPLT,
  IF_ICMPGE,
  IF_ICMPGT,
  IF_ICMPLE,
  IF_ACMPEQ,
  IF_ACMPNE,
  GOTO,
  JSR,
  IFNULL,
  IFNONNULL,
} from '../../core/Opcodes';
import { GOTO_W, JSR_W } from '../../core/Constants';

/**
 * Set of jump instruction opcodes.
 */
export const JUMP_INSTRUCTIONS = new Set([
  IFEQ,
  IFNE,
  IFLT,
  IFGE,
  IFGT,
  IFLE,
  IF_ICMPEQ,
  IF_ICMPNE,
  IF_ICMPLT,
  IF_ICMPGE,
  IF_ICMPGT,
  IF_ICMPLE,
  IF_ACMPEQ,
  IF_ACMPNE,
  GOTO,
  JSR,
  IFNULL,
  IFNONNULL,
  GOTO_W,
  JSR_W,
]);

/**
 * Context for reading jump instructions.
 */
export interface JumpInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Labels array indexed by bytecode offset. */
  labels: Array<Label | null>;
  
  /** Gets or creates a label at the given bytecode offset. */
  getLabel(bytecodeOffset: number): Label;
}

/**
 * Reads jump instructions (IFEQ, GOTO, etc.).
 */
export class JumpInsnReader {
  /**
   * Checks if the given opcode is a jump instruction.
   */
  static isJumpInsn(opcode: number): boolean {
    return JUMP_INSTRUCTIONS.has(opcode);
  }

  /**
   * Returns the instruction size including the opcode.
   * @param opcode the opcode
   */
  static getInstructionSize(opcode: number): number {
    if (opcode === GOTO_W || opcode === JSR_W) {
      return 5; // opcode + 4 bytes
    }
    return 3; // opcode + 2 bytes
  }

  /**
   * Gets or creates a label at the given offset.
   */
  private static getOrCreateLabel(labels: Array<Label | null>, offset: number): Label {
    let label = labels[offset];
    if (label === null || label === undefined) {
      label = new Label();
      labels[offset] = label;
    }
    return label;
  }

  /**
   * Reads and dispatches a jump instruction.
   * @param opcode the opcode
   * @param buffer the class file buffer
   * @param offset the current offset (at the opcode)
   * @param methodVisitor the method visitor
   * @param labels the labels array indexed by bytecode offset
   * @param currentBytecodeOffset the current bytecode offset (for computing absolute target)
   * @returns the number of bytes read
   */
  static read(
    opcode: number,
    buffer: Uint8Array,
    offset: number,
    methodVisitor: MethodVisitor,
    labels: Array<Label | null>,
    currentBytecodeOffset: number
  ): number {
    if (opcode === GOTO_W || opcode === JSR_W) {
      // Read signed 4-byte offset
      const branchOffset =
        (buffer[offset + 1]! << 24) |
        (buffer[offset + 2]! << 16) |
        (buffer[offset + 3]! << 8) |
        buffer[offset + 4]!;
      const targetOffset = currentBytecodeOffset + branchOffset;
      const targetLabel = JumpInsnReader.getOrCreateLabel(labels, targetOffset);
      
      // Convert to normal form for the visitor
      const normalizedOpcode = opcode === GOTO_W ? GOTO : JSR;
      methodVisitor.visitJumpInsn(normalizedOpcode, targetLabel);
      return 5;
    }

    // Read signed 2-byte offset
    let branchOffset = ((buffer[offset + 1]! << 8) | buffer[offset + 2]!) & 0xFFFF;
    if (branchOffset > 32767) {
      branchOffset = branchOffset - 65536;
    }
    const targetOffset = currentBytecodeOffset + branchOffset;
    const targetLabel = JumpInsnReader.getOrCreateLabel(labels, targetOffset);
    
    // Convert GOTO_W and JSR_W to their normal forms for the visitor
    let normalizedOpcode = opcode;
    if (opcode === GOTO_W) {
      normalizedOpcode = GOTO;
    } else if (opcode === JSR_W) {
      normalizedOpcode = JSR;
    }
    
    methodVisitor.visitJumpInsn(normalizedOpcode, targetLabel);
    return 3;
  }

  // Alias for backwards compatibility
  static getInsnSize = JumpInsnReader.getInstructionSize;

  /**
   * Reads a jump instruction using context object (legacy API).
   */
  static readWithContext(
    methodVisitor: MethodVisitor,
    opcode: number,
    context: JumpInsnContext,
    offset: number
  ): number {
    const labels: Array<Label | null> = context.labels;
    const buffer = context.classFileBuffer;
    
    // Create a wrapper for getLabel
    const originalGetLabel = context.getLabel.bind(context);
    const labelsProxy = new Proxy(labels, {
      get(target, prop) {
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          const idx = Number(prop);
          if (target[idx] === null || target[idx] === undefined) {
            target[idx] = originalGetLabel(idx);
          }
          return target[idx];
        }
        return Reflect.get(target, prop);
      },
      set(target, prop, value) {
        return Reflect.set(target, prop, value);
      }
    });
    
    return JumpInsnReader.read(opcode, buffer, offset, methodVisitor, labelsProxy, offset);
  }
}
