import { ByteVector } from '../../core/ByteVector';
import type { SymbolTable } from '../../core/SymbolTable';

/**
 * Writes type instructions (NEW, ANEWARRAY, CHECKCAST, INSTANCEOF).
 */
export class TypeInsnWriter {
  /**
   * Writes a type instruction.
   * @param code the code byte vector
   * @param opcode the opcode
   * @param type the internal name of the class or array descriptor
   * @param symbolTable the symbol table for adding constants
   */
  static writeTypeInsn(
    code: ByteVector,
    opcode: number,
    type: string,
    symbolTable: SymbolTable
  ): void {
    const classSymbol = symbolTable.addConstantClass(type);
    code.put12(opcode, classSymbol.index);
  }

  /**
   * Returns the instruction size (always 3).
   */
  static getInsnSize(): number {
    return 3;
  }
}
