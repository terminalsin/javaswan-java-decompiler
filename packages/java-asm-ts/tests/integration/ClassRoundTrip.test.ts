import { describe, it, expect } from 'vitest';
import { ClassWriter, COMPUTE_MAXS } from '../../src/writers/ClassWriter';
import { ClassReader } from '../../src/readers/ClassReader';
import { ClassVisitor } from '../../src/visitors/ClassVisitor';
import { MethodVisitor } from '../../src/visitors/MethodVisitor';
import { FieldVisitor } from '../../src/visitors/FieldVisitor';
import { Label } from '../../src/core/Label';
import * as Opcodes from '../../src/core/Opcodes';

describe('Class Round Trip', () => {
  describe('Simple class generation and parsing', () => {
    it('should generate and parse a simple class', () => {
      // Generate a simple class
      const cw = new ClassWriter(0);
      cw.visit(
        Opcodes.V1_8,
        Opcodes.ACC_PUBLIC,
        'test/SimpleClass',
        null,
        'java/lang/Object',
        null
      );
      
      // Add a simple field
      const fv = cw.visitField(
        Opcodes.ACC_PRIVATE,
        'counter',
        'I',
        null,
        null
      );
      if (fv) fv.visitEnd();
      
      // Add a simple method
      const mv = cw.visitMethod(
        Opcodes.ACC_PUBLIC,
        'getCounter',
        '()I',
        null,
        null
      );
      if (mv) {
        mv.visitCode();
        mv.visitVarInsn(Opcodes.ALOAD, 0);
        mv.visitFieldInsn(Opcodes.GETFIELD, 'test/SimpleClass', 'counter', 'I');
        mv.visitInsn(Opcodes.IRETURN);
        mv.visitMaxs(1, 1);
        mv.visitEnd();
      }
      
      cw.visitEnd();
      
      // Get the bytecode
      const bytecode = cw.toByteArray();
      
      // Verify it's a valid class file
      expect(bytecode.length).toBeGreaterThan(0);
      expect(bytecode[0]).toBe(0xCA);
      expect(bytecode[1]).toBe(0xFE);
      expect(bytecode[2]).toBe(0xBA);
      expect(bytecode[3]).toBe(0xBE);
      
      // Parse it back
      const cr = new ClassReader(bytecode);
      
      expect(cr.getClassName()).toBe('test/SimpleClass');
      expect(cr.getSuperClassName()).toBe('java/lang/Object');
    });

    it('should generate a class with constructor', () => {
      const cw = new ClassWriter(COMPUTE_MAXS);
      cw.visit(
        Opcodes.V1_8,
        Opcodes.ACC_PUBLIC,
        'test/ConstructorClass',
        null,
        'java/lang/Object',
        null
      );
      
      // Default constructor
      const mv = cw.visitMethod(
        Opcodes.ACC_PUBLIC,
        '<init>',
        '()V',
        null,
        null
      );
      if (mv) {
        mv.visitCode();
        mv.visitVarInsn(Opcodes.ALOAD, 0);
        mv.visitMethodInsn(Opcodes.INVOKESPECIAL, 'java/lang/Object', '<init>', '()V', false);
        mv.visitInsn(Opcodes.RETURN);
        mv.visitMaxs(1, 1);
        mv.visitEnd();
      }
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      const cr = new ClassReader(bytecode);
      
      expect(cr.getClassName()).toBe('test/ConstructorClass');
    });

    it('should generate a class with multiple methods', () => {
      const cw = new ClassWriter(0);
      cw.visit(
        Opcodes.V1_8,
        Opcodes.ACC_PUBLIC,
        'test/MultiMethodClass',
        null,
        'java/lang/Object',
        null
      );
      
      // Method 1: add
      const mv1 = cw.visitMethod(
        Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC,
        'add',
        '(II)I',
        null,
        null
      );
      if (mv1) {
        mv1.visitCode();
        mv1.visitVarInsn(Opcodes.ILOAD, 0);
        mv1.visitVarInsn(Opcodes.ILOAD, 1);
        mv1.visitInsn(Opcodes.IADD);
        mv1.visitInsn(Opcodes.IRETURN);
        mv1.visitMaxs(2, 2);
        mv1.visitEnd();
      }
      
      // Method 2: subtract
      const mv2 = cw.visitMethod(
        Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC,
        'subtract',
        '(II)I',
        null,
        null
      );
      if (mv2) {
        mv2.visitCode();
        mv2.visitVarInsn(Opcodes.ILOAD, 0);
        mv2.visitVarInsn(Opcodes.ILOAD, 1);
        mv2.visitInsn(Opcodes.ISUB);
        mv2.visitInsn(Opcodes.IRETURN);
        mv2.visitMaxs(2, 2);
        mv2.visitEnd();
      }
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      const cr = new ClassReader(bytecode);
      
      expect(cr.getClassName()).toBe('test/MultiMethodClass');
    });

    it('should generate a class with control flow', () => {
      const cw = new ClassWriter(0);
      cw.visit(
        Opcodes.V1_8,
        Opcodes.ACC_PUBLIC,
        'test/ControlFlowClass',
        null,
        'java/lang/Object',
        null
      );
      
      // Method with if-else
      const mv = cw.visitMethod(
        Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC,
        'max',
        '(II)I',
        null,
        null
      );
      if (mv) {
        mv.visitCode();
        
        const elseLabel = new Label();
        const endLabel = new Label();
        
        mv.visitVarInsn(Opcodes.ILOAD, 0);
        mv.visitVarInsn(Opcodes.ILOAD, 1);
        mv.visitJumpInsn(Opcodes.IF_ICMPLE, elseLabel);
        
        // if branch: return a
        mv.visitVarInsn(Opcodes.ILOAD, 0);
        mv.visitJumpInsn(Opcodes.GOTO, endLabel);
        
        // else branch: return b
        mv.visitLabel(elseLabel);
        mv.visitVarInsn(Opcodes.ILOAD, 1);
        
        mv.visitLabel(endLabel);
        mv.visitInsn(Opcodes.IRETURN);
        mv.visitMaxs(2, 2);
        mv.visitEnd();
      }
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      expect(bytecode.length).toBeGreaterThan(0);
      
      const cr = new ClassReader(bytecode);
      expect(cr.getClassName()).toBe('test/ControlFlowClass');
    });

    it('should generate a class with interfaces', () => {
      const cw = new ClassWriter(0);
      cw.visit(
        Opcodes.V1_8,
        Opcodes.ACC_PUBLIC,
        'test/InterfaceImpl',
        null,
        'java/lang/Object',
        ['java/lang/Runnable', 'java/io/Serializable']
      );
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      const cr = new ClassReader(bytecode);
      
      expect(cr.getClassName()).toBe('test/InterfaceImpl');
      expect(cr.getInterfaces()).toContain('java/lang/Runnable');
      expect(cr.getInterfaces()).toContain('java/io/Serializable');
    });
  });

  describe('Visitor pattern', () => {
    it('should visit all class elements', () => {
      const cw = new ClassWriter(0);
      cw.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC, 'test/VisitorTest', null, 'java/lang/Object', null);
      
      const fv = cw.visitField(Opcodes.ACC_PRIVATE, 'field1', 'I', null, null);
      if (fv) fv.visitEnd();
      
      const mv = cw.visitMethod(Opcodes.ACC_PUBLIC, 'method1', '()V', null, null);
      if (mv) {
        mv.visitCode();
        mv.visitInsn(Opcodes.RETURN);
        mv.visitMaxs(0, 1);
        mv.visitEnd();
      }
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      const cr = new ClassReader(bytecode);
      
      // Create a tracking visitor
      let visitedClass = false;
      let visitedField = false;
      let visitedMethod = false;
      
      const trackingVisitor = new class extends ClassVisitor {
        constructor() {
          super(Opcodes.ASM9);
        }
        
        override visit(version: number, access: number, name: string, signature: string | null, superName: string | null, interfaces: string[] | null): void {
          visitedClass = true;
          expect(name).toBe('test/VisitorTest');
        }
        
        override visitField(access: number, name: string, descriptor: string, signature: string | null, value: unknown): FieldVisitor | null {
          visitedField = true;
          expect(name).toBe('field1');
          expect(descriptor).toBe('I');
          return null;
        }
        
        override visitMethod(access: number, name: string, descriptor: string, signature: string | null, exceptions: string[] | null): MethodVisitor | null {
          visitedMethod = true;
          expect(name).toBe('method1');
          expect(descriptor).toBe('()V');
          return null;
        }
      };
      
      cr.accept(trackingVisitor, 0);
      
      expect(visitedClass).toBe(true);
      expect(visitedField).toBe(true);
      expect(visitedMethod).toBe(true);
    });
  });

  describe('Instruction coverage', () => {
    it('should handle arithmetic instructions', () => {
      const cw = new ClassWriter(0);
      cw.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC, 'test/ArithmeticTest', null, 'java/lang/Object', null);
      
      const mv = cw.visitMethod(
        Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC,
        'compute',
        '(II)I',
        null,
        null
      );
      if (mv) {
        mv.visitCode();
        mv.visitVarInsn(Opcodes.ILOAD, 0);
        mv.visitVarInsn(Opcodes.ILOAD, 1);
        mv.visitInsn(Opcodes.IADD);
        mv.visitVarInsn(Opcodes.ILOAD, 0);
        mv.visitInsn(Opcodes.IMUL);
        mv.visitVarInsn(Opcodes.ILOAD, 1);
        mv.visitInsn(Opcodes.IDIV);
        mv.visitInsn(Opcodes.IRETURN);
        mv.visitMaxs(3, 2);
        mv.visitEnd();
      }
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      expect(bytecode.length).toBeGreaterThan(0);
    });

    it('should handle constant instructions', () => {
      const cw = new ClassWriter(0);
      cw.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC, 'test/ConstantTest', null, 'java/lang/Object', null);
      
      const mv = cw.visitMethod(
        Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC,
        'constants',
        '()I',
        null,
        null
      );
      if (mv) {
        mv.visitCode();
        mv.visitInsn(Opcodes.ICONST_0);
        mv.visitInsn(Opcodes.ICONST_5);
        mv.visitInsn(Opcodes.IADD);
        mv.visitIntInsn(Opcodes.BIPUSH, 100);
        mv.visitInsn(Opcodes.IADD);
        mv.visitIntInsn(Opcodes.SIPUSH, 1000);
        mv.visitInsn(Opcodes.IADD);
        mv.visitInsn(Opcodes.IRETURN);
        mv.visitMaxs(2, 0);
        mv.visitEnd();
      }
      
      cw.visitEnd();
      
      const bytecode = cw.toByteArray();
      expect(bytecode.length).toBeGreaterThan(0);
    });
  });
});
