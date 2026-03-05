import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '@blkswn/java-ir';

const jarPath = '/Users/terminalsin/Documents/blackswan-java/benchmarks/jvm-obfuscation-tester/obf-test-1.0-SNAPSHOT.jar';

async function main() {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);

  // Look at one of the simple encrypt methods in BlowfishECB inner class
  const entry = zip.file('dev/sim0n/app/test/impl/crypttest/Blowfish$BlowfishECB.class');
  if (!entry) { console.log('Class not found'); return; }

  const classData = await entry.async('uint8array');
  const cr = new ClassReader(classData);
  const irVisitor = new IRClassVisitor();
  cr.accept(irVisitor, 0);
  const classIR = irVisitor.getClassIR();

  // Find simple encrypt(byte[], byte[]) method
  for (const method of classIR.methods) {
    if (method.name === 'encrypt' && method.descriptor === '([B[B)V') {
      console.log(`\n=== ${method.name}${method.descriptor} ===`);
      const cfg = method.cfg;
      if (!cfg) { console.log('No CFG'); continue; }

      console.log(`Blocks: ${cfg.blocks.length}`);
      console.log(`Exception handlers: ${cfg.exceptionHandlers.length}`);

      for (let i = 0; i < cfg.blocks.length; i++) {
        const block = cfg.blocks[i]!;
        console.log(`\n--- Block ${i} ---`);
        console.log(`  Successors: [${[...block.successors].join(', ')}]`);
        console.log(`  Predecessors: [${[...block.predecessors].join(', ')}]`);
        console.log(`  Statements (${block.statements.length}):`);
        for (const stmt of block.statements) {
          console.log(`    ${stmt.toString()}`);
        }
      }

      // Check local variables
      console.log('\n--- Local Variables ---');
      for (const lv of method.localVariables) {
        console.log(`  index=${lv.index} name=${lv.name} desc=${lv.descriptor} startBlock=${lv.startBlock} endBlock=${lv.endBlock}`);
      }
      break;
    }
  }

  // Also check EnumConstantsTest
  const entry2 = zip.file('dev/sim0n/app/test/impl/enumtest/EnumConstantsTest.class');
  if (!entry2) { console.log('EnumConstantsTest not found'); return; }

  const classData2 = await entry2.async('uint8array');
  const cr2 = new ClassReader(classData2);
  const irVisitor2 = new IRClassVisitor();
  cr2.accept(irVisitor2, 0);
  const classIR2 = irVisitor2.getClassIR();

  for (const method of classIR2.methods) {
    if (method.name === 'run') {
      console.log(`\n\n=== EnumConstantsTest.${method.name} ===`);
      const cfg = method.cfg;
      if (!cfg) { console.log('No CFG'); continue; }

      console.log(`Blocks: ${cfg.blocks.length}`);
      for (let i = 0; i < cfg.blocks.length; i++) {
        const block = cfg.blocks[i]!;
        console.log(`\n--- Block ${i} ---`);
        console.log(`  Successors: [${[...block.successors].join(', ')}]`);
        console.log(`  Predecessors: [${[...block.predecessors].join(', ')}]`);
        console.log(`  Statements (${block.statements.length}):`);
        for (const stmt of block.statements) {
          console.log(`    ${stmt.toString()}`);
        }
      }
    }
  }
}

main().catch(console.error);
