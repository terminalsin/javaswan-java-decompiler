import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { JavaDecompiler } from '@blkswn/java-decompiler';

const jarPath = '/Users/terminalsin/Documents/blackswan-java/benchmarks/jvm-obfuscation-tester/obf-test-1.0-SNAPSHOT.jar';

async function main() {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);
  const decompiler = new JavaDecompiler();

  const entry = zip.file('dev/sim0n/app/test/impl/crypttest/Blowfish.class');
  if (!entry) { console.log('Class not found'); return; }
  const classData = await entry.async('uint8array');
  console.log(decompiler.decompileClassFileBytes(classData));
}
main().catch(console.error);
