import { ByteVector } from '../../core/ByteVector';
import { BIPUSH, SIPUSH, NEWARRAY } from '../../core/Opcodes';

/**
 * Writes int operand instructions (BIPUSH, SIPUSH, NEWARRAY).
 */
export class IntInsnWriter {
  /**
   * Writes a BIPUSH instruction.
   * @param code the code byte vector
   * @param value the byte value (-128 to 127)
   */
  static writeBipush(code: ByteVector, value: number): void {
    code.put11(BIPUSH, value);
  }

  /**
   * Writes a SIPUSH instruction.
   * @param code the code byte vector
   * @param value the short value (-32768 to 32767)
   */
  static writeSipush(code: ByteVector, value: number): void {
    code.put12(SIPUSH, value);
  }

  /**
   * Writes a NEWARRAY instruction.
   * @param code the code byte vector
   * @param atype the array type code (T_BOOLEAN, T_CHAR, etc.)
   */
  static writeNewarray(code: ByteVector, atype: number): void {
    code.put11(NEWARRAY, atype);
  }

  /**
   * Writes an int operand instruction.
   * @param code the code byte vector
   * @param opcode the opcode
   * @param operand the operand
   */
  static writeIntInsn(code: ByteVector, opcode: number, operand: number): void {
    switch (opcode) {
      case BIPUSH:
        IntInsnWriter.writeBipush(code, operand);
        break;
      case SIPUSH:
        IntInsnWriter.writeSipush(code, operand);
        break;
      case NEWARRAY:
        IntInsnWriter.writeNewarray(code, operand);
        break;
      default:
        throw new Error('Not an int operand instruction: ' + opcode);
    }
  }

  /**
   * Returns the instruction size.
   * @param opcode the opcode
   */
  static getInsnSize(opcode: number): number {
    if (opcode === SIPUSH) {
      return 3;
    }
    return 2;
  }
}
