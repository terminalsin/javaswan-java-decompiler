import { describe, it, expect, vi } from 'vitest';
import { IntInsnReader } from '../../../src/readers/instructions/IntInsnReader';
import type { MethodVisitor } from '../../../src/visitors/MethodVisitor';
import * as Opcodes from '../../../src/core/Opcodes';

describe('IntInsnReader', () => {
    describe('isIntInsn', () => {
        it('should identify BIPUSH as int instruction', () => {
            expect(IntInsnReader.isIntInsn(Opcodes.BIPUSH)).toBe(true);
        });

        it('should identify SIPUSH as int instruction', () => {
            expect(IntInsnReader.isIntInsn(Opcodes.SIPUSH)).toBe(true);
        });

        it('should identify NEWARRAY as int instruction', () => {
            expect(IntInsnReader.isIntInsn(Opcodes.NEWARRAY)).toBe(true);
        });

        it('should NOT identify other opcodes as int instructions', () => {
            expect(IntInsnReader.isIntInsn(Opcodes.NOP)).toBe(false);
            expect(IntInsnReader.isIntInsn(Opcodes.ILOAD)).toBe(false);
            expect(IntInsnReader.isIntInsn(Opcodes.LDC)).toBe(false);
            expect(IntInsnReader.isIntInsn(Opcodes.NEW)).toBe(false);
        });
    });

    describe('read BIPUSH', () => {
        it('should read positive BIPUSH operand', () => {
            const code = new Uint8Array([Opcodes.BIPUSH, 42]);
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.BIPUSH, code, 0, mockVisitor);

            expect(bytesRead).toBe(2);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.BIPUSH, 42);
        });

        it('should read negative BIPUSH operand (signed)', () => {
            const code = new Uint8Array([Opcodes.BIPUSH, 0xFF]); // -1 as signed byte
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.BIPUSH, code, 0, mockVisitor);

            expect(bytesRead).toBe(2);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.BIPUSH, -1);
        });

        it('should read BIPUSH with offset', () => {
            const code = new Uint8Array([0x00, 0x00, Opcodes.BIPUSH, 100]);
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.BIPUSH, code, 2, mockVisitor);

            expect(bytesRead).toBe(2);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.BIPUSH, 100);
        });
    });

    describe('read SIPUSH', () => {
        it('should read positive SIPUSH operand', () => {
            const code = new Uint8Array([Opcodes.SIPUSH, 0x01, 0x00]); // 256
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.SIPUSH, code, 0, mockVisitor);

            expect(bytesRead).toBe(3);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.SIPUSH, 256);
        });

        it('should read maximum SIPUSH value', () => {
            const code = new Uint8Array([Opcodes.SIPUSH, 0x7F, 0xFF]); // 32767
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.SIPUSH, code, 0, mockVisitor);

            expect(bytesRead).toBe(3);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.SIPUSH, 32767);
        });

        it('should read negative SIPUSH value', () => {
            const code = new Uint8Array([Opcodes.SIPUSH, 0xFF, 0xFF]); // -1 as signed short
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.SIPUSH, code, 0, mockVisitor);

            expect(bytesRead).toBe(3);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.SIPUSH, -1);
        });
    });

    describe('read NEWARRAY', () => {
        it('should read NEWARRAY with T_BOOLEAN', () => {
            const code = new Uint8Array([Opcodes.NEWARRAY, Opcodes.T_BOOLEAN]);
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.NEWARRAY, code, 0, mockVisitor);

            expect(bytesRead).toBe(2);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.NEWARRAY, Opcodes.T_BOOLEAN);
        });

        it('should read NEWARRAY with T_CHAR', () => {
            const code = new Uint8Array([Opcodes.NEWARRAY, Opcodes.T_CHAR]);
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.NEWARRAY, code, 0, mockVisitor);

            expect(bytesRead).toBe(2);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.NEWARRAY, Opcodes.T_CHAR);
        });

        it('should read NEWARRAY with T_INT', () => {
            const code = new Uint8Array([Opcodes.NEWARRAY, Opcodes.T_INT]);
            const mockVisitor = {
                visitIntInsn: vi.fn()
            } as unknown as MethodVisitor;

            const bytesRead = IntInsnReader.read(Opcodes.NEWARRAY, code, 0, mockVisitor);

            expect(bytesRead).toBe(2);
            expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.NEWARRAY, Opcodes.T_INT);
        });

        it('should read NEWARRAY with all primitive types', () => {
            const types = [
                Opcodes.T_BOOLEAN, Opcodes.T_CHAR, Opcodes.T_FLOAT, Opcodes.T_DOUBLE,
                Opcodes.T_BYTE, Opcodes.T_SHORT, Opcodes.T_INT, Opcodes.T_LONG
            ];

            for (const arrayType of types) {
                const code = new Uint8Array([Opcodes.NEWARRAY, arrayType]);
                const mockVisitor = {
                    visitIntInsn: vi.fn()
                } as unknown as MethodVisitor;

                const bytesRead = IntInsnReader.read(Opcodes.NEWARRAY, code, 0, mockVisitor);

                expect(bytesRead).toBe(2);
                expect(mockVisitor.visitIntInsn).toHaveBeenCalledWith(Opcodes.NEWARRAY, arrayType);
            }
        });
    });

    describe('getInstructionSize', () => {
        it('should return 2 for BIPUSH', () => {
            expect(IntInsnReader.getInstructionSize(Opcodes.BIPUSH)).toBe(2);
        });

        it('should return 2 for NEWARRAY', () => {
            expect(IntInsnReader.getInstructionSize(Opcodes.NEWARRAY)).toBe(2);
        });

        it('should return 3 for SIPUSH', () => {
            expect(IntInsnReader.getInstructionSize(Opcodes.SIPUSH)).toBe(3);
        });
    });
});
