import { describe, it, expect, vi } from 'vitest';
import { JumpInsnReader } from '../../../src/readers/instructions/JumpInsnReader';
import { Label } from '../../../src/core/Label';
import type { MethodVisitor } from '../../../src/visitors/MethodVisitor';
import * as Opcodes from '../../../src/core/Opcodes';

describe('JumpInsnReader', () => {
  describe('isJumpInsn', () => {
    it('should identify conditional branch instructions', () => {
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFEQ)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFNE)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFLT)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFGE)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFGT)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFLE)).toBe(true);
    });

    it('should identify comparison branch instructions', () => {
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ICMPEQ)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ICMPNE)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ICMPLT)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ICMPGE)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ICMPGT)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ICMPLE)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ACMPEQ)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IF_ACMPNE)).toBe(true);
    });

    it('should identify GOTO', () => {
      expect(JumpInsnReader.isJumpInsn(Opcodes.GOTO)).toBe(true);
    });

    it('should identify JSR (deprecated but still valid)', () => {
      expect(JumpInsnReader.isJumpInsn(Opcodes.JSR)).toBe(true);
    });

    it('should identify IFNULL and IFNONNULL', () => {
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFNULL)).toBe(true);
      expect(JumpInsnReader.isJumpInsn(Opcodes.IFNONNULL)).toBe(true);
    });

    it('should NOT identify non-jump instructions', () => {
      expect(JumpInsnReader.isJumpInsn(Opcodes.NOP)).toBe(false);
      expect(JumpInsnReader.isJumpInsn(Opcodes.ILOAD)).toBe(false);
      expect(JumpInsnReader.isJumpInsn(Opcodes.RETURN)).toBe(false);
      expect(JumpInsnReader.isJumpInsn(Opcodes.TABLESWITCH)).toBe(false);
    });
  });

  describe('read', () => {
    it('should read IFEQ with forward branch', () => {
      // IFEQ +10 (branch offset 10)
      const code = new Uint8Array([Opcodes.IFEQ, 0x00, 0x0A]);
      const labels: (Label | null)[] = new Array(100).fill(null);
      const mockVisitor = {
        visitJumpInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = JumpInsnReader.read(Opcodes.IFEQ, code, 0, mockVisitor, labels, 0);
      
      expect(bytesRead).toBe(3);
      expect(mockVisitor.visitJumpInsn).toHaveBeenCalledTimes(1);
      const [opcode, label] = mockVisitor.visitJumpInsn.mock.calls[0]!;
      expect(opcode).toBe(Opcodes.IFEQ);
      expect(label).toBeInstanceOf(Label);
    });

    it('should read GOTO with backward branch (negative offset)', () => {
      // GOTO -5 (branch offset -5, 0xFFFB as signed short)
      const code = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, Opcodes.GOTO, 0xFF, 0xFB]);
      const labels: (Label | null)[] = new Array(100).fill(null);
      const mockVisitor = {
        visitJumpInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = JumpInsnReader.read(Opcodes.GOTO, code, 5, mockVisitor, labels, 5);
      
      expect(bytesRead).toBe(3);
      expect(mockVisitor.visitJumpInsn).toHaveBeenCalledTimes(1);
      const [opcode, label] = mockVisitor.visitJumpInsn.mock.calls[0]!;
      expect(opcode).toBe(Opcodes.GOTO);
      expect(label).toBeInstanceOf(Label);
    });

    it('should reuse existing label at target', () => {
      const code = new Uint8Array([Opcodes.IFEQ, 0x00, 0x05]); // branch to offset 5
      const existingLabel = new Label();
      const labels: (Label | null)[] = new Array(100).fill(null);
      labels[5] = existingLabel;
      
      const mockVisitor = {
        visitJumpInsn: vi.fn()
      } as unknown as MethodVisitor;

      JumpInsnReader.read(Opcodes.IFEQ, code, 0, mockVisitor, labels, 0);
      
      const [, label] = mockVisitor.visitJumpInsn.mock.calls[0]!;
      expect(label).toBe(existingLabel);
    });

    it('should read IF_ICMPLT', () => {
      const code = new Uint8Array([Opcodes.IF_ICMPLT, 0x00, 0x0F]);
      const labels: (Label | null)[] = new Array(100).fill(null);
      const mockVisitor = {
        visitJumpInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = JumpInsnReader.read(Opcodes.IF_ICMPLT, code, 0, mockVisitor, labels, 0);
      
      expect(bytesRead).toBe(3);
      expect(mockVisitor.visitJumpInsn).toHaveBeenCalledTimes(1);
      expect(mockVisitor.visitJumpInsn.mock.calls[0]![0]).toBe(Opcodes.IF_ICMPLT);
    });

    it('should read IFNULL', () => {
      const code = new Uint8Array([Opcodes.IFNULL, 0x00, 0x03]);
      const labels: (Label | null)[] = new Array(100).fill(null);
      const mockVisitor = {
        visitJumpInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = JumpInsnReader.read(Opcodes.IFNULL, code, 0, mockVisitor, labels, 0);
      
      expect(bytesRead).toBe(3);
      expect(mockVisitor.visitJumpInsn).toHaveBeenCalledWith(Opcodes.IFNULL, expect.any(Label));
    });
  });

  describe('getInstructionSize', () => {
    it('should return 3 for all jump instructions', () => {
      expect(JumpInsnReader.getInstructionSize(Opcodes.IFEQ)).toBe(3);
      expect(JumpInsnReader.getInstructionSize(Opcodes.GOTO)).toBe(3);
      expect(JumpInsnReader.getInstructionSize(Opcodes.IF_ICMPEQ)).toBe(3);
      expect(JumpInsnReader.getInstructionSize(Opcodes.IFNULL)).toBe(3);
    });
  });
});
