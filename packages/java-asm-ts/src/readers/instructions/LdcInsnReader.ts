import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { LDC } from '../../core/Opcodes';
import { LDC_W, LDC2_W } from '../../core/Constants';

/**
 * Context for reading LDC instructions.
 */
export interface LdcInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Reads a constant value from the constant pool (for LDC/LDC_W). */
  readConst(cpIndex: number): unknown;
  
  /** Reads a long constant from the constant pool (for LDC2_W). */
  readConstLong(cpIndex: number): unknown;
  
  /** Reads an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads LDC instructions (LDC, LDC_W, LDC2_W).
 */
export class LdcInsnReader {
  /**
   * Checks if the given opcode is an LDC instruction.
   */
  static isLdcInsn(opcode: number): boolean {
    return opcode === LDC || opcode === LDC_W || opcode === LDC2_W;
  }

  /**
   * Reads an LDC instruction (1-byte index).
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readLdc(methodVisitor: MethodVisitor, context: LdcInsnContext, offset: number): void {
    const buffer = context.classFileBuffer;
    const cpIndex = buffer[offset + 1]! & 0xFF;
    const value = context.readConst(cpIndex);
    methodVisitor.visitLdcInsn(value);
  }

  /**
   * Reads an LDC_W instruction (2-byte index).
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readLdcW(methodVisitor: MethodVisitor, context: LdcInsnContext, offset: number): void {
    const cpIndex = context.readUnsignedShort(offset + 1);
    const value = context.readConst(cpIndex);
    methodVisitor.visitLdcInsn(value);
  }

  /**
   * Reads an LDC2_W instruction (2-byte index, long/double constant).
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readLdc2W(methodVisitor: MethodVisitor, context: LdcInsnContext, offset: number): void {
    const cpIndex = context.readUnsignedShort(offset + 1);
    const value = context.readConstLong(cpIndex);
    methodVisitor.visitLdcInsn(value);
  }

  /**
   * Returns the instruction size including the opcode.
   * @param opcode the opcode
   */
  static getInsnSize(opcode: number): number {
    if (opcode === LDC) {
      return 2; // opcode + 1 byte
    }
    return 3; // opcode + 2 bytes (LDC_W, LDC2_W)
  }

  /**
   * Reads and dispatches an LDC instruction.
   */
  static read(
    methodVisitor: MethodVisitor,
    opcode: number,
    context: LdcInsnContext,
    offset: number
  ): number {
    switch (opcode) {
      case LDC:
        LdcInsnReader.readLdc(methodVisitor, context, offset);
        return 2;
      case LDC_W:
        LdcInsnReader.readLdcW(methodVisitor, context, offset);
        return 3;
      case LDC2_W:
        LdcInsnReader.readLdc2W(methodVisitor, context, offset);
        return 3;
      default:
        throw new Error('Not an LDC instruction: ' + opcode);
    }
  }
}
