/**
 * Integration test that reads classes from test.jar, decompiles them, and outputs to a text file.
 *
 * This is primarily a regression artifact generator: it writes the full decompiled output to
 * `packages/java-decompiler-ts/workspace/decompiled-output.txt`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, type ClassIR } from '@blkswn/java-ir';
import { JavaDecompiler } from '../../src';

const JAR_PATH = path.join(__dirname, '../../workspace/test.jar');
const OUTPUT_PATH = path.join(__dirname, '../../workspace/decompiled-output.txt');

class JarClassFileExtractor {
    public async extractClassesFromJar(jarPath: string): Promise<Map<string, Uint8Array>> {
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
}

class JarClassIrBuilder {
    public buildClassIr(classBytes: Uint8Array): ClassIR {
        const reader = new ClassReader(classBytes);
        const visitor = new IRClassVisitor();
        reader.accept(visitor, 0);
        const classIR = visitor.getClassIR();
        if (!classIR) {
            throw new Error('Failed to build ClassIR from class bytes');
        }
        return classIR;
    }
}

describe('JAR decompile output', () => {
    let classFiles: Map<string, Uint8Array>;
    let classIRs: ClassIR[];
    let classFileErrors: Map<string, string>;

    beforeAll(async () => {
        if (!fs.existsSync(JAR_PATH)) {
            console.warn(`Warning: test.jar not found at ${JAR_PATH}`);
            classFiles = new Map();
            classIRs = [];
            classFileErrors = new Map();
            return;
        }

        const extractor = new JarClassFileExtractor();
        const irBuilder = new JarClassIrBuilder();

        classFiles = await extractor.extractClassesFromJar(JAR_PATH);
        classIRs = [];
        classFileErrors = new Map();

        for (const [fileName, bytecode] of classFiles) {
            try {
                classIRs.push(irBuilder.buildClassIr(bytecode));
            } catch (error) {
                classFileErrors.set(fileName, error instanceof Error ? error.message : String(error));
            }
        }
    }, 120000);

    it('should extract class files from test.jar', () => {
        expect(classFiles.size).toBeGreaterThan(0);
    });

    it('should build IR for most classes (so we can decompile them)', () => {
        const successRate = classIRs.length / Math.max(1, classFiles.size);
        expect(successRate).toBeGreaterThan(0.5);
    });

    it('should decompile all parseable classes and write output to workspace', { timeout: 120000 }, () => {
        const decompiler = new JavaDecompiler();
        const sourcesByInternalName = decompiler.decompileClassIRs(classIRs, {
            resolveReferences: true,
            constantFolding: true,
            emitPackageDeclaration: true,
            includeDebugComments: true,
        });

        const outputLines: string[] = [];
        outputLines.push('='.repeat(80));
        outputLines.push('JAVA DECOMPILER OUTPUT FROM test.jar');
        outputLines.push(`Generated at: ${new Date().toISOString()}`);
        outputLines.push(`Jar: ${JAR_PATH}`);
        outputLines.push(`Total .class entries: ${classFiles.size}`);
        outputLines.push(`IR built: ${classIRs.length}`);
        outputLines.push(`Decompiled: ${sourcesByInternalName.size}`);
        outputLines.push(`IR build errors: ${classFileErrors.size}`);
        outputLines.push('='.repeat(80));
        outputLines.push('');

        const sortedInternalNames = Array.from(sourcesByInternalName.keys()).sort();
        for (const internalName of sortedInternalNames) {
            const src = sourcesByInternalName.get(internalName)!;
            outputLines.push('-'.repeat(80));
            outputLines.push(`// Class: ${internalName}`);
            outputLines.push('-'.repeat(80));
            outputLines.push(src);
            outputLines.push('');
        }

        if (classFileErrors.size > 0) {
            outputLines.push('');
            outputLines.push('='.repeat(80));
            outputLines.push('IR BUILD ERRORS');
            outputLines.push('='.repeat(80));
            outputLines.push('');
            for (const [fileName, error] of Array.from(classFileErrors.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
                outputLines.push(`${fileName}:`);
                outputLines.push(`  ${error}`);
                outputLines.push('');
            }
        }

        const content = outputLines.join('\n');
        fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');

        expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
        expect(content.length).toBeGreaterThan(0);
        expect(content).not.toContain('__pc');
    });
});

