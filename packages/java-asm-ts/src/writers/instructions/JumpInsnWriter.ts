import { ByteVector } from '../../core/ByteVector';
import { Label } from '../../core/Label';
import { GOTO, JSR } from '../../core/Opcodes';
import { GOTO_W, JSR_W } from '../../core/Constants';

/**
 * Writes jump instructions (IFEQ, GOTO, etc.).
 */
export class JumpInsnWriter {
  /**
   * Writes a jump instruction.
   * @param code the code byte vector
   * @param opcode the opcode
   * @param label the target label
   * @param bytecodeOffset the bytecode offset of the instruction
   */
  static writeJumpInsn(
    code: ByteVector,
    opcode: number,
    label: Label,
    bytecodeOffset: number
  ): void {
    code.putByte(opcode);
    label.put(code, bytecodeOffset, false);
  }

  /**
   * Writes a wide jump instruction (GOTO_W, JSR_W).
   * @param code the code byte vector
   * @param opcode the opcode (GOTO or JSR, will be converted to wide form)
   * @param label the target label
   * @param bytecodeOffset the bytecode offset of the instruction
   */
  static writeWideJumpInsn(
    code: ByteVector,
    opcode: number,
    label: Label,
    bytecodeOffset: number
  ): void {
    const wideOpcode = opcode === GOTO ? GOTO_W : opcode === JSR ? JSR_W : opcode;
    code.putByte(wideOpcode);
    label.put(code, bytecodeOffset, true);
  }

  /**
   * Returns the instruction size.
   * @param isWide whether to use wide form
   */
  static getInsnSize(isWide: boolean): number {
    return isWide ? 5 : 3;
  }
}
