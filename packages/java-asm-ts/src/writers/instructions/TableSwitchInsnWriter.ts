import { ByteVector } from '../../core/ByteVector';
import { Label } from '../../core/Label';
import { TABLESWITCH } from '../../core/Opcodes';

/**
 * Writes TABLESWITCH instructions.
 */
export class TableSwitchInsnWriter {
  /**
   * Writes a TABLESWITCH instruction.
   * @param code the code byte vector
   * @param min the minimum key value
   * @param max the maximum key value
   * @param dflt the default label
   * @param labels the case labels
   * @param bytecodeOffset the bytecode offset of the instruction
   */
  static writeTableSwitchInsn(
    code: ByteVector,
    min: number,
    max: number,
    dflt: Label,
    labels: Label[],
    bytecodeOffset: number
  ): void {
    // Write opcode
    code.putByte(TABLESWITCH);

    // Add padding to align to 4 bytes
    const currentOffset = bytecodeOffset + 1;
    const padding = (4 - (currentOffset % 4)) % 4;
    for (let i = 0; i < padding; i++) {
      code.putByte(0);
    }

    // Write default offset
    dflt.put(code, bytecodeOffset, true);

    // Write low and high
    code.putInt(min);
    code.putInt(max);

    // Write case offsets
    for (const label of labels) {
      label.put(code, bytecodeOffset, true);
    }
  }

  /**
   * Returns the instruction size.
   * @param bytecodeOffset the bytecode offset of the instruction
   * @param min the minimum key value
   * @param max the maximum key value
   */
  static getInsnSize(bytecodeOffset: number, min: number, max: number): number {
    const padding = (4 - ((bytecodeOffset + 1) % 4)) % 4;
    const numCases = max - min + 1;
    return 1 + padding + 12 + 4 * numCases;
  }
}
