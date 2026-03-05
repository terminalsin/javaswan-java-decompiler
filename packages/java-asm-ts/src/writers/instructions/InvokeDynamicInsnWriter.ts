import { ByteVector } from '../../core/ByteVector';
import type { SymbolTable } from '../../core/SymbolTable';
import type { Handle } from '../../core/Handle';
import { INVOKEDYNAMIC } from '../../core/Opcodes';

/**
 * Writes invokedynamic instructions.
 */
export class InvokeDynamicInsnWriter {
  /**
   * Writes an invokedynamic instruction.
   * @param code the code byte vector
   * @param name the method's name
   * @param descriptor the method's descriptor
   * @param bootstrapMethodHandle the bootstrap method handle
   * @param bootstrapMethodArguments the bootstrap method arguments
   * @param symbolTable the symbol table for adding constants
   */
  static writeInvokeDynamicInsn(
    code: ByteVector,
    name: string,
    descriptor: string,
    bootstrapMethodHandle: Handle,
    bootstrapMethodArguments: unknown[],
    symbolTable: SymbolTable
  ): void {
    const invokeDynamicSymbol = symbolTable.addConstantInvokeDynamic(
      name,
      descriptor,
      bootstrapMethodHandle,
      bootstrapMethodArguments
    );
    code.put12(INVOKEDYNAMIC, invokeDynamicSymbol.index);
    code.putShort(0); // Reserved bytes (always 0)
  }

  /**
   * Returns the instruction size (always 5).
   */
  static getInsnSize(): number {
    return 5;
  }
}
