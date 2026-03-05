import type { MethodVisitor } from '../../visitors/MethodVisitor';
import { BIPUSH, SIPUSH, NEWARRAY } from '../../core/Opcodes';

/**
 * Reads instructions with a single integer operand (BIPUSH, SIPUSH, NEWARRAY).
 */
export class IntInsnReader {
    /**
     * Checks if the given opcode is an int operand instruction.
     * @param opcode the opcode to check
     * @returns true if int operand instruction
     */
    static isIntInsn(opcode: number): boolean {
        return opcode === BIPUSH || opcode === SIPUSH || opcode === NEWARRAY;
    }

    /**
     * Returns the instruction size including the opcode.
     * @param opcode the opcode
     * @returns the instruction size in bytes
     */
    static getInstructionSize(opcode: number): number {
        switch (opcode) {
            case BIPUSH:
                return 2; // opcode + 1 byte
            case SIPUSH:
                return 3; // opcode + 2 bytes
            case NEWARRAY:
                return 2; // opcode + 1 byte
            default:
                throw new Error('Not an int operand instruction: ' + opcode);
        }
    }

    /**
     * Reads an int operand instruction.
     * @param opcode the opcode
     * @param buffer the class file buffer
     * @param offset the current offset (at the opcode)
     * @param methodVisitor the method visitor
     * @returns the number of bytes read
     */
    static read(
        opcode: number,
        buffer: Uint8Array,
        offset: number,
        methodVisitor: MethodVisitor
    ): number {
        switch (opcode) {
            case BIPUSH: {
                // BIPUSH operand is a signed byte
                let value = buffer[offset + 1]!;
                if (value > 127) {
                    value = value - 256;
                }
                methodVisitor.visitIntInsn(BIPUSH, value);
                return 2;
            }
            case SIPUSH: {
                // SIPUSH operand is a signed short (big-endian)
                let value = ((buffer[offset + 1]! << 8) | buffer[offset + 2]!) & 0xFFFF;
                if (value > 32767) {
                    value = value - 65536;
                }
                methodVisitor.visitIntInsn(SIPUSH, value);
                return 3;
            }
            case NEWARRAY: {
                // NEWARRAY operand is an array type code
                const atype = buffer[offset + 1]!;
                methodVisitor.visitIntInsn(NEWARRAY, atype);
                return 2;
            }
            default:
                throw new Error('Not an int operand instruction: ' + opcode);
        }
    }

    // Aliases for backwards compatibility
    static getInsnSize = IntInsnReader.getInstructionSize;
    static readIntInsn(
        methodVisitor: MethodVisitor,
        opcode: number,
        buffer: Uint8Array,
        offset: number
    ): void {
        IntInsnReader.read(opcode, buffer, offset, methodVisitor);
    }
}
