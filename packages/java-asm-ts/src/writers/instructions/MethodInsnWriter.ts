import { ByteVector } from '../../core/ByteVector';
import type { SymbolTable } from '../../core/SymbolTable';
import { INVOKEINTERFACE } from '../../core/Opcodes';
import { Type } from '../../core/Type';

/**
 * Writes method invocation instructions (INVOKEVIRTUAL, INVOKESPECIAL, INVOKESTATIC, INVOKEINTERFACE).
 */
export class MethodInsnWriter {
  /**
   * Writes a method invocation instruction.
   * @param code the code byte vector
   * @param opcode the opcode
   * @param owner the internal name of the method's owner class
   * @param name the method's name
   * @param descriptor the method's descriptor
   * @param isInterface whether the owner is an interface
   * @param symbolTable the symbol table for adding constants
   */
  static writeMethodInsn(
    code: ByteVector,
    opcode: number,
    owner: string,
    name: string,
    descriptor: string,
    isInterface: boolean,
    symbolTable: SymbolTable
  ): void {
    const methodrefSymbol = symbolTable.addConstantMethodref(owner, name, descriptor, isInterface);
    
    if (opcode === INVOKEINTERFACE) {
      // INVOKEINTERFACE has count and 0 bytes after the constant pool index
      const argumentsAndReturnSize = Type.getArgumentsAndReturnSizes(descriptor);
      const argCount = argumentsAndReturnSize >> 2;
      code.put12(opcode, methodrefSymbol.index);
      code.put11(argCount, 0);
    } else {
      code.put12(opcode, methodrefSymbol.index);
    }
  }

  /**
   * Returns the instruction size.
   * @param opcode the opcode
   */
  static getInsnSize(opcode: number): number {
    if (opcode === INVOKEINTERFACE) {
      return 5;
    }
    return 3;
  }
}
