/**
 * Integration tests for parsing JASM-assembled class files.
 * These tests verify that the ClassReader correctly parses all JVM instructions.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ClassReader } from '../../src/readers/ClassReader';
import { ClassVisitor } from '../../src/visitors/ClassVisitor';
import { MethodVisitor } from '../../src/visitors/MethodVisitor';
import { FieldVisitor } from '../../src/visitors/FieldVisitor';
import { Label } from '../../src/core/Label';
import { Handle } from '../../src/core/Handle';
import { ASM9 } from '../../src/core/Opcodes';
import * as Opcodes from '../../src/core/Opcodes';

const FIXTURES_DIR = path.join(__dirname, '../fixtures/classes');

/**
 * A method visitor that records all visited instructions.
 */
class RecordingMethodVisitor extends MethodVisitor {
  instructions: Array<{ type: string; opcode?: number; [key: string]: unknown }> = [];
  
  constructor() {
    super(ASM9);
  }

  override visitInsn(opcode: number): void {
    this.instructions.push({ type: 'insn', opcode });
  }

  override visitIntInsn(opcode: number, operand: number): void {
    this.instructions.push({ type: 'intInsn', opcode, operand });
  }

  override visitVarInsn(opcode: number, varIndex: number): void {
    this.instructions.push({ type: 'varInsn', opcode, varIndex });
  }

  override visitTypeInsn(opcode: number, type: string): void {
    this.instructions.push({ type: 'typeInsn', opcode, typeName: type });
  }

  override visitFieldInsn(opcode: number, owner: string, name: string, descriptor: string): void {
    this.instructions.push({ type: 'fieldInsn', opcode, owner, name, descriptor });
  }

  override visitMethodInsn(
    opcode: number,
    owner: string,
    name: string,
    descriptor: string,
    isInterface: boolean
  ): void {
    this.instructions.push({ type: 'methodInsn', opcode, owner, name, descriptor, isInterface });
  }

  override visitInvokeDynamicInsn(
    name: string,
    descriptor: string,
    bootstrapMethodHandle: Handle,
    ...bootstrapMethodArguments: unknown[]
  ): void {
    this.instructions.push({
      type: 'invokeDynamicInsn',
      name,
      descriptor,
      bootstrapMethodHandle,
      bootstrapMethodArguments,
    });
  }

  override visitJumpInsn(opcode: number, label: Label): void {
    this.instructions.push({ type: 'jumpInsn', opcode, label });
  }

  override visitLabel(label: Label): void {
    this.instructions.push({ type: 'label', label });
  }

  override visitLdcInsn(value: unknown): void {
    this.instructions.push({ type: 'ldcInsn', value });
  }

  override visitIincInsn(varIndex: number, increment: number): void {
    this.instructions.push({ type: 'iincInsn', varIndex, increment });
  }

  override visitTableSwitchInsn(
    min: number,
    max: number,
    dflt: Label,
    ...labels: Label[]
  ): void {
    this.instructions.push({ type: 'tableSwitchInsn', min, max, dflt, labels });
  }

  override visitLookupSwitchInsn(dflt: Label, keys: number[], labels: Label[]): void {
    this.instructions.push({ type: 'lookupSwitchInsn', dflt, keys, labels });
  }

  override visitMultiANewArrayInsn(descriptor: string, numDimensions: number): void {
    this.instructions.push({ type: 'multiANewArrayInsn', descriptor, numDimensions });
  }

  override visitMaxs(maxStack: number, maxLocals: number): void {
    this.instructions.push({ type: 'maxs', maxStack, maxLocals });
  }
}

/**
 * A class visitor that records method information and creates recording method visitors.
 */
class RecordingClassVisitor extends ClassVisitor {
  className: string = '';
  superName: string = '';
  interfaces: string[] = [];
  fields: Array<{ access: number; name: string; descriptor: string }> = [];
  methods: Map<string, RecordingMethodVisitor> = new Map();

  constructor() {
    super(ASM9);
  }

  override visit(
    version: number,
    access: number,
    name: string,
    signature: string | null,
    superName: string | null,
    interfaces: string[] | null
  ): void {
    this.className = name;
    this.superName = superName ?? '';
    this.interfaces = interfaces ?? [];
  }

  override visitField(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    value: unknown
  ): FieldVisitor | null {
    this.fields.push({ access, name, descriptor });
    return null;
  }

  override visitMethod(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: string[] | null
  ): MethodVisitor | null {
    const methodVisitor = new RecordingMethodVisitor();
    this.methods.set(`${name}${descriptor}`, methodVisitor);
    return methodVisitor;
  }
}

function loadClassFile(filename: string): Uint8Array {
  const filePath = path.join(FIXTURES_DIR, filename);
  return new Uint8Array(fs.readFileSync(filePath));
}

function parseClass(filename: string): RecordingClassVisitor {
  const classBytes = loadClassFile(filename);
  const classReader = new ClassReader(classBytes);
  const visitor = new RecordingClassVisitor();
  classReader.accept(visitor, 0);
  return visitor;
}

describe('ClassReader Integration Tests', () => {
  describe('ZeroOperandInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('ZeroOperandInsns.class');
    });

    it('should parse the class name correctly', () => {
      expect(visitor.className).toBe('test/ZeroOperandInsns');
    });

    it('should parse NOP instruction', () => {
      const method = visitor.methods.get('testNop()V');
      expect(method).toBeDefined();
      const nopInsns = method!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.NOP
      );
      expect(nopInsns.length).toBeGreaterThan(0);
    });

    it('should parse ACONST_NULL instruction', () => {
      const method = visitor.methods.get('testAconstNull()Ljava/lang/Object;');
      expect(method).toBeDefined();
      const aconstNullInsns = method!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.ACONST_NULL
      );
      expect(aconstNullInsns.length).toBeGreaterThan(0);
    });

    it('should parse ICONST_M1 instruction', () => {
      const method = visitor.methods.get('testIconstM1()I');
      expect(method).toBeDefined();
      const iconsts = method!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.ICONST_M1
      );
      expect(iconsts.length).toBeGreaterThan(0);
    });

    it('should parse ICONST_0 through ICONST_5 instructions', () => {
      for (let i = 0; i <= 5; i++) {
        const method = visitor.methods.get(`testIconst${i}()I`);
        expect(method).toBeDefined();
        const expectedOpcode = Opcodes.ICONST_0 + i;
        const iconsts = method!.instructions.filter(
          (insn) => insn.type === 'insn' && insn.opcode === expectedOpcode
        );
        expect(iconsts.length).toBeGreaterThan(0);
      }
    });

    it('should parse LCONST instructions', () => {
      const method0 = visitor.methods.get('testLconst0()J');
      expect(method0).toBeDefined();
      const lconst0 = method0!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.LCONST_0
      );
      expect(lconst0.length).toBeGreaterThan(0);

      const method1 = visitor.methods.get('testLconst1()J');
      expect(method1).toBeDefined();
      const lconst1 = method1!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.LCONST_1
      );
      expect(lconst1.length).toBeGreaterThan(0);
    });

    it('should parse FCONST instructions', () => {
      const method0 = visitor.methods.get('testFconst0()F');
      expect(method0).toBeDefined();
      const fconst0 = method0!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.FCONST_0
      );
      expect(fconst0.length).toBeGreaterThan(0);

      const method1 = visitor.methods.get('testFconst1()F');
      expect(method1).toBeDefined();
      const fconst1 = method1!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.FCONST_1
      );
      expect(fconst1.length).toBeGreaterThan(0);
    });

    it('should parse DCONST instructions', () => {
      const method0 = visitor.methods.get('testDconst0()D');
      expect(method0).toBeDefined();
      const dconst0 = method0!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.DCONST_0
      );
      expect(dconst0.length).toBeGreaterThan(0);

      const method1 = visitor.methods.get('testDconst1()D');
      expect(method1).toBeDefined();
      const dconst1 = method1!.instructions.filter(
        (i) => i.type === 'insn' && i.opcode === Opcodes.DCONST_1
      );
      expect(dconst1.length).toBeGreaterThan(0);
    });

    it('should parse stack manipulation instructions (POP, POP2, DUP, SWAP)', () => {
      const popMethod = visitor.methods.get('testPop(I)V');
      expect(popMethod).toBeDefined();
      expect(popMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.POP)).toBe(true);

      const pop2Method = visitor.methods.get('testPop2(J)V');
      expect(pop2Method).toBeDefined();
      expect(pop2Method!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.POP2)).toBe(true);

      const dupMethod = visitor.methods.get('testDup(I)I');
      expect(dupMethod).toBeDefined();
      expect(dupMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.DUP)).toBe(true);

      const swapMethod = visitor.methods.get('testSwap(II)I');
      expect(swapMethod).toBeDefined();
      expect(swapMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.SWAP)).toBe(true);
    });

    it('should parse arithmetic instructions', () => {
      const iaddMethod = visitor.methods.get('testIadd(II)I');
      expect(iaddMethod).toBeDefined();
      expect(iaddMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.IADD)).toBe(true);

      const isubMethod = visitor.methods.get('testIsub(II)I');
      expect(isubMethod).toBeDefined();
      expect(isubMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.ISUB)).toBe(true);

      const imulMethod = visitor.methods.get('testImul(II)I');
      expect(imulMethod).toBeDefined();
      expect(imulMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.IMUL)).toBe(true);

      const idivMethod = visitor.methods.get('testIdiv(II)I');
      expect(idivMethod).toBeDefined();
      expect(idivMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.IDIV)).toBe(true);

      const iremMethod = visitor.methods.get('testIrem(II)I');
      expect(iremMethod).toBeDefined();
      expect(iremMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.IREM)).toBe(true);

      const inegMethod = visitor.methods.get('testIneg(I)I');
      expect(inegMethod).toBeDefined();
      expect(inegMethod!.instructions.some((i) => i.type === 'insn' && i.opcode === Opcodes.INEG)).toBe(true);
    });

    it('should parse bitwise instructions', () => {
      expect(visitor.methods.get('testIshl(II)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.ISHL
      )).toBe(true);
      expect(visitor.methods.get('testIshr(II)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.ISHR
      )).toBe(true);
      expect(visitor.methods.get('testIushr(II)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.IUSHR
      )).toBe(true);
      expect(visitor.methods.get('testIand(II)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.IAND
      )).toBe(true);
      expect(visitor.methods.get('testIor(II)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.IOR
      )).toBe(true);
      expect(visitor.methods.get('testIxor(II)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.IXOR
      )).toBe(true);
    });

    it('should parse type conversion instructions', () => {
      expect(visitor.methods.get('testI2l(I)J')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.I2L
      )).toBe(true);
      expect(visitor.methods.get('testI2f(I)F')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.I2F
      )).toBe(true);
      expect(visitor.methods.get('testI2d(I)D')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.I2D
      )).toBe(true);
      expect(visitor.methods.get('testL2i(J)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.L2I
      )).toBe(true);
      expect(visitor.methods.get('testI2b(I)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.I2B
      )).toBe(true);
      expect(visitor.methods.get('testI2c(I)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.I2C
      )).toBe(true);
      expect(visitor.methods.get('testI2s(I)I')!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.I2S
      )).toBe(true);
    });

    it('should parse ARRAYLENGTH instruction', () => {
      const method = visitor.methods.get('testArraylength([I)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.ARRAYLENGTH
      )).toBe(true);
    });

    it('should parse monitor instructions', () => {
      const method = visitor.methods.get('testMonitorenter(Ljava/lang/Object;)V');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.MONITORENTER
      )).toBe(true);
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.MONITOREXIT
      )).toBe(true);
    });
  });

  describe('IntInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('IntInsns.class');
    });

    it('should parse BIPUSH instructions', () => {
      const method10 = visitor.methods.get('testBipush10()I');
      expect(method10).toBeDefined();
      const bipush10 = method10!.instructions.find(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.BIPUSH && i.operand === 10
      );
      expect(bipush10).toBeDefined();

      const methodNeg5 = visitor.methods.get('testBipushNeg5()I');
      expect(methodNeg5).toBeDefined();
      const bipushNeg5 = methodNeg5!.instructions.find(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.BIPUSH && i.operand === -5
      );
      expect(bipushNeg5).toBeDefined();
    });

    it('should parse SIPUSH instructions', () => {
      const method1000 = visitor.methods.get('testSipush1000()I');
      expect(method1000).toBeDefined();
      const sipush1000 = method1000!.instructions.find(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.SIPUSH && i.operand === 1000
      );
      expect(sipush1000).toBeDefined();

      const methodNeg1000 = visitor.methods.get('testSipushNeg1000()I');
      expect(methodNeg1000).toBeDefined();
      const sipushNeg1000 = methodNeg1000!.instructions.find(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.SIPUSH && i.operand === -1000
      );
      expect(sipushNeg1000).toBeDefined();
    });

    it('should parse NEWARRAY instructions with different types', () => {
      const booleanMethod = visitor.methods.get('testNewarrayBoolean(I)[Z');
      expect(booleanMethod).toBeDefined();
      expect(booleanMethod!.instructions.some(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.NEWARRAY && i.operand === Opcodes.T_BOOLEAN
      )).toBe(true);

      const intMethod = visitor.methods.get('testNewarrayInt(I)[I');
      expect(intMethod).toBeDefined();
      expect(intMethod!.instructions.some(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.NEWARRAY && i.operand === Opcodes.T_INT
      )).toBe(true);

      const longMethod = visitor.methods.get('testNewarrayLong(I)[J');
      expect(longMethod).toBeDefined();
      expect(longMethod!.instructions.some(
        (i) => i.type === 'intInsn' && i.opcode === Opcodes.NEWARRAY && i.operand === Opcodes.T_LONG
      )).toBe(true);
    });
  });

  describe('VarInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('VarInsns.class');
    });

    it('should parse ILOAD/ISTORE instructions', () => {
      const method = visitor.methods.get('testIloadIstore(I)I');
      expect(method).toBeDefined();
      // Should have ILOAD 0
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.ILOAD && i.varIndex === 0
      )).toBe(true);
      // Should have ISTORE 1
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.ISTORE && i.varIndex === 1
      )).toBe(true);
    });

    it('should parse LLOAD/LSTORE instructions', () => {
      const method = visitor.methods.get('testLloadLstore(J)J');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.LLOAD
      )).toBe(true);
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.LSTORE
      )).toBe(true);
    });

    it('should parse ALOAD/ASTORE instructions', () => {
      const method = visitor.methods.get('testAloadAstore(Ljava/lang/Object;)Ljava/lang/Object;');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.ALOAD
      )).toBe(true);
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.ASTORE
      )).toBe(true);
    });

    it('should parse variable instructions with higher indices', () => {
      const method = visitor.methods.get('testHighVarIndex(IIIII)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'varInsn' && i.opcode === Opcodes.ILOAD && i.varIndex === 4
      )).toBe(true);
    });
  });

  describe('TypeInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('TypeInsns.class');
    });

    it('should parse NEW instruction', () => {
      const method = visitor.methods.get('testNew()Ljava/lang/Object;');
      expect(method).toBeDefined();
      const newInsn = method!.instructions.find(
        (i) => i.type === 'typeInsn' && i.opcode === Opcodes.NEW
      );
      expect(newInsn).toBeDefined();
      expect(newInsn!.typeName).toBe('java/lang/Object');
    });

    it('should parse ANEWARRAY instruction', () => {
      const method = visitor.methods.get('testAnewarray(I)[Ljava/lang/Object;');
      expect(method).toBeDefined();
      const anewarrayInsn = method!.instructions.find(
        (i) => i.type === 'typeInsn' && i.opcode === Opcodes.ANEWARRAY
      );
      expect(anewarrayInsn).toBeDefined();
      expect(anewarrayInsn!.typeName).toBe('java/lang/Object');
    });

    it('should parse CHECKCAST instruction', () => {
      const method = visitor.methods.get('testCheckcast(Ljava/lang/Object;)Ljava/lang/String;');
      expect(method).toBeDefined();
      const checkcastInsn = method!.instructions.find(
        (i) => i.type === 'typeInsn' && i.opcode === Opcodes.CHECKCAST
      );
      expect(checkcastInsn).toBeDefined();
      expect(checkcastInsn!.typeName).toBe('java/lang/String');
    });

    it('should parse INSTANCEOF instruction', () => {
      const method = visitor.methods.get('testInstanceof(Ljava/lang/Object;)I');
      expect(method).toBeDefined();
      const instanceofInsn = method!.instructions.find(
        (i) => i.type === 'typeInsn' && i.opcode === Opcodes.INSTANCEOF
      );
      expect(instanceofInsn).toBeDefined();
      expect(instanceofInsn!.typeName).toBe('java/lang/String');
    });
  });

  describe('FieldInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('FieldInsns.class');
    });

    it('should parse fields correctly', () => {
      expect(visitor.fields.length).toBeGreaterThan(0);
      const staticIntField = visitor.fields.find((f) => f.name === 'staticIntField');
      expect(staticIntField).toBeDefined();
      expect(staticIntField!.descriptor).toBe('I');
    });

    it('should parse GETSTATIC instruction', () => {
      const method = visitor.methods.get('testGetstatic()I');
      expect(method).toBeDefined();
      const getstaticInsn = method!.instructions.find(
        (i) => i.type === 'fieldInsn' && i.opcode === Opcodes.GETSTATIC
      );
      expect(getstaticInsn).toBeDefined();
      expect(getstaticInsn!.owner).toBe('test/FieldInsns');
      expect(getstaticInsn!.name).toBe('staticIntField');
      expect(getstaticInsn!.descriptor).toBe('I');
    });

    it('should parse PUTSTATIC instruction', () => {
      const method = visitor.methods.get('testPutstatic(I)V');
      expect(method).toBeDefined();
      const putstaticInsn = method!.instructions.find(
        (i) => i.type === 'fieldInsn' && i.opcode === Opcodes.PUTSTATIC
      );
      expect(putstaticInsn).toBeDefined();
      expect(putstaticInsn!.owner).toBe('test/FieldInsns');
      expect(putstaticInsn!.name).toBe('staticIntField');
    });

    it('should parse GETFIELD instruction', () => {
      const method = visitor.methods.get('testGetfield()I');
      expect(method).toBeDefined();
      const getfieldInsn = method!.instructions.find(
        (i) => i.type === 'fieldInsn' && i.opcode === Opcodes.GETFIELD
      );
      expect(getfieldInsn).toBeDefined();
      expect(getfieldInsn!.owner).toBe('test/FieldInsns');
      expect(getfieldInsn!.name).toBe('instanceIntField');
    });

    it('should parse PUTFIELD instruction', () => {
      const method = visitor.methods.get('testPutfield(I)V');
      expect(method).toBeDefined();
      const putfieldInsn = method!.instructions.find(
        (i) => i.type === 'fieldInsn' && i.opcode === Opcodes.PUTFIELD
      );
      expect(putfieldInsn).toBeDefined();
      expect(putfieldInsn!.owner).toBe('test/FieldInsns');
      expect(putfieldInsn!.name).toBe('instanceIntField');
    });
  });

  describe('MethodInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('MethodInsns.class');
    });

    it('should parse INVOKESTATIC instruction', () => {
      const method = visitor.methods.get('testInvokestatic()I');
      expect(method).toBeDefined();
      const invokestaticInsn = method!.instructions.find(
        (i) => i.type === 'methodInsn' && i.opcode === Opcodes.INVOKESTATIC
      );
      expect(invokestaticInsn).toBeDefined();
      expect(invokestaticInsn!.owner).toBe('test/MethodInsns');
      expect(invokestaticInsn!.name).toBe('helperStatic');
      expect(invokestaticInsn!.isInterface).toBe(false);
    });

    it('should parse INVOKEVIRTUAL instruction', () => {
      const method = visitor.methods.get('testInvokevirtual()I');
      expect(method).toBeDefined();
      const invokevirtualInsn = method!.instructions.find(
        (i) => i.type === 'methodInsn' && i.opcode === Opcodes.INVOKEVIRTUAL
      );
      expect(invokevirtualInsn).toBeDefined();
      expect(invokevirtualInsn!.owner).toBe('test/MethodInsns');
      expect(invokevirtualInsn!.name).toBe('helperVirtual');
    });

    it('should parse INVOKESPECIAL instruction', () => {
      const method = visitor.methods.get('testInvokespecial()Ljava/lang/Object;');
      expect(method).toBeDefined();
      const invokespecialInsn = method!.instructions.find(
        (i) => i.type === 'methodInsn' && i.opcode === Opcodes.INVOKESPECIAL
      );
      expect(invokespecialInsn).toBeDefined();
      expect(invokespecialInsn!.name).toBe('<init>');
    });

    it('should parse INVOKEINTERFACE instruction', () => {
      const method = visitor.methods.get('testInvokeinterface(Ljava/util/List;)I');
      expect(method).toBeDefined();
      const invokeinterfaceInsn = method!.instructions.find(
        (i) => i.type === 'methodInsn' && i.opcode === Opcodes.INVOKEINTERFACE
      );
      expect(invokeinterfaceInsn).toBeDefined();
      expect(invokeinterfaceInsn!.owner).toBe('java/util/List');
      expect(invokeinterfaceInsn!.name).toBe('size');
      expect(invokeinterfaceInsn!.isInterface).toBe(true);
    });
  });

  describe('JumpInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('JumpInsns.class');
    });

    it('should parse IFEQ instruction', () => {
      const method = visitor.methods.get('testIfeq(I)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'jumpInsn' && i.opcode === Opcodes.IFEQ
      )).toBe(true);
    });

    it('should parse IFNE instruction', () => {
      const method = visitor.methods.get('testIfne(I)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'jumpInsn' && i.opcode === Opcodes.IFNE
      )).toBe(true);
    });

    it('should parse IF_ICMPEQ instruction', () => {
      const method = visitor.methods.get('testIfIcmpeq(II)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'jumpInsn' && i.opcode === Opcodes.IF_ICMPEQ
      )).toBe(true);
    });

    it('should parse IF_ACMPEQ instruction', () => {
      const method = visitor.methods.get('testIfAcmpeq(Ljava/lang/Object;Ljava/lang/Object;)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'jumpInsn' && i.opcode === Opcodes.IF_ACMPEQ
      )).toBe(true);
    });

    it('should parse IFNULL instruction', () => {
      const method = visitor.methods.get('testIfnull(Ljava/lang/Object;)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'jumpInsn' && i.opcode === Opcodes.IFNULL
      )).toBe(true);
    });

    it('should parse GOTO instruction', () => {
      const method = visitor.methods.get('testGoto()I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'jumpInsn' && i.opcode === Opcodes.GOTO
      )).toBe(true);
    });
  });

  describe('LdcInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('LdcInsns.class');
    });

    it('should parse LDC with integer', () => {
      const method = visitor.methods.get('testLdcInt()I');
      expect(method).toBeDefined();
      const ldcInsn = method!.instructions.find(
        (i) => i.type === 'ldcInsn'
      );
      expect(ldcInsn).toBeDefined();
      expect(ldcInsn!.value).toBe(12345);
    });

    it('should parse LDC with string', () => {
      const method = visitor.methods.get('testLdcString()Ljava/lang/String;');
      expect(method).toBeDefined();
      const ldcInsn = method!.instructions.find(
        (i) => i.type === 'ldcInsn' && typeof i.value === 'string'
      );
      expect(ldcInsn).toBeDefined();
      expect(ldcInsn!.value).toBe('Hello, World!');
    });

    it('should parse LDC with long', () => {
      const method = visitor.methods.get('testLdcLong()J');
      expect(method).toBeDefined();
      const ldcInsn = method!.instructions.find(
        (i) => i.type === 'ldcInsn'
      );
      expect(ldcInsn).toBeDefined();
      // Long values are represented as BigInt in JS/TS
      expect(ldcInsn!.value).toBe(123456789012345n);
    });

    it('should parse LDC with double', () => {
      const method = visitor.methods.get('testLdcDouble()D');
      expect(method).toBeDefined();
      const ldcInsn = method!.instructions.find(
        (i) => i.type === 'ldcInsn'
      );
      expect(ldcInsn).toBeDefined();
      expect(ldcInsn!.value).toBeCloseTo(3.141592653589793, 10);
    });
  });

  describe('IincInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('IincInsns.class');
    });

    it('should parse IINC with positive increment', () => {
      const method = visitor.methods.get('testIincPositive(I)I');
      expect(method).toBeDefined();
      const iincInsn = method!.instructions.find(
        (i) => i.type === 'iincInsn'
      );
      expect(iincInsn).toBeDefined();
      expect(iincInsn!.varIndex).toBe(0);
      expect(iincInsn!.increment).toBe(1);
    });

    it('should parse IINC with negative increment', () => {
      const method = visitor.methods.get('testIincNegative(I)I');
      expect(method).toBeDefined();
      const iincInsn = method!.instructions.find(
        (i) => i.type === 'iincInsn'
      );
      expect(iincInsn).toBeDefined();
      expect(iincInsn!.increment).toBe(-1);
    });

    it('should parse IINC with larger increment', () => {
      const method = visitor.methods.get('testIincPositive5(I)I');
      expect(method).toBeDefined();
      const iincInsn = method!.instructions.find(
        (i) => i.type === 'iincInsn'
      );
      expect(iincInsn).toBeDefined();
      expect(iincInsn!.increment).toBe(5);
    });

    it('should parse IINC with different variable index', () => {
      const method = visitor.methods.get('testIincVar1(II)I');
      expect(method).toBeDefined();
      const iincInsn = method!.instructions.find(
        (i) => i.type === 'iincInsn'
      );
      expect(iincInsn).toBeDefined();
      expect(iincInsn!.varIndex).toBe(1);
      expect(iincInsn!.increment).toBe(10);
    });
  });

  describe('SwitchInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('SwitchInsns.class');
    });

    it('should parse TABLESWITCH instruction', () => {
      const method = visitor.methods.get('testTableswitch(I)I');
      expect(method).toBeDefined();
      const tableSwitchInsn = method!.instructions.find(
        (i) => i.type === 'tableSwitchInsn'
      );
      expect(tableSwitchInsn).toBeDefined();
      expect(tableSwitchInsn!.min).toBe(0);
      expect(tableSwitchInsn!.max).toBe(2);
      expect((tableSwitchInsn!.labels as Label[]).length).toBe(3);
    });

    it('should parse LOOKUPSWITCH instruction', () => {
      const method = visitor.methods.get('testLookupswitch(I)I');
      expect(method).toBeDefined();
      const lookupSwitchInsn = method!.instructions.find(
        (i) => i.type === 'lookupSwitchInsn'
      );
      expect(lookupSwitchInsn).toBeDefined();
      expect((lookupSwitchInsn!.keys as number[]).length).toBe(3);
      expect((lookupSwitchInsn!.keys as number[])).toContain(1);
      expect((lookupSwitchInsn!.keys as number[])).toContain(10);
      expect((lookupSwitchInsn!.keys as number[])).toContain(100);
    });
  });

  describe('ArrayInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('ArrayInsns.class');
    });

    it('should parse IALOAD instruction', () => {
      const method = visitor.methods.get('testIaload([II)I');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.IALOAD
      )).toBe(true);
    });

    it('should parse IASTORE instruction', () => {
      const method = visitor.methods.get('testIastore([III)V');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.IASTORE
      )).toBe(true);
    });

    it('should parse AALOAD instruction', () => {
      const method = visitor.methods.get('testAaload([Ljava/lang/Object;I)Ljava/lang/Object;');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.AALOAD
      )).toBe(true);
    });

    it('should parse AASTORE instruction', () => {
      const method = visitor.methods.get('testAastore([Ljava/lang/Object;ILjava/lang/Object;)V');
      expect(method).toBeDefined();
      expect(method!.instructions.some(
        (i) => i.type === 'insn' && i.opcode === Opcodes.AASTORE
      )).toBe(true);
    });
  });

  describe('MultiANewArrayInsns.class', () => {
    let visitor: RecordingClassVisitor;

    beforeAll(() => {
      visitor = parseClass('MultiANewArrayInsns.class');
    });

    it('should parse MULTIANEWARRAY with 2 dimensions', () => {
      const method = visitor.methods.get('testMultianewarray2DInt(II)[[I');
      expect(method).toBeDefined();
      const multianewarrayInsn = method!.instructions.find(
        (i) => i.type === 'multiANewArrayInsn'
      );
      expect(multianewarrayInsn).toBeDefined();
      expect(multianewarrayInsn!.descriptor).toBe('[[I');
      expect(multianewarrayInsn!.numDimensions).toBe(2);
    });

    it('should parse MULTIANEWARRAY with 3 dimensions', () => {
      const method = visitor.methods.get('testMultianewarray3DInt(III)[[[I');
      expect(method).toBeDefined();
      const multianewarrayInsn = method!.instructions.find(
        (i) => i.type === 'multiANewArrayInsn'
      );
      expect(multianewarrayInsn).toBeDefined();
      expect(multianewarrayInsn!.descriptor).toBe('[[[I');
      expect(multianewarrayInsn!.numDimensions).toBe(3);
    });

    it('should parse MULTIANEWARRAY with object type', () => {
      const method = visitor.methods.get('testMultianewarray2DObject(II)[[Ljava/lang/Object;');
      expect(method).toBeDefined();
      const multianewarrayInsn = method!.instructions.find(
        (i) => i.type === 'multiANewArrayInsn'
      );
      expect(multianewarrayInsn).toBeDefined();
      expect(multianewarrayInsn!.descriptor).toBe('[[Ljava/lang/Object;');
      expect(multianewarrayInsn!.numDimensions).toBe(2);
    });
  });
});
