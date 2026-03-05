import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '@blkswn/java-ir';
import { JavaDecompiler } from '@blkswn/java-decompiler';

const jarPath = '/Users/terminalsin/Documents/blackswan-java/benchmarks/jvm-obfuscation-tester/obf-test-1.0-SNAPSHOT.jar';

async function main() {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);
  const decompiler = new JavaDecompiler();

  const entry = zip.file('dev/sim0n/app/test/impl/crypttest/Blowfish$BlowfishECB.class');
  if (!entry) { console.log('Class not found'); return; }
  const classData = await entry.async('uint8array');
  const result = decompiler.decompileClassFileBytes(classData);
  const lines = result.split('\n');
  let inMethod = false;
  let braceCount = 0;
  for (const line of lines) {
    if (line.includes('encrypt(byte[] inbuffer, byte[] outbuffer)')) inMethod = true;
    if (inMethod) {
      console.log(line);
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      if (braceCount <= 0 && inMethod && line.includes('}')) break;
    }
  }

  console.log('\n=== EnumConstantsTest ===');
  const entry2 = zip.file('dev/sim0n/app/test/impl/enumtest/EnumConstantsTest.class');
  if (!entry2) return;
  const classData2 = await entry2.async('uint8array');
  console.log(decompiler.decompileClassFileBytes(classData2));
}

main().catch(console.error);
