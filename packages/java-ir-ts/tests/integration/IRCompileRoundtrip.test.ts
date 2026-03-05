import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '../../src/builder/IRClassVisitor';
import { IRClassCompiler } from '../../src/compiler/IRClassCompiler';

const JAR_PATH = path.join(__dirname, '../../workspace/test.jar');

async function extractClassesFromJar(jarPath: string): Promise<Map<string, Uint8Array>> {
  const jarBuffer = fs.readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);

  const classes = new Map<string, Uint8Array>();
  for (const [fileName, zipEntry] of Object.entries(zip.files)) {
    if (fileName.endsWith('.class') && !zipEntry.dir) {
      const data = await zipEntry.async('uint8array');
      classes.set(fileName, data);
    }
  }
  return classes;
}

describe('IR → ASM → class bytes (roundtrip)', () => {
  it('should compile IR back to .class bytes and re-parse with ClassReader', { timeout: 120000 }, async () => {
    if (!fs.existsSync(JAR_PATH)) {
      console.warn(`Warning: test.jar not found at ${JAR_PATH}`);
      return;
    }

    const classFiles = await extractClassesFromJar(JAR_PATH);
    expect(classFiles.size).toBeGreaterThan(0);

    const compiler = new IRClassCompiler();
    let compiledCount = 0;

    // Keep it deterministic and bounded.
    const sorted = Array.from(classFiles.entries()).sort(([a], [b]) => a.localeCompare(b));

    for (const [className, bytecode] of sorted) {
      const reader = new ClassReader(bytecode);
      const irVisitor = new IRClassVisitor();
      reader.accept(irVisitor, 0);
      const classIR = irVisitor.getClassIR();
      expect(classIR, `Failed to build IR for ${className}`).toBeTruthy();

      const outBytes = compiler.compileToBytes(classIR!);
      expect(outBytes.length, `Compiled bytes empty for ${className}`).toBeGreaterThan(0);

      // Ensure java-asm-ts can re-parse what we emitted.
      const roundtripReader = new ClassReader(outBytes);
      roundtripReader.accept(new IRClassVisitor(), 0);

      compiledCount++;
    }

    expect(compiledCount).toBeGreaterThan(0);
  });
});

