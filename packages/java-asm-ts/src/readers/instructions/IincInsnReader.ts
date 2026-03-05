import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { IINC } from '../../core/Opcodes';

/**
 * Reads IINC instructions.
 */
export class IincInsnReader {
  /**
   * Checks if the given opcode is an IINC instruction.
   */
  static isIincInsn(opcode: number): boolean {
    return opcode === IINC;
  }

  /**
   * Reads an IINC instruction.
   * @param methodVisitor the method visitor
   * @param buffer the class file buffer
   * @param offset the current offset (at the opcode)
   * @param isWide whether the instruction is prefixed with WIDE
   */
  static readIincInsn(
    methodVisitor: MethodVisitor,
    buffer: Uint8Array,
    offset: number,
    isWide: boolean
  ): void {
    let varIndex: number;
    let increment: number;

    if (isWide) {
      // WIDE IINC: 2-byte var index, 2-byte increment
      varIndex = ((buffer[offset + 1]! << 8) | buffer[offset + 2]!) & 0xFFFF;
      let incr = ((buffer[offset + 3]! << 8) | buffer[offset + 4]!) & 0xFFFF;
      if (incr > 32767) {
        incr = incr - 65536;
      }
      increment = incr;
    } else {
      // Regular IINC: 1-byte var index, 1-byte signed increment
      varIndex = buffer[offset + 1]! & 0xFF;
      let incr = buffer[offset + 2]! & 0xFF;
      if (incr > 127) {
        incr = incr - 256;
      }
      increment = incr;
    }

    methodVisitor.visitIincInsn(varIndex, increment);
  }

  /**
   * Returns the instruction size including the opcode.
   * @param isWide whether WIDE prefix is used
   */
  static getInsnSize(isWide: boolean): number {
    if (isWide) {
      return 5; // opcode + 2 bytes (var) + 2 bytes (increment)
    }
    return 3; // opcode + 1 byte (var) + 1 byte (increment)
  }
}
