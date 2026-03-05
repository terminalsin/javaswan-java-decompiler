import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { NEW, ANEWARRAY, CHECKCAST, INSTANCEOF } from '../../core/Opcodes';

/**
 * Context for reading type instructions.
 */
export interface TypeInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Reads a class constant from the constant pool. */
  readClass(cpIndex: number): string;
  
  /** Reads an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads type instructions (NEW, ANEWARRAY, CHECKCAST, INSTANCEOF).
 */
export class TypeInsnReader {
  /**
   * Checks if the given opcode is a type instruction.
   */
  static isTypeInsn(opcode: number): boolean {
    return opcode === NEW || opcode === ANEWARRAY || opcode === CHECKCAST || opcode === INSTANCEOF;
  }

  /**
   * Reads a type instruction.
   * @param methodVisitor the method visitor
   * @param opcode the opcode
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readTypeInsn(
    methodVisitor: MethodVisitor,
    opcode: number,
    context: TypeInsnContext,
    offset: number
  ): void {
    const cpIndex = context.readUnsignedShort(offset + 1);
    const type = context.readClass(cpIndex);
    methodVisitor.visitTypeInsn(opcode, type);
  }

  /**
   * Returns the instruction size including the opcode.
   */
  static getInsnSize(): number {
    return 3; // opcode + 2 bytes (constant pool index)
  }
}
