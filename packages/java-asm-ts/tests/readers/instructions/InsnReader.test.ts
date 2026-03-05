import { describe, it, expect, vi } from 'vitest';
import { InsnReader } from '../../../src/readers/instructions/InsnReader';
import type { MethodVisitor } from '../../../src/visitors/MethodVisitor';
import * as Opcodes from '../../../src/core/Opcodes';

describe('InsnReader', () => {
    describe('isZeroOperandInsn', () => {
        it('should identify NOP as zero-operand instruction', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.NOP)).toBe(true);
        });

        it('should identify ACONST_NULL as zero-operand instruction', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.ACONST_NULL)).toBe(true);
        });

        it('should identify all ICONST_* as zero-operand instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_M1)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_0)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_1)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_2)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_3)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_4)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ICONST_5)).toBe(true);
        });

        it('should identify LCONST_* as zero-operand instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.LCONST_0)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LCONST_1)).toBe(true);
        });

        it('should identify FCONST_* as zero-operand instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.FCONST_0)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FCONST_1)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FCONST_2)).toBe(true);
        });

        it('should identify DCONST_* as zero-operand instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.DCONST_0)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DCONST_1)).toBe(true);
        });

        it('should identify array load/store instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.IALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.AALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.BALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.CALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.SALOAD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.IASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.AASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.BASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.CASTORE)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.SASTORE)).toBe(true);
        });

        it('should identify stack manipulation instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.POP)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.POP2)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DUP)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DUP_X1)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DUP_X2)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DUP2)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DUP2_X1)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DUP2_X2)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.SWAP)).toBe(true);
        });

        it('should identify arithmetic instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.IADD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LADD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FADD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DADD)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ISUB)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LSUB)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FSUB)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DSUB)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.IMUL)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LMUL)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FMUL)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DMUL)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.IDIV)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LDIV)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FDIV)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DDIV)).toBe(true);
        });

        it('should identify return instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.IRETURN)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LRETURN)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.FRETURN)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.DRETURN)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ARETURN)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.RETURN)).toBe(true);
        });

        it('should identify ATHROW and MONITORENTER/EXIT', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.ATHROW)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.MONITORENTER)).toBe(true);
            expect(InsnReader.isZeroOperandInsn(Opcodes.MONITOREXIT)).toBe(true);
        });

        it('should identify ARRAYLENGTH', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.ARRAYLENGTH)).toBe(true);
        });

        it('should NOT identify non-zero-operand instructions', () => {
            expect(InsnReader.isZeroOperandInsn(Opcodes.BIPUSH)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.SIPUSH)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.LDC)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.ILOAD)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.IFEQ)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.NEW)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.GETFIELD)).toBe(false);
            expect(InsnReader.isZeroOperandInsn(Opcodes.INVOKEVIRTUAL)).toBe(false);
        });
    });

    describe('readInsn', () => {
        it('should call visitInsn on the method visitor', () => {
            const mockVisitor = {
                visitInsn: vi.fn()
            } as unknown as MethodVisitor;

            InsnReader.readInsn(mockVisitor, Opcodes.NOP);
            expect(mockVisitor.visitInsn).toHaveBeenCalledWith(Opcodes.NOP);
        });

        it('should call visitInsn for each zero-operand instruction', () => {
            const opcodes = [
                Opcodes.NOP, Opcodes.ACONST_NULL, Opcodes.ICONST_0, Opcodes.LCONST_0,
                Opcodes.FCONST_0, Opcodes.DCONST_0, Opcodes.IALOAD, Opcodes.IASTORE,
                Opcodes.POP, Opcodes.DUP, Opcodes.IADD, Opcodes.IRETURN
            ];

            for (const opcode of opcodes) {
                const mockVisitor = {
                    visitInsn: vi.fn()
                } as unknown as MethodVisitor;

                InsnReader.readInsn(mockVisitor, opcode);
                expect(mockVisitor.visitInsn).toHaveBeenCalledWith(opcode);
            }
        });
    });

    describe('getInsnSize', () => {
        it('should return 1 for all zero-operand instructions', () => {
            expect(InsnReader.getInsnSize()).toBe(1);
        });
    });
});
