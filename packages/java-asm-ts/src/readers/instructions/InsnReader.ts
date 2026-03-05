import type { MethodVisitor } from '../../visitors/MethodVisitor';
import {
  NOP,
  ACONST_NULL,
  ICONST_M1,
  ICONST_0,
  ICONST_1,
  ICONST_2,
  ICONST_3,
  ICONST_4,
  ICONST_5,
  LCONST_0,
  LCONST_1,
  FCONST_0,
  FCONST_1,
  FCONST_2,
  DCONST_0,
  DCONST_1,
  IALOAD,
  LALOAD,
  FALOAD,
  DALOAD,
  AALOAD,
  BALOAD,
  CALOAD,
  SALOAD,
  IASTORE,
  LASTORE,
  FASTORE,
  DASTORE,
  AASTORE,
  BASTORE,
  CASTORE,
  SASTORE,
  POP,
  POP2,
  DUP,
  DUP_X1,
  DUP_X2,
  DUP2,
  DUP2_X1,
  DUP2_X2,
  SWAP,
  IADD,
  LADD,
  FADD,
  DADD,
  ISUB,
  LSUB,
  FSUB,
  DSUB,
  IMUL,
  LMUL,
  FMUL,
  DMUL,
  IDIV,
  LDIV,
  FDIV,
  DDIV,
  IREM,
  LREM,
  FREM,
  DREM,
  INEG,
  LNEG,
  FNEG,
  DNEG,
  ISHL,
  LSHL,
  ISHR,
  LSHR,
  IUSHR,
  LUSHR,
  IAND,
  LAND,
  IOR,
  LOR,
  IXOR,
  LXOR,
  I2L,
  I2F,
  I2D,
  L2I,
  L2F,
  L2D,
  F2I,
  F2L,
  F2D,
  D2I,
  D2L,
  D2F,
  I2B,
  I2C,
  I2S,
  LCMP,
  FCMPL,
  FCMPG,
  DCMPL,
  DCMPG,
  IRETURN,
  LRETURN,
  FRETURN,
  DRETURN,
  ARETURN,
  RETURN,
  ARRAYLENGTH,
  ATHROW,
  MONITORENTER,
  MONITOREXIT,
} from '../../core/Opcodes';

/**
 * Set of zero-operand instruction opcodes.
 */
export const ZERO_OPERAND_INSTRUCTIONS = new Set([
  NOP,
  ACONST_NULL,
  ICONST_M1,
  ICONST_0,
  ICONST_1,
  ICONST_2,
  ICONST_3,
  ICONST_4,
  ICONST_5,
  LCONST_0,
  LCONST_1,
  FCONST_0,
  FCONST_1,
  FCONST_2,
  DCONST_0,
  DCONST_1,
  IALOAD,
  LALOAD,
  FALOAD,
  DALOAD,
  AALOAD,
  BALOAD,
  CALOAD,
  SALOAD,
  IASTORE,
  LASTORE,
  FASTORE,
  DASTORE,
  AASTORE,
  BASTORE,
  CASTORE,
  SASTORE,
  POP,
  POP2,
  DUP,
  DUP_X1,
  DUP_X2,
  DUP2,
  DUP2_X1,
  DUP2_X2,
  SWAP,
  IADD,
  LADD,
  FADD,
  DADD,
  ISUB,
  LSUB,
  FSUB,
  DSUB,
  IMUL,
  LMUL,
  FMUL,
  DMUL,
  IDIV,
  LDIV,
  FDIV,
  DDIV,
  IREM,
  LREM,
  FREM,
  DREM,
  INEG,
  LNEG,
  FNEG,
  DNEG,
  ISHL,
  LSHL,
  ISHR,
  LSHR,
  IUSHR,
  LUSHR,
  IAND,
  LAND,
  IOR,
  LOR,
  IXOR,
  LXOR,
  I2L,
  I2F,
  I2D,
  L2I,
  L2F,
  L2D,
  F2I,
  F2L,
  F2D,
  D2I,
  D2L,
  D2F,
  I2B,
  I2C,
  I2S,
  LCMP,
  FCMPL,
  FCMPG,
  DCMPL,
  DCMPG,
  IRETURN,
  LRETURN,
  FRETURN,
  DRETURN,
  ARETURN,
  RETURN,
  ARRAYLENGTH,
  ATHROW,
  MONITORENTER,
  MONITOREXIT,
]);

/**
 * Reads and dispatches zero-operand instructions.
 */
export class InsnReader {
  /**
   * Checks if the given opcode is a zero-operand instruction.
   * @param opcode the opcode to check
   * @returns true if zero-operand
   */
  static isZeroOperandInsn(opcode: number): boolean {
    return ZERO_OPERAND_INSTRUCTIONS.has(opcode);
  }

  /**
   * Reads a zero-operand instruction.
   * @param methodVisitor the method visitor to dispatch to
   * @param opcode the opcode
   */
  static readInsn(methodVisitor: MethodVisitor, opcode: number): void {
    methodVisitor.visitInsn(opcode);
  }

  /**
   * Returns the size of a zero-operand instruction (always 1).
   */
  static getInsnSize(): number {
    return 1;
  }
}

/**
 * Returns the instruction name for debugging purposes.
 * @param opcode the opcode
 * @returns the instruction name
 */
export function getInsnName(opcode: number): string {
  switch (opcode) {
    case NOP: return 'NOP';
    case ACONST_NULL: return 'ACONST_NULL';
    case ICONST_M1: return 'ICONST_M1';
    case ICONST_0: return 'ICONST_0';
    case ICONST_1: return 'ICONST_1';
    case ICONST_2: return 'ICONST_2';
    case ICONST_3: return 'ICONST_3';
    case ICONST_4: return 'ICONST_4';
    case ICONST_5: return 'ICONST_5';
    case LCONST_0: return 'LCONST_0';
    case LCONST_1: return 'LCONST_1';
    case FCONST_0: return 'FCONST_0';
    case FCONST_1: return 'FCONST_1';
    case FCONST_2: return 'FCONST_2';
    case DCONST_0: return 'DCONST_0';
    case DCONST_1: return 'DCONST_1';
    case IALOAD: return 'IALOAD';
    case LALOAD: return 'LALOAD';
    case FALOAD: return 'FALOAD';
    case DALOAD: return 'DALOAD';
    case AALOAD: return 'AALOAD';
    case BALOAD: return 'BALOAD';
    case CALOAD: return 'CALOAD';
    case SALOAD: return 'SALOAD';
    case IASTORE: return 'IASTORE';
    case LASTORE: return 'LASTORE';
    case FASTORE: return 'FASTORE';
    case DASTORE: return 'DASTORE';
    case AASTORE: return 'AASTORE';
    case BASTORE: return 'BASTORE';
    case CASTORE: return 'CASTORE';
    case SASTORE: return 'SASTORE';
    case POP: return 'POP';
    case POP2: return 'POP2';
    case DUP: return 'DUP';
    case DUP_X1: return 'DUP_X1';
    case DUP_X2: return 'DUP_X2';
    case DUP2: return 'DUP2';
    case DUP2_X1: return 'DUP2_X1';
    case DUP2_X2: return 'DUP2_X2';
    case SWAP: return 'SWAP';
    case IADD: return 'IADD';
    case LADD: return 'LADD';
    case FADD: return 'FADD';
    case DADD: return 'DADD';
    case ISUB: return 'ISUB';
    case LSUB: return 'LSUB';
    case FSUB: return 'FSUB';
    case DSUB: return 'DSUB';
    case IMUL: return 'IMUL';
    case LMUL: return 'LMUL';
    case FMUL: return 'FMUL';
    case DMUL: return 'DMUL';
    case IDIV: return 'IDIV';
    case LDIV: return 'LDIV';
    case FDIV: return 'FDIV';
    case DDIV: return 'DDIV';
    case IREM: return 'IREM';
    case LREM: return 'LREM';
    case FREM: return 'FREM';
    case DREM: return 'DREM';
    case INEG: return 'INEG';
    case LNEG: return 'LNEG';
    case FNEG: return 'FNEG';
    case DNEG: return 'DNEG';
    case ISHL: return 'ISHL';
    case LSHL: return 'LSHL';
    case ISHR: return 'ISHR';
    case LSHR: return 'LSHR';
    case IUSHR: return 'IUSHR';
    case LUSHR: return 'LUSHR';
    case IAND: return 'IAND';
    case LAND: return 'LAND';
    case IOR: return 'IOR';
    case LOR: return 'LOR';
    case IXOR: return 'IXOR';
    case LXOR: return 'LXOR';
    case I2L: return 'I2L';
    case I2F: return 'I2F';
    case I2D: return 'I2D';
    case L2I: return 'L2I';
    case L2F: return 'L2F';
    case L2D: return 'L2D';
    case F2I: return 'F2I';
    case F2L: return 'F2L';
    case F2D: return 'F2D';
    case D2I: return 'D2I';
    case D2L: return 'D2L';
    case D2F: return 'D2F';
    case I2B: return 'I2B';
    case I2C: return 'I2C';
    case I2S: return 'I2S';
    case LCMP: return 'LCMP';
    case FCMPL: return 'FCMPL';
    case FCMPG: return 'FCMPG';
    case DCMPL: return 'DCMPL';
    case DCMPG: return 'DCMPG';
    case IRETURN: return 'IRETURN';
    case LRETURN: return 'LRETURN';
    case FRETURN: return 'FRETURN';
    case DRETURN: return 'DRETURN';
    case ARETURN: return 'ARETURN';
    case RETURN: return 'RETURN';
    case ARRAYLENGTH: return 'ARRAYLENGTH';
    case ATHROW: return 'ATHROW';
    case MONITORENTER: return 'MONITORENTER';
    case MONITOREXIT: return 'MONITOREXIT';
    default: return `OPCODE_${opcode}`;
  }
}
