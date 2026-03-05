import { ByteVector } from '../../core/ByteVector';
import { ILOAD, LLOAD, FLOAD, DLOAD, ALOAD, ISTORE, LSTORE, FSTORE, DSTORE, ASTORE, RET } from '../../core/Opcodes';
import {
  ILOAD_0,
  LLOAD_0,
  FLOAD_0,
  DLOAD_0,
  ALOAD_0,
  ISTORE_0,
  LSTORE_0,
  FSTORE_0,
  DSTORE_0,
  ASTORE_0,
  WIDE,
} from '../../core/Constants';

/**
 * Writes local variable instructions (xLOAD, xSTORE, RET).
 */
export class VarInsnWriter {
  /**
   * Writes a variable instruction with automatic optimization.
   * Uses xLOAD_n/xSTORE_n forms when possible, WIDE when necessary.
   * @param code the code byte vector
   * @param opcode the opcode (ILOAD, LLOAD, etc.)
   * @param varIndex the local variable index
   */
  static writeVarInsn(code: ByteVector, opcode: number, varIndex: number): void {
    // Try to use optimized form (xLOAD_n, xSTORE_n)
    if (varIndex < 4) {
      const optimizedOpcode = VarInsnWriter.getOptimizedOpcode(opcode, varIndex);
      if (optimizedOpcode !== -1) {
        code.putByte(optimizedOpcode);
        return;
      }
    }

    // Use WIDE prefix if variable index >= 256
    if (varIndex >= 256) {
      code.putByte(WIDE);
      code.putByte(opcode);
      code.putShort(varIndex);
    } else {
      code.put11(opcode, varIndex);
    }
  }

  /**
   * Gets the optimized opcode for a given base opcode and variable index.
   * @returns the optimized opcode or -1 if not available
   */
  private static getOptimizedOpcode(opcode: number, varIndex: number): number {
    if (varIndex > 3) return -1;
    
    switch (opcode) {
      case ILOAD:
        return ILOAD_0 + varIndex;
      case LLOAD:
        return LLOAD_0 + varIndex;
      case FLOAD:
        return FLOAD_0 + varIndex;
      case DLOAD:
        return DLOAD_0 + varIndex;
      case ALOAD:
        return ALOAD_0 + varIndex;
      case ISTORE:
        return ISTORE_0 + varIndex;
      case LSTORE:
        return LSTORE_0 + varIndex;
      case FSTORE:
        return FSTORE_0 + varIndex;
      case DSTORE:
        return DSTORE_0 + varIndex;
      case ASTORE:
        return ASTORE_0 + varIndex;
      default:
        return -1;
    }
  }

  /**
   * Writes a RET instruction.
   * @param code the code byte vector
   * @param varIndex the local variable index
   */
  static writeRet(code: ByteVector, varIndex: number): void {
    if (varIndex >= 256) {
      code.putByte(WIDE);
      code.putByte(RET);
      code.putShort(varIndex);
    } else {
      code.put11(RET, varIndex);
    }
  }

  /**
   * Returns the size of a variable instruction (depends on optimization and WIDE).
   * @param opcode the opcode
   * @param varIndex the variable index
   */
  static getInsnSize(opcode: number, varIndex: number): number {
    // Check if can use optimized form
    if (varIndex < 4 && opcode !== RET) {
      const optimizedOpcode = VarInsnWriter.getOptimizedOpcode(opcode, varIndex);
      if (optimizedOpcode !== -1) {
        return 1;
      }
    }
    // WIDE form
    if (varIndex >= 256) {
      return 4;
    }
    // Normal form
    return 2;
  }
}
