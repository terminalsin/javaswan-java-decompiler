import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { MULTIANEWARRAY } from '../../core/Opcodes';

/**
 * Context for reading multianewarray instructions.
 */
export interface MultiANewArrayInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Reads a class constant from the constant pool. */
  readClass(cpIndex: number): string;
  
  /** Reads an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads MULTIANEWARRAY instructions.
 */
export class MultiANewArrayInsnReader {
  /**
   * Checks if the given opcode is a multianewarray instruction.
   */
  static isMultiANewArrayInsn(opcode: number): boolean {
    return opcode === MULTIANEWARRAY;
  }

  /**
   * Reads a MULTIANEWARRAY instruction.
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readMultiANewArrayInsn(
    methodVisitor: MethodVisitor,
    context: MultiANewArrayInsnContext,
    offset: number
  ): void {
    const buffer = context.classFileBuffer;
    const cpIndex = context.readUnsignedShort(offset + 1);
    const numDimensions = buffer[offset + 3]! & 0xFF;
    const descriptor = context.readClass(cpIndex);
    methodVisitor.visitMultiANewArrayInsn(descriptor, numDimensions);
  }

  /**
   * Returns the instruction size including the opcode.
   */
  static getInsnSize(): number {
    return 4; // opcode + 2 bytes (cp index) + 1 byte (dimensions)
  }
}
