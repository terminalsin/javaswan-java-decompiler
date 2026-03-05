import { ByteVector } from '../../core/ByteVector';
import type { SymbolTable } from '../../core/SymbolTable';

/**
 * Writes field instructions (GETSTATIC, PUTSTATIC, GETFIELD, PUTFIELD).
 */
export class FieldInsnWriter {
  /**
   * Writes a field instruction.
   * @param code the code byte vector
   * @param opcode the opcode
   * @param owner the internal name of the field's owner class
   * @param name the field's name
   * @param descriptor the field's descriptor
   * @param symbolTable the symbol table for adding constants
   */
  static writeFieldInsn(
    code: ByteVector,
    opcode: number,
    owner: string,
    name: string,
    descriptor: string,
    symbolTable: SymbolTable
  ): void {
    const fieldrefSymbol = symbolTable.addConstantFieldref(owner, name, descriptor);
    code.put12(opcode, fieldrefSymbol.index);
  }

  /**
   * Returns the instruction size (always 3).
   */
  static getInsnSize(): number {
    return 3;
  }
}
