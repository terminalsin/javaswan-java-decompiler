import { ByteVector } from '../../core/ByteVector';
import type { SymbolTable } from '../../core/SymbolTable';
import { MULTIANEWARRAY } from '../../core/Opcodes';

/**
 * Writes MULTIANEWARRAY instructions.
 */
export class MultiANewArrayInsnWriter {
  /**
   * Writes a MULTIANEWARRAY instruction.
   * @param code the code byte vector
   * @param descriptor the array type descriptor
   * @param numDimensions the number of dimensions
   * @param symbolTable the symbol table for adding constants
   */
  static writeMultiANewArrayInsn(
    code: ByteVector,
    descriptor: string,
    numDimensions: number,
    symbolTable: SymbolTable
  ): void {
    const classSymbol = symbolTable.addConstantClass(descriptor);
    code.put12(MULTIANEWARRAY, classSymbol.index);
    code.putByte(numDimensions);
  }

  /**
   * Returns the instruction size (always 4).
   */
  static getInsnSize(): number {
    return 4;
  }
}
