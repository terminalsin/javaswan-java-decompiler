/**
 * Integration test that reads classes from test.jar, decompiles them,
 * and outputs individual .java files to workspace/decompiled/.
 *
 * This enables side-by-side comparison against the original source files
 * in workspace/jvm-obfuscation-tester/.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, type ClassIR } from '@blkswn/java-ir';
import { JavaDecompiler } from '../../src';

const JAR_PATH = path.join(__dirname, '../../workspace/test.jar');
const OUTPUT_DIR = path.join(__dirname, '../../workspace/decompiled');

describe('JAR decompile to individual files', () => {
    let sourcesByInternalName: Map<string, string>;

    beforeAll(async () => {
        if (!fs.existsSync(JAR_PATH)) {
            console.warn(`Warning: test.jar not found at ${JAR_PATH}`);
            sourcesByInternalName = new Map();
            return;
        }

        // Extract class files from JAR
        const jarBuffer = fs.readFileSync(JAR_PATH);
        const zip = await JSZip.loadAsync(jarBuffer);
        const classIRs: ClassIR[] = [];

        for (const [fileName, zipEntry] of Object.entries(zip.files)) {
            if (fileName.endsWith('.class') && !zipEntry.dir) {
                try {
                    const data = await zipEntry.async('uint8array');
                    const reader = new ClassReader(data);
                    const visitor = new IRClassVisitor();
                    reader.accept(visitor, 0);
                    const classIR = visitor.getClassIR();
                    if (classIR) classIRs.push(classIR);
                } catch {
                    // Skip classes that fail to parse
                }
            }
        }

        // Decompile
        const decompiler = new JavaDecompiler();
        sourcesByInternalName = decompiler.decompileClassIRs(classIRs, {
            resolveReferences: true,
            constantFolding: true,
            emitPackageDeclaration: true,
            includeDebugComments: false,
        });

        // Clean output directory
        if (fs.existsSync(OUTPUT_DIR)) {
            fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
        }

        // Write individual .java files
        for (const [internalName, source] of sourcesByInternalName) {
            const relativePath = internalName + '.java';
            const fullPath = path.join(OUTPUT_DIR, relativePath);
            const dir = path.dirname(fullPath);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, source, 'utf-8');
        }
    }, 120000);

    it('should write individual .java files', () => {
        expect(sourcesByInternalName.size).toBeGreaterThan(0);
        expect(fs.existsSync(OUTPUT_DIR)).toBe(true);
    });

    it('should preserve package directory structure', () => {
        const enumPath = path.join(OUTPUT_DIR, 'dev/sim0n/app/test/impl/enumtest/EnumConstant.java');
        expect(fs.existsSync(enumPath)).toBe(true);
        const content = fs.readFileSync(enumPath, 'utf-8');
        expect(content).toContain('enum EnumConstant');
    });

    it('should output correct enum syntax', () => {
        const enumPath = path.join(OUTPUT_DIR, 'dev/sim0n/app/test/impl/enumtest/EnumConstant.java');
        if (!fs.existsSync(enumPath)) return;
        const content = fs.readFileSync(enumPath, 'utf-8');
        expect(content).toContain('HELLO');
        expect(content).toContain('WORLD');
        expect(content).not.toContain('public static final');
        expect(content).not.toContain('$VALUES');
        expect(content).not.toContain('final enum');
    });

    it('should inline lambda bodies', () => {
        const evalPath = path.join(OUTPUT_DIR, 'dev/sim0n/app/test/impl/evaluation/EvaluationTest.java');
        if (!fs.existsSync(evalPath)) return;
        const content = fs.readFileSync(evalPath, 'utf-8');
        // Lambda bodies should be inlined, not calling synthetic methods
        expect(content).not.toContain('lambda$run$0()');
        expect(content).not.toContain('lambda$run$1()');
    });
});
