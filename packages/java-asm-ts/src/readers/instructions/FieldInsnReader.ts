import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { GETSTATIC, PUTSTATIC, GETFIELD, PUTFIELD } from '../../core/Opcodes';

/**
 * Context for reading field instructions.
 */
export interface FieldInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Reads a field reference from the constant pool. */
  readFieldref(cpIndex: number): { owner: string; name: string; descriptor: string };
  
  /** Reads an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads field instructions (GETSTATIC, PUTSTATIC, GETFIELD, PUTFIELD).
 */
export class FieldInsnReader {
  /**
   * Checks if the given opcode is a field instruction.
   */
  static isFieldInsn(opcode: number): boolean {
    return opcode === GETSTATIC || opcode === PUTSTATIC || opcode === GETFIELD || opcode === PUTFIELD;
  }

  /**
   * Reads a field instruction.
   * @param methodVisitor the method visitor
   * @param opcode the opcode
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readFieldInsn(
    methodVisitor: MethodVisitor,
    opcode: number,
    context: FieldInsnContext,
    offset: number
  ): void {
    const cpIndex = context.readUnsignedShort(offset + 1);
    const { owner, name, descriptor } = context.readFieldref(cpIndex);
    methodVisitor.visitFieldInsn(opcode, owner, name, descriptor);
  }

  /**
   * Returns the instruction size including the opcode.
   */
  static getInsnSize(): number {
    return 3; // opcode + 2 bytes (constant pool index)
  }
}
