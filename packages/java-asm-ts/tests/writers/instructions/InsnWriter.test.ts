import { describe, it, expect } from 'vitest';
import { InsnWriter } from '../../../src/writers/instructions/InsnWriter';
import { ByteVector } from '../../../src/core/ByteVector';
import * as Opcodes from '../../../src/core/Opcodes';

describe('InsnWriter', () => {
    describe('writeInsn', () => {
        it('should write NOP', () => {
            const code = new ByteVector();
            InsnWriter.writeInsn(code, Opcodes.NOP);
            expect(code.data[0]).toBe(Opcodes.NOP);
            expect(code.length).toBe(1);
        });

        it('should write ACONST_NULL', () => {
            const code = new ByteVector();
            InsnWriter.writeInsn(code, Opcodes.ACONST_NULL);
            expect(code.data[0]).toBe(Opcodes.ACONST_NULL);
            expect(code.length).toBe(1);
        });

        it('should write ICONST_M1', () => {
            const code = new ByteVector();
            InsnWriter.writeInsn(code, Opcodes.ICONST_M1);
            expect(code.data[0]).toBe(Opcodes.ICONST_M1);
            expect(code.length).toBe(1);
        });

        it('should write ICONST_0 through ICONST_5', () => {
            const opcodes = [
                Opcodes.ICONST_0, Opcodes.ICONST_1, Opcodes.ICONST_2,
                Opcodes.ICONST_3, Opcodes.ICONST_4, Opcodes.ICONST_5
            ];

            for (const opcode of opcodes) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write LCONST_0 and LCONST_1', () => {
            for (const opcode of [Opcodes.LCONST_0, Opcodes.LCONST_1]) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write array load instructions', () => {
            const opcodes = [
                Opcodes.IALOAD, Opcodes.LALOAD, Opcodes.FALOAD, Opcodes.DALOAD,
                Opcodes.AALOAD, Opcodes.BALOAD, Opcodes.CALOAD, Opcodes.SALOAD
            ];

            for (const opcode of opcodes) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write array store instructions', () => {
            const opcodes = [
                Opcodes.IASTORE, Opcodes.LASTORE, Opcodes.FASTORE, Opcodes.DASTORE,
                Opcodes.AASTORE, Opcodes.BASTORE, Opcodes.CASTORE, Opcodes.SASTORE
            ];

            for (const opcode of opcodes) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write stack manipulation instructions', () => {
            const opcodes = [
                Opcodes.POP, Opcodes.POP2, Opcodes.DUP, Opcodes.DUP_X1,
                Opcodes.DUP_X2, Opcodes.DUP2, Opcodes.DUP2_X1, Opcodes.DUP2_X2, Opcodes.SWAP
            ];

            for (const opcode of opcodes) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write arithmetic instructions', () => {
            const opcodes = [
                Opcodes.IADD, Opcodes.LADD, Opcodes.FADD, Opcodes.DADD,
                Opcodes.ISUB, Opcodes.LSUB, Opcodes.FSUB, Opcodes.DSUB,
                Opcodes.IMUL, Opcodes.LMUL, Opcodes.FMUL, Opcodes.DMUL,
                Opcodes.IDIV, Opcodes.LDIV, Opcodes.FDIV, Opcodes.DDIV
            ];

            for (const opcode of opcodes) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write return instructions', () => {
            const opcodes = [
                Opcodes.IRETURN, Opcodes.LRETURN, Opcodes.FRETURN,
                Opcodes.DRETURN, Opcodes.ARETURN, Opcodes.RETURN
            ];

            for (const opcode of opcodes) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write ATHROW', () => {
            const code = new ByteVector();
            InsnWriter.writeInsn(code, Opcodes.ATHROW);
            expect(code.data[0]).toBe(Opcodes.ATHROW);
            expect(code.length).toBe(1);
        });

        it('should write MONITORENTER and MONITOREXIT', () => {
            for (const opcode of [Opcodes.MONITORENTER, Opcodes.MONITOREXIT]) {
                const code = new ByteVector();
                InsnWriter.writeInsn(code, opcode);
                expect(code.data[0]).toBe(opcode);
                expect(code.length).toBe(1);
            }
        });

        it('should write ARRAYLENGTH', () => {
            const code = new ByteVector();
            InsnWriter.writeInsn(code, Opcodes.ARRAYLENGTH);
            expect(code.data[0]).toBe(Opcodes.ARRAYLENGTH);
            expect(code.length).toBe(1);
        });

        it('should write multiple instructions sequentially', () => {
            const code = new ByteVector();
            InsnWriter.writeInsn(code, Opcodes.ICONST_0);
            InsnWriter.writeInsn(code, Opcodes.ICONST_1);
            InsnWriter.writeInsn(code, Opcodes.IADD);
            InsnWriter.writeInsn(code, Opcodes.IRETURN);

            expect(code.length).toBe(4);
            expect(code.data[0]).toBe(Opcodes.ICONST_0);
            expect(code.data[1]).toBe(Opcodes.ICONST_1);
            expect(code.data[2]).toBe(Opcodes.IADD);
            expect(code.data[3]).toBe(Opcodes.IRETURN);
        });
    });

    describe('getInsnSize', () => {
        it('should return 1 for all zero-operand instructions', () => {
            expect(InsnWriter.getInsnSize()).toBe(1);
        });
    });
});
