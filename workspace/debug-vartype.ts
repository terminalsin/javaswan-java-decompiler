import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { ClassReader, ClassVisitor, MethodVisitor, ASM9, type Label } from '@blkswn/java-asm';
import { IRClassVisitor, type ClassIR } from '@blkswn/java-ir';
import { JavaDecompiler } from '@blkswn/java-decompiler';

const jarPath = '/Users/terminalsin/Documents/blackswan-java/benchmarks/jvm-obfuscation-tester/obf-test-1.0-SNAPSHOT.jar';

async function main() {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);

  const entry = zip.file('dev/sim0n/app/test/impl/annotation/AnnotationTest.class');
  if (!entry) {
    console.log('Class not found');
    return;
  }

  const classData = await entry.async('uint8array');
  const cr = new ClassReader(classData);

  // 1. Check local variable table
  console.log('=== LOCAL VARIABLE TABLE ===');
  class DebugVisitor extends ClassVisitor {
    constructor() { super(ASM9); }
    visitMethod(access: number, name: string, descriptor: string, signature: string | null, exceptions: string[] | null): MethodVisitor | null {
      if (name !== 'run') return null;
      console.log(`Method: ${name}${descriptor} (sig: ${signature})`);
      return new class extends MethodVisitor {
        constructor() { super(ASM9); }
        visitLocalVariable(name: string, descriptor: string, signature: string | null, start: Label, end: Label, index: number): void {
          console.log(`  LocalVar[${index}]: name=${name}, desc=${descriptor}, sig=${signature}`);
        }
        visitMaxs(maxStack: number, maxLocals: number): void {
          console.log(`  maxStack=${maxStack}, maxLocals=${maxLocals}`);
        }
      }();
    }
  }
  cr.accept(new DebugVisitor(), 0);

  // 2. Build IR and check variable resolution
  console.log('\n=== IR VARIABLE RESOLUTION ===');
  const irVisitor = new IRClassVisitor();
  const cr2 = new ClassReader(classData);
  cr2.accept(irVisitor, 0);
  const classIR = irVisitor.getClassIR();

  for (const method of classIR.methods) {
    if (method.name !== 'run') continue;
    console.log(`\nMethod: ${method.name}`);
    console.log(`  localVariables count: ${method.localVariables.length}`);
    for (const lv of method.localVariables) {
      console.log(`  LV[${lv.index}]: name=${lv.name}, desc=${lv.descriptor}, sig=${lv.signature}, blocks=${lv.startBlock}-${lv.endBlock}`);
    }

    // Check getVariableDescriptor for each possible slot
    for (let i = 0; i < 10; i++) {
      const desc = method.getVariableDescriptor(i, 0);
      const name = method.getVariableName(i, 0);
      console.log(`  getVariableDescriptor(${i}, 0) = ${desc}, getVariableName(${i}, 0) = ${name}`);
    }
  }

  // 3. Decompile and show output
  console.log('\n=== DECOMPILED OUTPUT ===');
  const decompiler = new JavaDecompiler();
  const result = decompiler.decompileClassFileBytes(classData);
  console.log(result);
}

main().catch(console.error);
