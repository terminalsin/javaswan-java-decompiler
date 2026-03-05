import { ByteVector } from '../../core/ByteVector';
import { ZERO_OPERAND_INSTRUCTIONS } from '../../readers/instructions/InsnReader';

/**
 * Writes zero-operand instructions to bytecode.
 */
export class InsnWriter {
  /**
   * Checks if the given opcode is a zero-operand instruction.
   * @param opcode the opcode to check
   * @returns true if zero-operand
   */
  static isZeroOperandInsn(opcode: number): boolean {
    return ZERO_OPERAND_INSTRUCTIONS.has(opcode);
  }

  /**
   * Writes a zero-operand instruction.
   * @param code the code byte vector
   * @param opcode the opcode
   */
  static writeInsn(code: ByteVector, opcode: number): void {
    code.putByte(opcode);
  }

  /**
   * Returns the size of a zero-operand instruction (always 1).
   */
  static getInsnSize(): number {
    return 1;
  }
}
