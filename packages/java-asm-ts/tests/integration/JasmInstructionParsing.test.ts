/**
 * JASM-based instruction parsing tests.
 * 
 * These tests use JASM (https://github.com/roscopeco/jasm) as the assembler
 * to generate .class files with specific bytecode instructions, then verify
 * that our TypeScript ASM library correctly parses them.
 * 
 * Prerequisites:
 * 1. JDK 11+ installed
 * 2. Gradle installed
 * 3. Run: cd workspace && gradle jasm
 *    to compile the .jasm sources to .class files
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ClassReader, SKIP_DEBUG, SKIP_FRAMES } from '../../src/readers/ClassReader';
import { ClassVisitor } from '../../src/visitors/ClassVisitor';
import { MethodVisitor } from '../../src/visitors/MethodVisitor';
import { FieldVisitor } from '../../src/visitors/FieldVisitor';
import { Label } from '../../src/core/Label';
import * as Opcodes from '../../src/core/Opcodes';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_DIR = path.join(__dirname, '../../workspace');
const CLASSES_DIR = path.join(WORKSPACE_DIR, 'classes/jasm-sources');

// Helper to check if compiled classes exist
function classesExist(): boolean {
  try {
    return fs.existsSync(CLASSES_DIR) && fs.readdirSync(CLASSES_DIR).length > 0;
  } catch {
    return false;
  }
}

// Helper to read a .class file
function readClassFile(className: string): Uint8Array {
  const filePath = path.join(CLASSES_DIR, `${className}.class`);
  const buffer = fs.readFileSync(filePath);
  return new Uint8Array(buffer);
}

// Instruction collector visitor
class InstructionCollector extends MethodVisitor {
  public instructions: Array<{opcode: number; args?: unknown[]}> = [];
  public labels: Map<Label, number> = new Map();
  private labelCounter = 0;

  constructor() {
    super(Opcodes.ASM9);
  }

  override visitInsn(opcode: number): void {
    this.instructions.push({ opcode });
  }

  override visitIntInsn(opcode: number, operand: number): void {
    this.instructions.push({ opcode, args: [operand] });
  }

  override visitVarInsn(opcode: number, varIndex: number): void {
    this.instructions.push({ opcode, args: [varIndex] });
  }

  override visitTypeInsn(opcode: number, type: string): void {
    this.instructions.push({ opcode, args: [type] });
  }

  override visitFieldInsn(opcode: number, owner: string, name: string, descriptor: string): void {
    this.instructions.push({ opcode, args: [owner, name, descriptor] });
  }

  override visitMethodInsn(opcode: number, owner: string, name: string, descriptor: string, isInterface: boolean): void {
    this.instructions.push({ opcode, args: [owner, name, descriptor, isInterface] });
  }

  override visitJumpInsn(opcode: number, label: Label): void {
    let labelId = this.labels.get(label);
    if (labelId === undefined) {
      labelId = this.labelCounter++;
      this.labels.set(label, labelId);
    }
    this.instructions.push({ opcode, args: ['L' + labelId] });
  }

  override visitLabel(label: Label): void {
    let labelId = this.labels.get(label);
    if (labelId === undefined) {
      labelId = this.labelCounter++;
      this.labels.set(label, labelId);
    }
    this.instructions.push({ opcode: -1, args: ['LABEL', 'L' + labelId] });
  }

  override visitLdcInsn(value: unknown): void {
    this.instructions.push({ opcode: Opcodes.LDC, args: [value] });
  }

  override visitIincInsn(varIndex: number, increment: number): void {
    this.instructions.push({ opcode: Opcodes.IINC, args: [varIndex, increment] });
  }

  override visitTableSwitchInsn(min: number, max: number, dflt: Label, labels: Label[]): void {
    this.instructions.push({ opcode: Opcodes.TABLESWITCH, args: [min, max, labels.length] });
  }

  override visitLookupSwitchInsn(dflt: Label, keys: number[], labels: Label[]): void {
    this.instructions.push({ opcode: Opcodes.LOOKUPSWITCH, args: [keys.length, keys] });
  }

  override visitMultiANewArrayInsn(descriptor: string, numDimensions: number): void {
    this.instructions.push({ opcode: Opcodes.MULTIANEWARRAY, args: [descriptor, numDimensions] });
  }
}

// Method collector visitor
class MethodCollector extends ClassVisitor {
  public methods: Map<string, InstructionCollector> = new Map();

  constructor() {
    super(Opcodes.ASM9);
  }

  override visitMethod(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: string[] | null
  ): MethodVisitor | null {
    const collector = new InstructionCollector();
    this.methods.set(name + descriptor, collector);
    return collector;
  }
}

// Helper to parse a class and collect instructions
function parseClass(className: string): MethodCollector {
  const bytecode = readClassFile(className);
  const reader = new ClassReader(bytecode);
  const collector = new MethodCollector();
  reader.accept(collector, SKIP_DEBUG | SKIP_FRAMES);
  return collector;
}

// Helper to get method instructions
function getMethodInstructions(collector: MethodCollector, methodSig: string): Array<{opcode: number; args?: unknown[]}> {
  const method = collector.methods.get(methodSig);
  if (!method) {
    throw new Error(`Method ${methodSig} not found`);
  }
  return method.instructions;
}

// Skip tests if classes haven't been compiled
const describeIfCompiled = classesExist() ? describe : describe.skip;

describeIfCompiled('JASM Instruction Parsing', () => {
  describe('Zero-operand instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('ZeroOperandInsns');
    });

    it('should parse NOP instruction', () => {
      const insns = getMethodInstructions(collector, 'testNop()V');
      expect(insns.some(i => i.opcode === Opcodes.NOP)).toBe(true);
    });

    it('should parse ACONST_NULL instruction', () => {
      const insns = getMethodInstructions(collector, 'testAconstNull()Ljava/lang/Object;');
      expect(insns.some(i => i.opcode === Opcodes.ACONST_NULL)).toBe(true);
    });

    it('should parse ICONST_M1 instruction', () => {
      const insns = getMethodInstructions(collector, 'testIconstM1()I');
      expect(insns.some(i => i.opcode === Opcodes.ICONST_M1)).toBe(true);
    });

    it('should parse ICONST_0 through ICONST_5', () => {
      expect(getMethodInstructions(collector, 'testIconst0()I').some(i => i.opcode === Opcodes.ICONST_0)).toBe(true);
      expect(getMethodInstructions(collector, 'testIconst1()I').some(i => i.opcode === Opcodes.ICONST_1)).toBe(true);
      expect(getMethodInstructions(collector, 'testIconst2()I').some(i => i.opcode === Opcodes.ICONST_2)).toBe(true);
      expect(getMethodInstructions(collector, 'testIconst3()I').some(i => i.opcode === Opcodes.ICONST_3)).toBe(true);
      expect(getMethodInstructions(collector, 'testIconst4()I').some(i => i.opcode === Opcodes.ICONST_4)).toBe(true);
      expect(getMethodInstructions(collector, 'testIconst5()I').some(i => i.opcode === Opcodes.ICONST_5)).toBe(true);
    });

    it('should parse LCONST_0 and LCONST_1', () => {
      expect(getMethodInstructions(collector, 'testLconst0()J').some(i => i.opcode === Opcodes.LCONST_0)).toBe(true);
      expect(getMethodInstructions(collector, 'testLconst1()J').some(i => i.opcode === Opcodes.LCONST_1)).toBe(true);
    });

    it('should parse FCONST instructions', () => {
      expect(getMethodInstructions(collector, 'testFconst0()F').some(i => i.opcode === Opcodes.FCONST_0)).toBe(true);
      expect(getMethodInstructions(collector, 'testFconst1()F').some(i => i.opcode === Opcodes.FCONST_1)).toBe(true);
      // Note: testFconst2 uses LDC 2.0 because there's no fconst_2 instruction
    });

    it('should parse DCONST instructions', () => {
      expect(getMethodInstructions(collector, 'testDconst0()D').some(i => i.opcode === Opcodes.DCONST_0)).toBe(true);
      expect(getMethodInstructions(collector, 'testDconst1()D').some(i => i.opcode === Opcodes.DCONST_1)).toBe(true);
    });

    it('should parse arithmetic instructions', () => {
      expect(getMethodInstructions(collector, 'testIadd(II)I').some(i => i.opcode === Opcodes.IADD)).toBe(true);
      expect(getMethodInstructions(collector, 'testIsub(II)I').some(i => i.opcode === Opcodes.ISUB)).toBe(true);
      expect(getMethodInstructions(collector, 'testImul(II)I').some(i => i.opcode === Opcodes.IMUL)).toBe(true);
      expect(getMethodInstructions(collector, 'testIdiv(II)I').some(i => i.opcode === Opcodes.IDIV)).toBe(true);
    });

    it('should parse type conversion instructions', () => {
      expect(getMethodInstructions(collector, 'testI2l(I)J').some(i => i.opcode === Opcodes.I2L)).toBe(true);
      expect(getMethodInstructions(collector, 'testI2f(I)F').some(i => i.opcode === Opcodes.I2F)).toBe(true);
      expect(getMethodInstructions(collector, 'testI2d(I)D').some(i => i.opcode === Opcodes.I2D)).toBe(true);
    });

    it('should parse return instructions', () => {
      expect(getMethodInstructions(collector, 'testNop()V').some(i => i.opcode === Opcodes.RETURN)).toBe(true);
      expect(getMethodInstructions(collector, 'testIconst0()I').some(i => i.opcode === Opcodes.IRETURN)).toBe(true);
      expect(getMethodInstructions(collector, 'testLconst0()J').some(i => i.opcode === Opcodes.LRETURN)).toBe(true);
      expect(getMethodInstructions(collector, 'testFconst0()F').some(i => i.opcode === Opcodes.FRETURN)).toBe(true);
      expect(getMethodInstructions(collector, 'testDconst0()D').some(i => i.opcode === Opcodes.DRETURN)).toBe(true);
      expect(getMethodInstructions(collector, 'testAconstNull()Ljava/lang/Object;').some(i => i.opcode === Opcodes.ARETURN)).toBe(true);
    });
  });

  describe('Int operand instructions (BIPUSH, SIPUSH, NEWARRAY)', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('IntInsns');
    });

    it('should parse BIPUSH with positive value', () => {
      const insns = getMethodInstructions(collector, 'testBipush10()I');
      const bipush = insns.find(i => i.opcode === Opcodes.BIPUSH);
      expect(bipush).toBeDefined();
      expect(bipush?.args?.[0]).toBe(10);
    });

    it('should parse BIPUSH with negative value', () => {
      const insns = getMethodInstructions(collector, 'testBipushNeg128()I');
      const bipush = insns.find(i => i.opcode === Opcodes.BIPUSH);
      expect(bipush).toBeDefined();
      expect(bipush?.args?.[0]).toBe(-128);
    });

    it('should parse SIPUSH instructions', () => {
      const insns = getMethodInstructions(collector, 'testSipush1000()I');
      const sipush = insns.find(i => i.opcode === Opcodes.SIPUSH);
      expect(sipush).toBeDefined();
      expect(sipush?.args?.[0]).toBe(1000);
    });

    it('should parse NEWARRAY with all primitive types', () => {
      // T_BOOLEAN = 4, T_CHAR = 5, T_FLOAT = 6, T_DOUBLE = 7
      // T_BYTE = 8, T_SHORT = 9, T_INT = 10, T_LONG = 11
      expect(getMethodInstructions(collector, 'testNewarrayBoolean(I)[Z')
        .some(i => i.opcode === Opcodes.NEWARRAY && i.args?.[0] === Opcodes.T_BOOLEAN)).toBe(true);
      expect(getMethodInstructions(collector, 'testNewarrayChar(I)[C')
        .some(i => i.opcode === Opcodes.NEWARRAY && i.args?.[0] === Opcodes.T_CHAR)).toBe(true);
      expect(getMethodInstructions(collector, 'testNewarrayInt(I)[I')
        .some(i => i.opcode === Opcodes.NEWARRAY && i.args?.[0] === Opcodes.T_INT)).toBe(true);
      expect(getMethodInstructions(collector, 'testNewarrayLong(I)[J')
        .some(i => i.opcode === Opcodes.NEWARRAY && i.args?.[0] === Opcodes.T_LONG)).toBe(true);
    });
  });

  describe('Variable instructions (xLOAD, xSTORE)', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('VarInsns');
    });

    it('should parse ILOAD with various indices', () => {
      // testIloadIstore uses iload 0, istore 1, iload 1
      const insns = getMethodInstructions(collector, 'testIloadIstore(I)I');
      expect(insns.some(i => i.opcode === Opcodes.ILOAD && i.args?.[0] === 0)).toBe(true);
      expect(insns.some(i => i.opcode === Opcodes.ILOAD && i.args?.[0] === 1)).toBe(true);
    });

    it('should parse ISTORE instructions', () => {
      const insns = getMethodInstructions(collector, 'testIloadIstore(I)I');
      expect(insns.some(i => i.opcode === Opcodes.ISTORE)).toBe(true);
    });

    it('should parse ALOAD instructions', () => {
      const insns = getMethodInstructions(collector, 'testAloadAstore(Ljava/lang/Object;)Ljava/lang/Object;');
      expect(insns.some(i => i.opcode === Opcodes.ALOAD && i.args?.[0] === 0)).toBe(true);
    });
  });

  describe('Jump instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('JumpInsns');
    });

    it('should parse IFEQ instruction', () => {
      const insns = getMethodInstructions(collector, 'testIfeq(I)I');
      expect(insns.some(i => i.opcode === Opcodes.IFEQ)).toBe(true);
    });

    it('should parse IFNE instruction', () => {
      const insns = getMethodInstructions(collector, 'testIfne(I)I');
      expect(insns.some(i => i.opcode === Opcodes.IFNE)).toBe(true);
    });

    it('should parse comparison jumps', () => {
      expect(getMethodInstructions(collector, 'testIfIcmpeq(II)I').some(i => i.opcode === Opcodes.IF_ICMPEQ)).toBe(true);
      expect(getMethodInstructions(collector, 'testIfIcmpne(II)I').some(i => i.opcode === Opcodes.IF_ICMPNE)).toBe(true);
      expect(getMethodInstructions(collector, 'testIfIcmplt(II)I').some(i => i.opcode === Opcodes.IF_ICMPLT)).toBe(true);
    });

    it('should parse GOTO instruction', () => {
      const insns = getMethodInstructions(collector, 'testGoto()I');
      expect(insns.some(i => i.opcode === Opcodes.GOTO)).toBe(true);
    });

    it('should parse IFNULL and IFNONNULL', () => {
      expect(getMethodInstructions(collector, 'testIfnull(Ljava/lang/Object;)I').some(i => i.opcode === Opcodes.IFNULL)).toBe(true);
      expect(getMethodInstructions(collector, 'testIfnonnull(Ljava/lang/Object;)I').some(i => i.opcode === Opcodes.IFNONNULL)).toBe(true);
    });
  });

  describe('Type instructions (NEW, CHECKCAST, INSTANCEOF, ANEWARRAY)', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('TypeInsns');
    });

    it('should parse NEW instruction', () => {
      const insns = getMethodInstructions(collector, 'testNew()Ljava/lang/Object;');
      const newInsn = insns.find(i => i.opcode === Opcodes.NEW);
      expect(newInsn).toBeDefined();
      expect(newInsn?.args?.[0]).toBe('java/lang/Object');
    });

    it('should parse CHECKCAST instruction', () => {
      const insns = getMethodInstructions(collector, 'testCheckcast(Ljava/lang/Object;)Ljava/lang/String;');
      const checkcast = insns.find(i => i.opcode === Opcodes.CHECKCAST);
      expect(checkcast).toBeDefined();
      expect(checkcast?.args?.[0]).toBe('java/lang/String');
    });

    it('should parse INSTANCEOF instruction', () => {
      const insns = getMethodInstructions(collector, 'testInstanceof(Ljava/lang/Object;)I');
      const instanceOf = insns.find(i => i.opcode === Opcodes.INSTANCEOF);
      expect(instanceOf).toBeDefined();
      expect(instanceOf?.args?.[0]).toBe('java/lang/String');
    });

    it('should parse ANEWARRAY instruction', () => {
      const insns = getMethodInstructions(collector, 'testAnewarrayString(I)[Ljava/lang/String;');
      const anewarray = insns.find(i => i.opcode === Opcodes.ANEWARRAY);
      expect(anewarray).toBeDefined();
      expect(anewarray?.args?.[0]).toBe('java/lang/String');
    });
  });

  describe('Field instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('FieldInsns');
    });

    it('should parse GETSTATIC instruction', () => {
      const insns = getMethodInstructions(collector, 'testGetstatic()I');
      const getstatic = insns.find(i => i.opcode === Opcodes.GETSTATIC);
      expect(getstatic).toBeDefined();
      expect(getstatic?.args?.[0]).toBe('test/FieldInsns');
      expect(getstatic?.args?.[1]).toBe('staticIntField');
      expect(getstatic?.args?.[2]).toBe('I');
    });

    it('should parse PUTSTATIC instruction', () => {
      const insns = getMethodInstructions(collector, 'testPutstatic(I)V');
      const putstatic = insns.find(i => i.opcode === Opcodes.PUTSTATIC);
      expect(putstatic).toBeDefined();
      expect(putstatic?.args?.[0]).toBe('test/FieldInsns');
      expect(putstatic?.args?.[1]).toBe('staticIntField');
    });

    it('should parse GETFIELD instruction', () => {
      const insns = getMethodInstructions(collector, 'testGetfield()I');
      const getfield = insns.find(i => i.opcode === Opcodes.GETFIELD);
      expect(getfield).toBeDefined();
      expect(getfield?.args?.[0]).toBe('test/FieldInsns');
      expect(getfield?.args?.[1]).toBe('instanceIntField');
    });

    it('should parse PUTFIELD instruction', () => {
      const insns = getMethodInstructions(collector, 'testPutfield(I)V');
      const putfield = insns.find(i => i.opcode === Opcodes.PUTFIELD);
      expect(putfield).toBeDefined();
      expect(putfield?.args?.[0]).toBe('test/FieldInsns');
      expect(putfield?.args?.[1]).toBe('instanceIntField');
    });

    it('should parse GETSTATIC for long field', () => {
      const insns = getMethodInstructions(collector, 'testGetstaticLong()J');
      const getstatic = insns.find(i => i.opcode === Opcodes.GETSTATIC);
      expect(getstatic).toBeDefined();
      expect(getstatic?.args?.[0]).toBe('test/FieldInsns');
      expect(getstatic?.args?.[1]).toBe('staticLongField');
      expect(getstatic?.args?.[2]).toBe('J');
    });
  });

  describe('Method instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('MethodInsns');
    });

    it('should parse INVOKEVIRTUAL instruction', () => {
      const insns = getMethodInstructions(collector, 'testInvokevirtual()I');
      const invoke = insns.find(i => i.opcode === Opcodes.INVOKEVIRTUAL);
      expect(invoke).toBeDefined();
      expect(invoke?.args?.[0]).toBe('test/MethodInsns');
      expect(invoke?.args?.[1]).toBe('helperVirtual');
      expect(invoke?.args?.[2]).toBe('()I');
    });

    it('should parse INVOKESPECIAL instruction', () => {
      const insns = getMethodInstructions(collector, 'testInvokespecial()Ljava/lang/Object;');
      const invoke = insns.find(i => i.opcode === Opcodes.INVOKESPECIAL);
      expect(invoke).toBeDefined();
      expect(invoke?.args?.[0]).toBe('java/lang/Object');
      expect(invoke?.args?.[1]).toBe('<init>');
    });

    it('should parse INVOKESTATIC instruction', () => {
      const insns = getMethodInstructions(collector, 'testInvokestatic()I');
      const invoke = insns.find(i => i.opcode === Opcodes.INVOKESTATIC);
      expect(invoke).toBeDefined();
      expect(invoke?.args?.[0]).toBe('test/MethodInsns');
      expect(invoke?.args?.[1]).toBe('helperStatic');
    });

    it('should parse INVOKEINTERFACE instruction', () => {
      const insns = getMethodInstructions(collector, 'testInvokeinterface(Ljava/util/List;)I');
      const invoke = insns.find(i => i.opcode === Opcodes.INVOKEINTERFACE);
      expect(invoke).toBeDefined();
      expect(invoke?.args?.[0]).toBe('java/util/List');
      expect(invoke?.args?.[1]).toBe('size');
      expect(invoke?.args?.[3]).toBe(true); // isInterface
    });
  });

  describe('LDC instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('LdcInsns');
    });

    it('should parse LDC with integer constant', () => {
      const insns = getMethodInstructions(collector, 'testLdcInt()I');
      const ldc = insns.find(i => i.opcode === Opcodes.LDC);
      expect(ldc).toBeDefined();
      expect(ldc?.args?.[0]).toBe(12345);
    });

    it('should parse LDC with string constant', () => {
      const insns = getMethodInstructions(collector, 'testLdcString()Ljava/lang/String;');
      const ldc = insns.find(i => i.opcode === Opcodes.LDC);
      expect(ldc).toBeDefined();
      expect(ldc?.args?.[0]).toBe('Hello, World!');
    });

    it('should parse LDC with float constant', () => {
      const insns = getMethodInstructions(collector, 'testLdcFloat()F');
      const ldc = insns.find(i => i.opcode === Opcodes.LDC);
      expect(ldc).toBeDefined();
      expect(typeof ldc?.args?.[0]).toBe('number');
      expect(Math.abs((ldc?.args?.[0] as number) - 3.14)).toBeLessThan(0.01);
    });

    it('should parse LDC2_W with long constant', () => {
      const insns = getMethodInstructions(collector, 'testLdcLong()J');
      const ldc = insns.find(i => i.opcode === Opcodes.LDC);
      expect(ldc).toBeDefined();
      // Long may be represented as bigint or number
    });

    it('should parse LDC2_W with double constant', () => {
      const insns = getMethodInstructions(collector, 'testLdcDouble()D');
      const ldc = insns.find(i => i.opcode === Opcodes.LDC);
      expect(ldc).toBeDefined();
      expect(typeof ldc?.args?.[0]).toBe('number');
    });
  });

  describe('IINC instruction', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('IincInsns');
    });

    it('should parse IINC with positive increment', () => {
      const insns = getMethodInstructions(collector, 'testIincPositive(I)I');
      const iinc = insns.find(i => i.opcode === Opcodes.IINC);
      expect(iinc).toBeDefined();
      expect(iinc?.args?.[0]).toBe(0); // var index
      expect(iinc?.args?.[1]).toBe(1); // increment
    });

    it('should parse IINC with negative increment', () => {
      const insns = getMethodInstructions(collector, 'testIincNegative(I)I');
      const iinc = insns.find(i => i.opcode === Opcodes.IINC);
      expect(iinc).toBeDefined();
      expect(iinc?.args?.[1]).toBe(-1); // increment
    });

    it('should parse IINC with larger increment', () => {
      const insns = getMethodInstructions(collector, 'testIincMax127(I)I');
      const iinc = insns.find(i => i.opcode === Opcodes.IINC);
      expect(iinc).toBeDefined();
      expect(iinc?.args?.[1]).toBe(127);
    });
  });

  describe('Switch instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('SwitchInsns');
    });

    it('should parse TABLESWITCH instruction', () => {
      const insns = getMethodInstructions(collector, 'testTableswitch(I)I');
      const tableswitch = insns.find(i => i.opcode === Opcodes.TABLESWITCH);
      expect(tableswitch).toBeDefined();
      expect(tableswitch?.args?.[0]).toBe(0); // min
      expect(tableswitch?.args?.[1]).toBe(2); // max (cases 0, 1, 2)
    });

    it('should parse LOOKUPSWITCH instruction', () => {
      const insns = getMethodInstructions(collector, 'testLookupswitch(I)I');
      const lookupswitch = insns.find(i => i.opcode === Opcodes.LOOKUPSWITCH);
      expect(lookupswitch).toBeDefined();
      expect(lookupswitch?.args?.[0]).toBe(3); // number of cases (1, 10, 100)
    });
  });

  describe('MULTIANEWARRAY instruction', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('MultiANewArrayInsns');
    });

    it('should parse MULTIANEWARRAY with 2 dimensions', () => {
      const insns = getMethodInstructions(collector, 'testMultianewarray2DInt(II)[[I');
      const multi = insns.find(i => i.opcode === Opcodes.MULTIANEWARRAY);
      expect(multi).toBeDefined();
      expect(multi?.args?.[0]).toBe('[[I');
      expect(multi?.args?.[1]).toBe(2);
    });

    it('should parse MULTIANEWARRAY with 3 dimensions', () => {
      const insns = getMethodInstructions(collector, 'testMultianewarray3DInt(III)[[[I');
      const multi = insns.find(i => i.opcode === Opcodes.MULTIANEWARRAY);
      expect(multi).toBeDefined();
      expect(multi?.args?.[0]).toBe('[[[I');
      expect(multi?.args?.[1]).toBe(3);
    });

    it('should parse MULTIANEWARRAY with partial allocation', () => {
      const insns = getMethodInstructions(collector, 'testMultianewarray2DPartial(I)[[I');
      const multi = insns.find(i => i.opcode === Opcodes.MULTIANEWARRAY);
      expect(multi).toBeDefined();
      expect(multi?.args?.[0]).toBe('[[I');
      expect(multi?.args?.[1]).toBe(1); // only 1 dimension allocated
    });
  });

  describe('Array load/store instructions', () => {
    let collector: MethodCollector;

    beforeAll(() => {
      collector = parseClass('ArrayInsns');
    });

    it('should parse IALOAD instruction', () => {
      const insns = getMethodInstructions(collector, 'testIaload([II)I');
      expect(insns.some(i => i.opcode === Opcodes.IALOAD)).toBe(true);
    });

    it('should parse IASTORE instruction', () => {
      const insns = getMethodInstructions(collector, 'testIastore([III)V');
      expect(insns.some(i => i.opcode === Opcodes.IASTORE)).toBe(true);
    });

    it('should parse AALOAD instruction', () => {
      const insns = getMethodInstructions(collector, 'testAaload([Ljava/lang/Object;I)Ljava/lang/Object;');
      expect(insns.some(i => i.opcode === Opcodes.AALOAD)).toBe(true);
    });

    it('should parse AASTORE instruction', () => {
      const insns = getMethodInstructions(collector, 'testAastore([Ljava/lang/Object;ILjava/lang/Object;)V');
      expect(insns.some(i => i.opcode === Opcodes.AASTORE)).toBe(true);
    });

    it('should parse all primitive array loads', () => {
      expect(getMethodInstructions(collector, 'testLaload([JI)J').some(i => i.opcode === Opcodes.LALOAD)).toBe(true);
      expect(getMethodInstructions(collector, 'testFaload([FI)F').some(i => i.opcode === Opcodes.FALOAD)).toBe(true);
      expect(getMethodInstructions(collector, 'testDaload([DI)D').some(i => i.opcode === Opcodes.DALOAD)).toBe(true);
      expect(getMethodInstructions(collector, 'testBaload([BI)I').some(i => i.opcode === Opcodes.BALOAD)).toBe(true);
      expect(getMethodInstructions(collector, 'testCaload([CI)I').some(i => i.opcode === Opcodes.CALOAD)).toBe(true);
      expect(getMethodInstructions(collector, 'testSaload([SI)I').some(i => i.opcode === Opcodes.SALOAD)).toBe(true);
    });
  });
});
