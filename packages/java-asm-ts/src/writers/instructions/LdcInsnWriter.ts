import { ByteVector } from '../../core/ByteVector';
import type { SymbolTable } from '../../core/SymbolTable';
import type { Symbol } from '../../core/Symbol';
import { LDC } from '../../core/Opcodes';
import { LDC_W, LDC2_W } from '../../core/Constants';
import { Handle } from '../../core/Handle';
import { ConstantDynamic } from '../../core/ConstantDynamic';
import { Type } from '../../core/Type';

/**
 * Writes LDC instructions (LDC, LDC_W, LDC2_W).
 */
export class LdcInsnWriter {
  /**
   * Writes an LDC instruction.
   * @param code the code byte vector
   * @param value the constant value
   * @param symbolTable the symbol table for adding constants
   */
  static writeLdcInsn(code: ByteVector, value: unknown, symbolTable: SymbolTable): void {
    const symbol = LdcInsnWriter.addConstant(value, symbolTable);
    const index = symbol.index;

    // Check if we need LDC2_W (for long/double)
    if (LdcInsnWriter.isLongOrDouble(value)) {
      code.put12(LDC2_W, index);
    } else if (index >= 256) {
      // Need LDC_W for large constant pool index
      code.put12(LDC_W, index);
    } else {
      // Regular LDC
      code.put11(LDC, index);
    }
  }

  /**
   * Adds a constant to the symbol table and returns the symbol.
   */
  private static addConstant(value: unknown, symbolTable: SymbolTable): Symbol {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return symbolTable.addConstantInteger(value);
      }
      // Check if it's a float or double by magnitude/precision
      // In practice, we use Float for regular precision, Double for high precision
      return symbolTable.addConstantFloat(value);
    }
    if (typeof value === 'bigint') {
      return symbolTable.addConstantLong(value);
    }
    if (typeof value === 'string') {
      return symbolTable.addConstantString(value);
    }
    if (value instanceof Type) {
      if (value.getSort() === 11) { // METHOD
        return symbolTable.addConstantMethodType(value.getDescriptor());
      }
      return symbolTable.addConstantClass(value.getInternalName());
    }
    if (value instanceof Handle) {
      return symbolTable.addConstantMethodHandle(
        value.getTag(),
        value.getOwner(),
        value.getName(),
        value.getDesc(),
        value.isInterface()
      );
    }
    if (value instanceof ConstantDynamic) {
      return symbolTable.addConstantDynamic(
        value.getName(),
        value.getDescriptor(),
        value.getBootstrapMethod(),
        value.getBootstrapMethodArguments()
      );
    }
    throw new Error('Unsupported LDC constant type: ' + typeof value);
  }

  /**
   * Checks if a value is a long or double constant.
   */
  private static isLongOrDouble(value: unknown): boolean {
    if (typeof value === 'bigint') {
      return true;
    }
    if (value instanceof ConstantDynamic) {
      const desc = value.getDescriptor();
      return desc === 'J' || desc === 'D';
    }
    // For regular numbers, we can't reliably distinguish float from double
    // The caller should use bigint for long values
    return false;
  }

  /**
   * Returns the instruction size.
   * @param value the constant value
   * @param symbolTable the symbol table (to check index)
   */
  static getInsnSize(value: unknown, symbolTable: SymbolTable): number {
    const symbol = LdcInsnWriter.addConstant(value, symbolTable);
    if (LdcInsnWriter.isLongOrDouble(value)) {
      return 3; // LDC2_W
    }
    if (symbol.index >= 256) {
      return 3; // LDC_W
    }
    return 2; // LDC
  }
}
