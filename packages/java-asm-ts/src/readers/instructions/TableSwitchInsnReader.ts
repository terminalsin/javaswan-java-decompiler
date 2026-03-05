import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { Label } from '../../core/Label';
import { TABLESWITCH } from '../../core/Opcodes';

/**
 * Context for reading tableswitch instructions.
 */
export interface TableSwitchInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Labels array indexed by bytecode offset. */
  labels: Array<Label | null>;
  
  /** Gets or creates a label at the given bytecode offset. */
  getLabel(bytecodeOffset: number): Label;
}

/**
 * Reads TABLESWITCH instructions.
 */
export class TableSwitchInsnReader {
  /**
   * Checks if the given opcode is a tableswitch instruction.
   */
  static isTableSwitchInsn(opcode: number): boolean {
    return opcode === TABLESWITCH;
  }

  /**
   * Reads a TABLESWITCH instruction.
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   * @returns the size of the instruction in bytes
   */
  static readTableSwitchInsn(
    methodVisitor: MethodVisitor,
    context: TableSwitchInsnContext,
    offset: number
  ): number {
    const buffer = context.classFileBuffer;
    
    // Skip padding to align to 4 bytes
    let currentOffset = offset + 1;
    const padding = (4 - (currentOffset % 4)) % 4;
    currentOffset += padding;

    // Read default offset (signed 4 bytes)
    const defaultOffset = TableSwitchInsnReader.readInt(buffer, currentOffset);
    currentOffset += 4;

    // Read low (signed 4 bytes)
    const low = TableSwitchInsnReader.readInt(buffer, currentOffset);
    currentOffset += 4;

    // Read high (signed 4 bytes)
    const high = TableSwitchInsnReader.readInt(buffer, currentOffset);
    currentOffset += 4;

    // Calculate number of cases
    const numCases = high - low + 1;

    // Read case labels
    const labels: Label[] = [];
    for (let i = 0; i < numCases; i++) {
      const caseOffset = TableSwitchInsnReader.readInt(buffer, currentOffset);
      currentOffset += 4;
      labels.push(context.getLabel(offset + caseOffset));
    }

    // Create default label
    const defaultLabel = context.getLabel(offset + defaultOffset);

    methodVisitor.visitTableSwitchInsn(low, high, defaultLabel, ...labels);

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
   * @param low the low value
   * @param high the high value
   * @returns the instruction size in bytes
   */
  static calculateInsnSize(offset: number, low: number, high: number): number {
    // 1 (opcode) + padding + 12 (default, low, high) + 4 * numCases
    const padding = (4 - ((offset + 1) % 4)) % 4;
    const numCases = high - low + 1;
    return 1 + padding + 12 + 4 * numCases;
  }
}
