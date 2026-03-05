import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { Label } from '../../core/Label';
import { LOOKUPSWITCH } from '../../core/Opcodes';

/**
 * Context for reading lookupswitch instructions.
 */
export interface LookupSwitchInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Labels array indexed by bytecode offset. */
  labels: Array<Label | null>;
  
  /** Gets or creates a label at the given bytecode offset. */
  getLabel(bytecodeOffset: number): Label;
}

/**
 * Reads LOOKUPSWITCH instructions.
 */
export class LookupSwitchInsnReader {
  /**
   * Checks if the given opcode is a lookupswitch instruction.
   */
  static isLookupSwitchInsn(opcode: number): boolean {
    return opcode === LOOKUPSWITCH;
  }

  /**
   * Reads a LOOKUPSWITCH instruction.
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   * @returns the size of the instruction in bytes
   */
  static readLookupSwitchInsn(
    methodVisitor: MethodVisitor,
    context: LookupSwitchInsnContext,
    offset: number
  ): number {
    const buffer = context.classFileBuffer;
    
    // Skip padding to align to 4 bytes
    let currentOffset = offset + 1;
    const padding = (4 - (currentOffset % 4)) % 4;
    currentOffset += padding;

    // Read default offset (signed 4 bytes)
    const defaultOffset = LookupSwitchInsnReader.readInt(buffer, currentOffset);
    currentOffset += 4;

    // Read number of pairs (signed 4 bytes, but always non-negative)
    const numPairs = LookupSwitchInsnReader.readInt(buffer, currentOffset);
    currentOffset += 4;

    // Read key-offset pairs
    const keys: number[] = [];
    const labels: Label[] = [];
    for (let i = 0; i < numPairs; i++) {
      const key = LookupSwitchInsnReader.readInt(buffer, currentOffset);
      currentOffset += 4;
      const caseOffset = LookupSwitchInsnReader.readInt(buffer, currentOffset);
      currentOffset += 4;
      keys.push(key);
      labels.push(context.getLabel(offset + caseOffset));
    }

    // Create default label
    const defaultLabel = context.getLabel(offset + defaultOffset);

    methodVisitor.visitLookupSwitchInsn(defaultLabel, keys, labels);

    return currentOffset - offset;
  }

  /**
   * Reads a signed 4-byte integer from the buffer.
   */
  private static readInt(buffer: Uint8Array, offset: number): number {
    return (
      (buffer[offset]! << 24) |
      (buffer[offset + 1]! << 16) |
      (buffer[offset + 2]! << 8) |
      buffer[offset + 3]!
    );
  }

  /**
   * Calculates the instruction size.
   * @param offset the offset of the opcode
   * @param numPairs the number of key-offset pairs
   * @returns the instruction size in bytes
   */
  static calculateInsnSize(offset: number, numPairs: number): number {
    // 1 (opcode) + padding + 8 (default, npairs) + 8 * numPairs
    const padding = (4 - ((offset + 1) % 4)) % 4;
    return 1 + padding + 8 + 8 * numPairs;
  }
}
