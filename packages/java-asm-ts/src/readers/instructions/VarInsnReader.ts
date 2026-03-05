import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { ILOAD, LLOAD, FLOAD, DLOAD, ALOAD, ISTORE, LSTORE, FSTORE, DSTORE, ASTORE, RET } from '../../core/Opcodes';
import {
  ILOAD_0,
  ILOAD_3,
  LLOAD_0,
  LLOAD_3,
  FLOAD_0,
  FLOAD_3,
  DLOAD_0,
  DLOAD_3,
  ALOAD_0,
  ALOAD_3,
  ISTORE_0,
  ISTORE_3,
  LSTORE_0,
  LSTORE_3,
  FSTORE_0,
  FSTORE_3,
  DSTORE_0,
  DSTORE_3,
  ASTORE_0,
  ASTORE_3,
} from '../../core/Constants';

/**
 * Reads local variable instructions (xLOAD, xSTORE, RET).
 */
export class VarInsnReader {
  /**
   * Checks if the given opcode is a variable instruction (including optimized forms).
   */
  static isVarInsn(opcode: number): boolean {
    return (
      (opcode >= ILOAD && opcode <= ALOAD) ||
      (opcode >= ISTORE && opcode <= ASTORE) ||
      opcode === RET ||
      (opcode >= ILOAD_0 && opcode <= ALOAD_3) ||
      (opcode >= ISTORE_0 && opcode <= ASTORE_3)
    );
  }

  /**
   * Checks if the given opcode is an optimized xLOAD_n or xSTORE_n instruction.
   */
  static isOptimizedVarInsn(opcode: number): boolean {
    return (opcode >= ILOAD_0 && opcode <= ALOAD_3) || (opcode >= ISTORE_0 && opcode <= ASTORE_3);
  }

  /**
   * Reads an optimized xLOAD_n instruction.
   */
  static readOptimizedLoad(methodVisitor: MethodVisitor, opcode: number): void {
    if (opcode >= ILOAD_0 && opcode <= ILOAD_3) {
      methodVisitor.visitVarInsn(ILOAD, opcode - ILOAD_0);
    } else if (opcode >= LLOAD_0 && opcode <= LLOAD_3) {
      methodVisitor.visitVarInsn(LLOAD, opcode - LLOAD_0);
    } else if (opcode >= FLOAD_0 && opcode <= FLOAD_3) {
      methodVisitor.visitVarInsn(FLOAD, opcode - FLOAD_0);
    } else if (opcode >= DLOAD_0 && opcode <= DLOAD_3) {
      methodVisitor.visitVarInsn(DLOAD, opcode - DLOAD_0);
    } else if (opcode >= ALOAD_0 && opcode <= ALOAD_3) {
      methodVisitor.visitVarInsn(ALOAD, opcode - ALOAD_0);
    }
  }

  /**
   * Reads an optimized xSTORE_n instruction.
   */
  static readOptimizedStore(methodVisitor: MethodVisitor, opcode: number): void {
    if (opcode >= ISTORE_0 && opcode <= ISTORE_3) {
      methodVisitor.visitVarInsn(ISTORE, opcode - ISTORE_0);
    } else if (opcode >= LSTORE_0 && opcode <= LSTORE_3) {
      methodVisitor.visitVarInsn(LSTORE, opcode - LSTORE_0);
    } else if (opcode >= FSTORE_0 && opcode <= FSTORE_3) {
      methodVisitor.visitVarInsn(FSTORE, opcode - FSTORE_0);
    } else if (opcode >= DSTORE_0 && opcode <= DSTORE_3) {
      methodVisitor.visitVarInsn(DSTORE, opcode - DSTORE_0);
    } else if (opcode >= ASTORE_0 && opcode <= ASTORE_3) {
      methodVisitor.visitVarInsn(ASTORE, opcode - ASTORE_0);
    }
  }

  /**
   * Reads a regular xLOAD, xSTORE, or RET instruction.
   * @param methodVisitor the method visitor
   * @param opcode the opcode
   * @param buffer the class file buffer
   * @param offset the current offset (at the operand)
   * @param isWide whether the instruction is prefixed with WIDE
   */
  static readVarInsn(
    methodVisitor: MethodVisitor,
    opcode: number,
    buffer: Uint8Array,
    offset: number,
    isWide: boolean
  ): void {
    let varIndex: number;
    if (isWide) {
      // WIDE prefix: 2-byte operand
      varIndex = ((buffer[offset]! << 8) | buffer[offset + 1]!) & 0xFFFF;
    } else {
      // 1-byte operand
      varIndex = buffer[offset]! & 0xFF;
    }
    methodVisitor.visitVarInsn(opcode, varIndex);
  }

  /**
   * Returns the instruction size including the opcode.
   * @param opcode the opcode
   * @param isWide whether WIDE prefix is used
   * @returns the instruction size in bytes (not including WIDE prefix)
   */
  static getInstructionSize(opcode: number, isWide: boolean): number {
    if (VarInsnReader.isOptimizedVarInsn(opcode)) {
      return 1; // Just the opcode
    }
    if (isWide) {
      return 3; // opcode + 2 bytes
    }
    return 2; // opcode + 1 byte
  }

  /**
   * Reads and dispatches a variable instruction.
   * @param opcode the opcode
   * @param buffer the class file buffer
   * @param offset the current offset (at the opcode)
   * @param methodVisitor the method visitor
   * @param isWide whether WIDE prefix is used
   * @returns the number of bytes read
   */
  static read(
    opcode: number,
    buffer: Uint8Array,
    offset: number,
    methodVisitor: MethodVisitor,
    isWide: boolean
  ): number {
    if (opcode >= ILOAD_0 && opcode <= ALOAD_3) {
      VarInsnReader.readOptimizedLoad(methodVisitor, opcode);
      return 1;
    }
    if (opcode >= ISTORE_0 && opcode <= ASTORE_3) {
      VarInsnReader.readOptimizedStore(methodVisitor, opcode);
      return 1;
    }
    // Regular var instruction
    VarInsnReader.readVarInsn(methodVisitor, opcode, buffer, offset + 1, isWide);
    return isWide ? 3 : 2;
  }

  // Alias for backwards compatibility
  static getInsnSize = VarInsnReader.getInstructionSize;
}

/**
 * Returns the base opcode for an optimized instruction.
 */
export function getBaseOpcode(opcode: number): number {
  if (opcode >= ILOAD_0 && opcode <= ILOAD_3) return ILOAD;
  if (opcode >= LLOAD_0 && opcode <= LLOAD_3) return LLOAD;
  if (opcode >= FLOAD_0 && opcode <= FLOAD_3) return FLOAD;
  if (opcode >= DLOAD_0 && opcode <= DLOAD_3) return DLOAD;
  if (opcode >= ALOAD_0 && opcode <= ALOAD_3) return ALOAD;
  if (opcode >= ISTORE_0 && opcode <= ISTORE_3) return ISTORE;
  if (opcode >= LSTORE_0 && opcode <= LSTORE_3) return LSTORE;
  if (opcode >= FSTORE_0 && opcode <= FSTORE_3) return FSTORE;
  if (opcode >= DSTORE_0 && opcode <= DSTORE_3) return DSTORE;
  if (opcode >= ASTORE_0 && opcode <= ASTORE_3) return ASTORE;
  return opcode;
}

/**
 * Returns the variable index for an optimized instruction.
 */
export function getOptimizedVarIndex(opcode: number): number {
  if (opcode >= ILOAD_0 && opcode <= ILOAD_3) return opcode - ILOAD_0;
  if (opcode >= LLOAD_0 && opcode <= LLOAD_3) return opcode - LLOAD_0;
  if (opcode >= FLOAD_0 && opcode <= FLOAD_3) return opcode - FLOAD_0;
  if (opcode >= DLOAD_0 && opcode <= DLOAD_3) return opcode - DLOAD_0;
  if (opcode >= ALOAD_0 && opcode <= ALOAD_3) return opcode - ALOAD_0;
  if (opcode >= ISTORE_0 && opcode <= ISTORE_3) return opcode - ISTORE_0;
  if (opcode >= LSTORE_0 && opcode <= LSTORE_3) return opcode - LSTORE_0;
  if (opcode >= FSTORE_0 && opcode <= FSTORE_3) return opcode - FSTORE_0;
  if (opcode >= DSTORE_0 && opcode <= DSTORE_3) return opcode - DSTORE_0;
  if (opcode >= ASTORE_0 && opcode <= ASTORE_3) return opcode - ASTORE_0;
  return -1;
}
