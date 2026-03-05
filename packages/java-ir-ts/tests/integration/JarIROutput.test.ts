/**
 * Integration test that reads classes from test.jar, builds IR, and outputs to a text file.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '../../src/builder/IRClassVisitor';
import { IRPrinter } from '../../src/visitor/IRPrinter';
import { ClassIR } from '../../src/ir/ClassIR';

const JAR_PATH = path.join(__dirname, '../../workspace/test.jar');
const OUTPUT_PATH = path.join(__dirname, '../../workspace/ir-output.txt');

/**
 * Extract class files from JAR using JSZip.
 */
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

describe('JAR IR Output Tests', () => {
  let classFiles: Map<string, Uint8Array>;
  let irResults: Map<string, ClassIR>;
  let errors: Map<string, string>;

  beforeAll(async () => {
    if (!fs.existsSync(JAR_PATH)) {
      console.warn(`Warning: test.jar not found at ${JAR_PATH}`);
      classFiles = new Map();
      return;
    }

    classFiles = await extractClassesFromJar(JAR_PATH);
    irResults = new Map();
    errors = new Map();

    console.log(`Processing ${classFiles.size} class files...`);
    let processed = 0;

    // Process all class files
    for (const [className, bytecode] of classFiles) {
      try {
        const classReader = new ClassReader(bytecode);
        const irClassVisitor = new IRClassVisitor();
        classReader.accept(irClassVisitor, 0);
        const classIR = irClassVisitor.getClassIR();

        if (classIR) {
          irResults.set(className, classIR);
        } else {
          errors.set(className, 'Failed to build IR (null result)');
        }
      } catch (error) {
        errors.set(className, error instanceof Error ? error.message : String(error));
      }

      processed++;
      if (processed % 20 === 0) {
        console.log(`  Processed ${processed}/${classFiles.size} classes...`);
      }
    }

    console.log(`Done processing. Success: ${irResults.size}, Errors: ${errors.size}`);
  }, 120000); // 2 minute timeout for beforeAll

  it('should extract class files from test.jar', () => {
    expect(classFiles.size).toBeGreaterThan(0);
    console.log(`Found ${classFiles.size} class files in test.jar`);
  });

  it('should build IR for most classes', () => {
    const successRate = irResults.size / classFiles.size;
    console.log(`Successfully built IR for ${irResults.size}/${classFiles.size} classes (${(successRate * 100).toFixed(1)}%)`);

    if (errors.size > 0) {
      console.log(`\nErrors (${errors.size}):`);
      const errorEntries = Array.from(errors.entries()).slice(0, 10);
      for (const [className, error] of errorEntries) {
        console.log(`  - ${className}: ${error.substring(0, 100)}`);
      }
    }

    // We expect at least 50% success rate initially
    expect(successRate).toBeGreaterThan(0.5);
  });

  it('should output IR to text file', { timeout: 60000 }, () => {
    const outputLines: string[] = [];

    outputLines.push('='.repeat(80));
    outputLines.push('JAVA IR OUTPUT FROM test.jar');
    outputLines.push(`Generated at: ${new Date().toISOString()}`);
    outputLines.push(`Total classes: ${classFiles.size}`);
    outputLines.push(`Successfully processed: ${irResults.size}`);
    outputLines.push(`Errors: ${errors.size}`);
    outputLines.push('='.repeat(80));
    outputLines.push('');

    // Sort class names for consistent output
    const sortedClassNames = Array.from(irResults.keys()).sort();

    for (const className of sortedClassNames) {
      const classIR = irResults.get(className)!;

      outputLines.push('-'.repeat(80));
      outputLines.push(`// File: ${className}`);
      outputLines.push('-'.repeat(80));

      try {
        const irOutput = IRPrinter.print(classIR);
        outputLines.push(irOutput);
      } catch (error) {
        outputLines.push(`// ERROR printing IR: ${error instanceof Error ? error.message : String(error)}`);
      }

      outputLines.push('');
    }

    // Add error summary at the end
    if (errors.size > 0) {
      outputLines.push('');
      outputLines.push('='.repeat(80));
      outputLines.push('ERROR SUMMARY');
      outputLines.push('='.repeat(80));

      for (const [className, error] of errors) {
        outputLines.push(`${className}:`);
        outputLines.push(`  ${error}`);
        outputLines.push('');
      }
    }

    const outputContent = outputLines.join('\n');

    // Write to file
    fs.writeFileSync(OUTPUT_PATH, outputContent, 'utf-8');

    console.log(`\nIR output written to: ${OUTPUT_PATH}`);
    console.log(`Output size: ${(outputContent.length / 1024).toFixed(1)} KB`);

    expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
  });

  it('should produce readable IR for Application class', () => {
    const appClass = Array.from(irResults.entries()).find(([name]) =>
      name.includes('Application.class')
    );

    if (!appClass) {
      console.log('Application class not found in IR results');
      return;
    }

    const [className, classIR] = appClass;
    console.log(`\nSample IR for ${className}:`);

    const irOutput = IRPrinter.print(classIR);
    console.log(irOutput.substring(0, 2000));

    expect(irOutput).toContain('class');
    expect(classIR.methods.length).toBeGreaterThan(0);
  });

  it('should report statistics', () => {
    console.log('\n=== IR Build Statistics ===');
    console.log(`Total classes in JAR: ${classFiles.size}`);
    console.log(`Successfully built IR: ${irResults.size}`);
    console.log(`Failed: ${errors.size}`);

    // Count methods and fields
    let totalMethods = 0;
    let totalFields = 0;
    let totalBlocks = 0;
    let totalStatements = 0;

    for (const classIR of irResults.values()) {
      totalFields += classIR.fields.length;
      totalMethods += classIR.methods.length;

      for (const method of classIR.methods) {
        if (method.cfg) {
          totalBlocks += method.cfg.blocks.length;
          for (const block of method.cfg.blocks.values()) {
            totalStatements += block.statements.length;
          }
        }
      }
    }

    console.log(`\nAggregate statistics:`);
    console.log(`  Total fields: ${totalFields}`);
    console.log(`  Total methods: ${totalMethods}`);
    console.log(`  Total basic blocks: ${totalBlocks}`);
    console.log(`  Total statements: ${totalStatements}`);

    // Error breakdown
    if (errors.size > 0) {
      const errorTypes = new Map<string, number>();
      for (const error of errors.values()) {
        const errorType = error.split(':')[0] || 'Unknown';
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      }

      console.log(`\nError breakdown:`);
      for (const [errorType, count] of errorTypes) {
        console.log(`  ${errorType}: ${count}`);
      }
    }
  });
});
