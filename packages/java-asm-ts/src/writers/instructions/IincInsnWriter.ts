import { ByteVector } from '../../core/ByteVector';
import { IINC } from '../../core/Opcodes';
import { WIDE } from '../../core/Constants';

/**
 * Writes IINC instructions.
 */
export class IincInsnWriter {
  /**
   * Writes an IINC instruction.
   * @param code the code byte vector
   * @param varIndex the local variable index
   * @param increment the increment value
   */
  static writeIincInsn(code: ByteVector, varIndex: number, increment: number): void {
    // Use WIDE if variable index >= 256 or increment outside -128..127
    if (varIndex >= 256 || increment < -128 || increment > 127) {
      code.putByte(WIDE);
      code.putByte(IINC);
      code.putShort(varIndex);
      code.putShort(increment);
    } else {
      code.putByte(IINC);
      code.putByte(varIndex);
      code.putByte(increment);
    }
  }

  /**
   * Returns the instruction size.
   * @param varIndex the variable index
   * @param increment the increment value
   */
  static getInsnSize(varIndex: number, increment: number): number {
    if (varIndex >= 256 || increment < -128 || increment > 127) {
      return 6; // WIDE IINC varH varL incrH incrL
    }
    return 3; // IINC var incr
  }
}
