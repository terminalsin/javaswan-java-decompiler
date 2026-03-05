import type { MethodVisitor } from '../../visitors/MethodVisitor';
import type { Handle } from '../../core/Handle';
import { INVOKEDYNAMIC } from '../../core/Opcodes';

/**
 * Context for reading invokedynamic instructions.
 */
export interface InvokeDynamicInsnContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Reads an invokedynamic constant from the constant pool. */
  readInvokeDynamic(cpIndex: number): {
    name: string;
    descriptor: string;
    bootstrapMethodHandle: Handle;
    bootstrapMethodArguments: unknown[];
  };
  
  /** Reads an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads invokedynamic instructions.
 */
export class InvokeDynamicInsnReader {
  /**
   * Checks if the given opcode is an invokedynamic instruction.
   */
  static isInvokeDynamicInsn(opcode: number): boolean {
    return opcode === INVOKEDYNAMIC;
  }

  /**
   * Reads an invokedynamic instruction.
   * @param methodVisitor the method visitor
   * @param context the reading context
   * @param offset the current offset (at the opcode)
   */
  static readInvokeDynamicInsn(
    methodVisitor: MethodVisitor,
    context: InvokeDynamicInsnContext,
    offset: number
  ): void {
    const cpIndex = context.readUnsignedShort(offset + 1);
    const { name, descriptor, bootstrapMethodHandle, bootstrapMethodArguments } =
      context.readInvokeDynamic(cpIndex);
    methodVisitor.visitInvokeDynamicInsn(
      name,
      descriptor,
      bootstrapMethodHandle,
      ...bootstrapMethodArguments
    );
  }

  /**
   * Returns the instruction size including the opcode.
   */
  static getInsnSize(): number {
    return 5; // opcode + 2 bytes (cp index) + 2 bytes (reserved, always 0)
  }
}
