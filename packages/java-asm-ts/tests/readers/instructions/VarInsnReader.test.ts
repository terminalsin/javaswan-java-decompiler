import { describe, it, expect, vi } from 'vitest';
import { VarInsnReader } from '../../../src/readers/instructions/VarInsnReader';
import type { MethodVisitor } from '../../../src/visitors/MethodVisitor';
import * as Opcodes from '../../../src/core/Opcodes';
import * as Constants from '../../../src/core/Constants';

describe('VarInsnReader', () => {
  describe('isVarInsn', () => {
    it('should identify ILOAD as variable instruction', () => {
      expect(VarInsnReader.isVarInsn(Opcodes.ILOAD)).toBe(true);
    });

    it('should identify all xLOAD instructions', () => {
      expect(VarInsnReader.isVarInsn(Opcodes.ILOAD)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.LLOAD)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.FLOAD)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.DLOAD)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.ALOAD)).toBe(true);
    });

    it('should identify all xSTORE instructions', () => {
      expect(VarInsnReader.isVarInsn(Opcodes.ISTORE)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.LSTORE)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.FSTORE)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.DSTORE)).toBe(true);
      expect(VarInsnReader.isVarInsn(Opcodes.ASTORE)).toBe(true);
    });

    it('should identify RET', () => {
      expect(VarInsnReader.isVarInsn(Opcodes.RET)).toBe(true);
    });

    it('should identify optimized xLOAD_n instructions', () => {
      expect(VarInsnReader.isVarInsn(Constants.ILOAD_0)).toBe(true);
      expect(VarInsnReader.isVarInsn(Constants.ILOAD_3)).toBe(true);
      expect(VarInsnReader.isVarInsn(Constants.ALOAD_0)).toBe(true);
    });

    it('should identify optimized xSTORE_n instructions', () => {
      expect(VarInsnReader.isVarInsn(Constants.ISTORE_0)).toBe(true);
      expect(VarInsnReader.isVarInsn(Constants.ISTORE_3)).toBe(true);
      expect(VarInsnReader.isVarInsn(Constants.ASTORE_0)).toBe(true);
    });

    it('should NOT identify non-variable instructions', () => {
      expect(VarInsnReader.isVarInsn(Opcodes.NOP)).toBe(false);
      expect(VarInsnReader.isVarInsn(Opcodes.BIPUSH)).toBe(false);
      expect(VarInsnReader.isVarInsn(Opcodes.LDC)).toBe(false);
    });
  });

  describe('read standard variable instructions', () => {
    it('should read ILOAD with operand', () => {
      const code = new Uint8Array([Opcodes.ILOAD, 5]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Opcodes.ILOAD, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(2);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ILOAD, 5);
    });

    it('should read ASTORE with operand', () => {
      const code = new Uint8Array([Opcodes.ASTORE, 10]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Opcodes.ASTORE, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(2);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ASTORE, 10);
    });

    it('should read RET with operand', () => {
      const code = new Uint8Array([Opcodes.RET, 3]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Opcodes.RET, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(2);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.RET, 3);
    });
  });

  describe('read WIDE variable instructions', () => {
    it('should read WIDE ILOAD', () => {
      const code = new Uint8Array([Opcodes.ILOAD, 0x01, 0x00]); // var 256
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Opcodes.ILOAD, code, 0, mockVisitor, true);
      
      expect(bytesRead).toBe(3);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ILOAD, 256);
    });

    it('should read WIDE ASTORE with large index', () => {
      const code = new Uint8Array([Opcodes.ASTORE, 0x7F, 0xFF]); // var 32767
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Opcodes.ASTORE, code, 0, mockVisitor, true);
      
      expect(bytesRead).toBe(3);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ASTORE, 32767);
    });
  });

  describe('read optimized xLOAD_n instructions', () => {
    it('should read ILOAD_0', () => {
      const code = new Uint8Array([Constants.ILOAD_0]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Constants.ILOAD_0, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(1);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ILOAD, 0);
    });

    it('should read ALOAD_0', () => {
      const code = new Uint8Array([Constants.ALOAD_0]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Constants.ALOAD_0, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(1);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ALOAD, 0);
    });

    it('should read DLOAD_3', () => {
      const code = new Uint8Array([Constants.DLOAD_3]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Constants.DLOAD_3, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(1);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.DLOAD, 3);
    });
  });

  describe('read optimized xSTORE_n instructions', () => {
    it('should read ISTORE_0', () => {
      const code = new Uint8Array([Constants.ISTORE_0]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Constants.ISTORE_0, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(1);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ISTORE, 0);
    });

    it('should read ASTORE_3', () => {
      const code = new Uint8Array([Constants.ASTORE_3]);
      const mockVisitor = {
        visitVarInsn: vi.fn()
      } as unknown as MethodVisitor;

      const bytesRead = VarInsnReader.read(Constants.ASTORE_3, code, 0, mockVisitor, false);
      
      expect(bytesRead).toBe(1);
      expect(mockVisitor.visitVarInsn).toHaveBeenCalledWith(Opcodes.ASTORE, 3);
    });
  });

  describe('getInstructionSize', () => {
    it('should return 2 for normal variable instructions', () => {
      expect(VarInsnReader.getInstructionSize(Opcodes.ILOAD, false)).toBe(2);
      expect(VarInsnReader.getInstructionSize(Opcodes.ASTORE, false)).toBe(2);
    });

    it('should return 3 for WIDE variable instructions', () => {
      expect(VarInsnReader.getInstructionSize(Opcodes.ILOAD, true)).toBe(3);
      expect(VarInsnReader.getInstructionSize(Opcodes.ASTORE, true)).toBe(3);
    });

    it('should return 1 for optimized instructions', () => {
      expect(VarInsnReader.getInstructionSize(Constants.ILOAD_0, false)).toBe(1);
      expect(VarInsnReader.getInstructionSize(Constants.ASTORE_3, false)).toBe(1);
    });
  });
});
