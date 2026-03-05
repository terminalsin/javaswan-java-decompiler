import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { INVOKEVIRTUAL, INVOKESPECIAL, INVOKESTATIC, INVOKEINTERFACE } from '../../core/Opcodes';

/**
 * Context for reading method instructions.
 */
export interface MethodInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Reads a method reference from the constant pool. */
  readMethodref(cpIndex: number): { owner: string; name: string; descriptor: string; isInterface: boolean };
  
  /** Reads an interface method reference from the constant pool. */
  readInterfaceMethodref(cpIndex: number): { owner: string; name: string; descriptor: string };
  
  /** Reads an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads method invocation instructions (INVOKEVIRTUAL, INVOKESPECIAL, INVOKESTATIC, INVOKEINTERFACE).
 */
export class MethodInsnReader {
  /**
   * Checks if the given opcode is a method invocation instruction.
   */
  static isMethodInsn(opcode: number): boolean {
    return (
      opcode === INVOKEVIRTUAL ||
      opcode === INVOKESPECIAL ||
      opcode === INVOKESTATIC ||
      opcode === INVOKEINTERFACE
    );
  }

  /**
   * Reads a method invocation instruction.
   * @param methodVisitor the method visitor
   * @param opcode the opcode
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readMethodInsn(
    methodVisitor: MethodVisitor,
    opcode: number,
    context: MethodInsnContext,
    offset: number
  ): void {
    const cpIndex = context.readUnsignedShort(offset + 1);

    if (opcode === INVOKEINTERFACE) {
      const { owner, name, descriptor } = context.readInterfaceMethodref(cpIndex);
      methodVisitor.visitMethodInsn(opcode, owner, name, descriptor, true);
    } else {
      const { owner, name, descriptor, isInterface } = context.readMethodref(cpIndex);
      methodVisitor.visitMethodInsn(opcode, owner, name, descriptor, isInterface);
    }
  }

  /**
   * Returns the instruction size including the opcode.
   * @param opcode the opcode
   */
  static getInsnSize(opcode: number): number {
    if (opcode === INVOKEINTERFACE) {
      return 5; // opcode + 2 bytes (cp index) + 1 byte (count) + 1 byte (reserved)
    }
    return 3; // opcode + 2 bytes (constant pool index)
  }
}
