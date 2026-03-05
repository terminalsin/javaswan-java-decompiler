import { ByteVector } from '../../core/ByteVector';
import { Label } from '../../core/Label';
import { LOOKUPSWITCH } from '../../core/Opcodes';

/**
 * Writes LOOKUPSWITCH instructions.
 */
export class LookupSwitchInsnWriter {
  /**
   * Writes a LOOKUPSWITCH instruction.
   * @param code the code byte vector
   * @param dflt the default label
   * @param keys the case keys
   * @param labels the case labels
   * @param bytecodeOffset the bytecode offset of the instruction
   */
  static writeLookupSwitchInsn(
    code: ByteVector,
    dflt: Label,
    keys: number[],
    labels: Label[],
    bytecodeOffset: number
  ): void {
    // Write opcode
    code.putByte(LOOKUPSWITCH);

    // Add padding to align to 4 bytes
    const currentOffset = bytecodeOffset + 1;
    const padding = (4 - (currentOffset % 4)) % 4;
    for (let i = 0; i < padding; i++) {
      code.putByte(0);
    }

    // Write default offset
    dflt.put(code, bytecodeOffset, true);

    // Write number of pairs
    code.putInt(keys.length);

    // Write key-offset pairs
    for (let i = 0; i < keys.length; i++) {
      code.putInt(keys[i]!);
      labels[i]!.put(code, bytecodeOffset, true);
    }
  }

  /**
   * Returns the instruction size.
   * @param bytecodeOffset the bytecode offset of the instruction
   * @param numPairs the number of key-offset pairs
   */
  static getInsnSize(bytecodeOffset: number, numPairs: number): number {
    const padding = (4 - ((bytecodeOffset + 1) % 4)) % 4;
    return 1 + padding + 8 + 8 * numPairs;
  }
}
