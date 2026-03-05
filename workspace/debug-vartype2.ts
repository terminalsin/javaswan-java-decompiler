import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '@blkswn/java-ir';

// Import source-level modules directly to test current code
import { JavaClassSourceEmitter } from '../packages/java-decompiler-ts/src/source/JavaClassSourceEmitter';

const jarPath = '/Users/terminalsin/Documents/blackswan-java/benchmarks/jvm-obfuscation-tester/obf-test-1.0-SNAPSHOT.jar';

async function main() {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);

  const entry = zip.file('dev/sim0n/app/test/impl/annotation/AnnotationTest.class');
  if (!entry) { console.log('Class not found'); return; }

  const classData = await entry.async('uint8array');

  // Build IR
  const cr = new ClassReader(classData);
  const irVisitor = new IRClassVisitor();
  cr.accept(irVisitor, 0);
  const classIR = irVisitor.getClassIR();

  // Build a classIRMap
  const classIRMap = new Map([[classIR.name, classIR]]);

  // Decompile using source-level emitter
  const emitter = new JavaClassSourceEmitter();
  const result = emitter.emit(classIR, {
    emitPackageDeclaration: true,
    includeDebugComments: true,
    classIRMap,
  });

  console.log(result.source);
}

main().catch(console.error);
