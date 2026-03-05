import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '@blkswn/java-ir';

const jarPath = '/Users/terminalsin/Documents/blackswan-java/benchmarks/jvm-obfuscation-tester/obf-test-1.0-SNAPSHOT.jar';

async function main() {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);
  const entry = zip.file('dev/sim0n/app/test/impl/crypttest/Blowfish.class');
  if (!entry) { console.log('Class not found'); return; }
  const classData = await entry.async('uint8array');
  const cr = new ClassReader(classData);
  const irVisitor = new IRClassVisitor();
  cr.accept(irVisitor, 0);
  const classIR = irVisitor.getClassIR();

  // encryptString has synchronized
  for (const method of classIR.methods) {
    if (method.name === 'encryptString' || method.name === 'encStr') {
      console.log(`\n=== ${method.name}${method.descriptor} ===`);
      const cfg = method.cfg;
      if (!cfg) { console.log('No CFG'); continue; }
      console.log(`Blocks: ${cfg.blocks.length}`);
      console.log(`Exception handlers: ${cfg.exceptionHandlers.length}`);
      for (const h of cfg.exceptionHandlers) {
        console.log(`  Handler: start=${h.startBlock} end=${h.endBlock} handler=${h.handlerBlock} type=${h.exceptionType}`);
      }
      for (let i = 0; i < cfg.blocks.length; i++) {
        const block = cfg.blocks[i]!;
        console.log(`\n--- Block ${i} ---`);
        console.log(`  Successors: [${[...block.successors].join(', ')}]`);
        console.log(`  Statements (${block.statements.length}):`);
        for (const stmt of block.statements) {
          console.log(`    ${stmt.toString()}`);
        }
      }
    }
  }
}
main().catch(console.error);
