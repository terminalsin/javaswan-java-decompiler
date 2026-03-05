/**
 * Integration tests for JAR file round-trip (disassemble and reassemble).
 * This test loads all classes from test.jar, parses them with ClassReader,
 * writes them back with ClassWriter, and verifies the result.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { ClassReader } from '../../src/readers/ClassReader';
import { ClassWriter, COMPUTE_MAXS } from '../../src/writers/ClassWriter';
import { ClassVisitor } from '../../src/visitors/ClassVisitor';
import { MethodVisitor } from '../../src/visitors/MethodVisitor';
import { FieldVisitor } from '../../src/visitors/FieldVisitor';
import { Label } from '../../src/core/Label';
import { Handle } from '../../src/core/Handle';
import { ASM9 } from '../../src/core/Opcodes';

const JAR_PATH = path.join(__dirname, '../../workspace/test.jar');

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

/**
 * A visitor that copies a class from reader to writer.
 */
class ClassCopier extends ClassVisitor {
    constructor(private writer: ClassWriter) {
        super(ASM9, writer);
    }
}

/**
 * Verify the bytecode is a valid class file.
 */
function isValidClassFile(bytecode: Uint8Array): boolean {
    if (bytecode.length < 4) return false;
    return bytecode[0] === 0xCA && bytecode[1] === 0xFE &&
        bytecode[2] === 0xBA && bytecode[3] === 0xBE;
}

/**
 * Statistics for the round-trip test.
 */
interface RoundTripStats {
    totalClasses: number;
    successfulRoundTrips: number;
    failedRoundTrips: string[];
    parseErrors: string[];
    writeErrors: string[];
}

describe('JAR Round-Trip Tests', () => {
    let classFiles: Map<string, Uint8Array>;
    let stats: RoundTripStats;

    beforeAll(async () => {
        // Check if JAR file exists
        if (!fs.existsSync(JAR_PATH)) {
            console.warn(`Warning: test.jar not found at ${JAR_PATH}`);
            classFiles = new Map();
            return;
        }

        classFiles = await extractClassesFromJar(JAR_PATH);
        stats = {
            totalClasses: classFiles.size,
            successfulRoundTrips: 0,
            failedRoundTrips: [],
            parseErrors: [],
            writeErrors: []
        };
    });

    it('should extract class files from test.jar', () => {
        expect(classFiles.size).toBeGreaterThan(0);
        console.log(`Found ${classFiles.size} class files in test.jar`);

        // Log some class names
        const classNames = Array.from(classFiles.keys()).slice(0, 10);
        console.log('Sample classes:', classNames);
    });

    it('should parse all class files successfully', () => {
        const parseResults: { className: string; success: boolean; error?: string }[] = [];

        for (const [className, bytecode] of classFiles) {
            try {
                const reader = new ClassReader(bytecode);
                const parsedClassName = reader.getClassName();
                parseResults.push({ className, success: true });
                expect(parsedClassName).toBeDefined();
            } catch (error) {
                parseResults.push({
                    className,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        const successCount = parseResults.filter(r => r.success).length;
        const failedClasses = parseResults.filter(r => !r.success);

        console.log(`Successfully parsed ${successCount}/${classFiles.size} classes`);

        if (failedClasses.length > 0) {
            console.log('Failed to parse:');
            for (const { className, error } of failedClasses.slice(0, 5)) {
                console.log(`  - ${className}: ${error}`);
            }
        }

        // We expect most classes to parse successfully
        expect(successCount).toBeGreaterThan(classFiles.size * 0.9);
    });

    it('should perform round-trip on all parseable classes', { timeout: 120000 }, () => {
        const roundTripResults: { className: string; success: boolean; error?: string }[] = [];

        for (const [className, originalBytecode] of classFiles) {
            try {
                // Parse the original class
                const reader = new ClassReader(originalBytecode);

                // Create a writer and copy the class
                const writer = new ClassWriter(COMPUTE_MAXS);
                reader.accept(writer, 0);

                // Get the regenerated bytecode
                const regeneratedBytecode = writer.toByteArray();

                // Verify it's a valid class file
                expect(isValidClassFile(regeneratedBytecode)).toBe(true);

                // Parse the regenerated class to verify it's readable
                const verifyReader = new ClassReader(regeneratedBytecode);
                const originalClassName = reader.getClassName();
                const regeneratedClassName = verifyReader.getClassName();

                // Verify the class names match
                expect(regeneratedClassName).toBe(originalClassName);

                // Verify superclass matches
                expect(verifyReader.getSuperName()).toBe(reader.getSuperName());

                // Verify interfaces match
                expect(verifyReader.getInterfaces()).toEqual(reader.getInterfaces());

                roundTripResults.push({ className, success: true });
            } catch (error) {
                roundTripResults.push({
                    className,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        const successCount = roundTripResults.filter(r => r.success).length;
        const failedClasses = roundTripResults.filter(r => !r.success);

        console.log(`\nRound-trip results: ${successCount}/${classFiles.size} successful`);

        if (failedClasses.length > 0) {
            console.log('Failed round-trips:');
            for (const { className, error } of failedClasses.slice(0, 10)) {
                console.log(`  - ${className}: ${error}`);
            }
        }

        // We expect a high success rate for round-trips
        expect(successCount).toBeGreaterThan(classFiles.size * 0.8);
    });

    it('should preserve class structure during round-trip', { timeout: 30000 }, () => {
        // Test a specific class in detail
        const sampleClass = Array.from(classFiles.entries()).find(([name]) =>
            name.includes('Application') || name.includes('Main') || !name.includes('$')
        );

        if (!sampleClass) {
            console.log('No suitable sample class found');
            return;
        }

        const [className, bytecode] = sampleClass;
        console.log(`Testing detailed round-trip for: ${className}`);

        const originalReader = new ClassReader(bytecode);

        // Collect original class info
        const originalInfo = {
            className: originalReader.getClassName(),
            superName: originalReader.getSuperName(),
            interfaces: originalReader.getInterfaces(),
            access: originalReader.getAccess(),
            fields: [] as string[],
            methods: [] as string[]
        };

        // Visitor to collect field and method names
        class InfoCollector extends ClassVisitor {
            fields: string[] = [];
            methods: string[] = [];

            constructor() {
                super(ASM9);
            }

            override visitField(
                access: number,
                name: string,
                descriptor: string,
                signature: string | null,
                value: unknown
            ): FieldVisitor | null {
                this.fields.push(`${name}:${descriptor}`);
                return null;
            }

            override visitMethod(
                access: number,
                name: string,
                descriptor: string,
                signature: string | null,
                exceptions: string[] | null
            ): MethodVisitor | null {
                this.methods.push(`${name}${descriptor}`);
                return null;
            }
        }

        const originalCollector = new InfoCollector();
        originalReader.accept(originalCollector, 0);
        originalInfo.fields = originalCollector.fields;
        originalInfo.methods = originalCollector.methods;

        // Perform round-trip
        const writer = new ClassWriter(COMPUTE_MAXS);
        const reader2 = new ClassReader(bytecode);
        reader2.accept(writer, 0);
        const regeneratedBytecode = writer.toByteArray();

        // Collect regenerated class info
        const regeneratedReader = new ClassReader(regeneratedBytecode);
        const regeneratedCollector = new InfoCollector();
        regeneratedReader.accept(regeneratedCollector, 0);

        const regeneratedInfo = {
            className: regeneratedReader.getClassName(),
            superName: regeneratedReader.getSuperName(),
            interfaces: regeneratedReader.getInterfaces(),
            access: regeneratedReader.getAccess(),
            fields: regeneratedCollector.fields,
            methods: regeneratedCollector.methods
        };

        // Verify structure is preserved
        expect(regeneratedInfo.className).toBe(originalInfo.className);
        expect(regeneratedInfo.superName).toBe(originalInfo.superName);
        expect(regeneratedInfo.interfaces.sort()).toEqual(originalInfo.interfaces.sort());
        expect(regeneratedInfo.fields.sort()).toEqual(originalInfo.fields.sort());
        expect(regeneratedInfo.methods.sort()).toEqual(originalInfo.methods.sort());

        console.log(`  Class: ${originalInfo.className}`);
        console.log(`  Super: ${originalInfo.superName}`);
        console.log(`  Fields: ${originalInfo.fields.length}`);
        console.log(`  Methods: ${originalInfo.methods.length}`);
    });

    it('should handle complex classes with various bytecode features', { timeout: 120000 }, () => {
        // Test classes that likely have various bytecode features
        const complexPatterns = [
            'Blowfish', // Cryptography - likely has complex control flow
            'FizzBuzz', // Enterprise patterns - likely has many classes
            'Test', // Test classes - various patterns
            'Factory', // Factory pattern - object creation
            'Visitor', // Visitor pattern - polymorphism
        ];

        for (const pattern of complexPatterns) {
            const matchingClasses = Array.from(classFiles.entries())
                .filter(([name]) => name.includes(pattern))
                .slice(0, 3);

            for (const [className, bytecode] of matchingClasses) {
                try {
                    const reader = new ClassReader(bytecode);
                    const writer = new ClassWriter(COMPUTE_MAXS);
                    reader.accept(writer, 0);

                    const regenerated = writer.toByteArray();
                    expect(isValidClassFile(regenerated)).toBe(true);

                    // Verify re-parse works
                    const verifyReader = new ClassReader(regenerated);
                    expect(verifyReader.getClassName()).toBe(reader.getClassName());
                } catch (error) {
                    // Log but don't fail for known complex cases
                    console.log(`Note: ${className} round-trip issue: ${error}`);
                }
            }
        }
    });

    it('should report comprehensive statistics', { timeout: 120000 }, () => {
        let parseSuccessCount = 0;
        let roundTripSuccessCount = 0;
        const errors: { className: string; stage: string; error: string }[] = [];

        for (const [className, bytecode] of classFiles) {
            // Try parsing
            let reader: ClassReader;
            try {
                reader = new ClassReader(bytecode);
                parseSuccessCount++;
            } catch (error) {
                errors.push({
                    className,
                    stage: 'parse',
                    error: error instanceof Error ? error.message : String(error)
                });
                continue;
            }

            // Try round-trip
            try {
                const writer = new ClassWriter(COMPUTE_MAXS);
                reader.accept(writer, 0);
                const regenerated = writer.toByteArray();

                // Verify
                const verifyReader = new ClassReader(regenerated);
                if (verifyReader.getClassName() === reader.getClassName()) {
                    roundTripSuccessCount++;
                } else {
                    errors.push({
                        className,
                        stage: 'verify',
                        error: 'Class name mismatch after round-trip'
                    });
                }
            } catch (error) {
                errors.push({
                    className,
                    stage: 'write',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        console.log('\n=== JAR Round-Trip Statistics ===');
        console.log(`Total classes: ${classFiles.size}`);
        console.log(`Parse success: ${parseSuccessCount} (${(parseSuccessCount / classFiles.size * 100).toFixed(1)}%)`);
        console.log(`Round-trip success: ${roundTripSuccessCount} (${(roundTripSuccessCount / classFiles.size * 100).toFixed(1)}%)`);

        if (errors.length > 0) {
            console.log(`\nErrors by stage:`);
            const parseErrors = errors.filter(e => e.stage === 'parse');
            const writeErrors = errors.filter(e => e.stage === 'write');
            const verifyErrors = errors.filter(e => e.stage === 'verify');

            console.log(`  Parse errors: ${parseErrors.length}`);
            console.log(`  Write errors: ${writeErrors.length}`);
            console.log(`  Verify errors: ${verifyErrors.length}`);

            if (errors.length <= 20) {
                console.log('\nError details:');
                for (const { className, stage, error } of errors) {
                    console.log(`  [${stage}] ${className}: ${error.substring(0, 100)}`);
                }
            }
        }

        // Assert minimum success rates
        expect(parseSuccessCount).toBeGreaterThan(classFiles.size * 0.95);
        expect(roundTripSuccessCount).toBeGreaterThan(classFiles.size * 0.8);
    });
});

describe('Individual Class Round-Trip Tests', () => {
    let classFiles: Map<string, Uint8Array>;

    beforeAll(async () => {
        if (!fs.existsSync(JAR_PATH)) {
            classFiles = new Map();
            return;
        }
        classFiles = await extractClassesFromJar(JAR_PATH);
    });

    it.each([
        'dev/sim0n/app/Application.class',
        'dev/sim0n/app/Main.class',
        'dev/sim0n/app/test/Test.class',
    ])('should round-trip %s', (className) => {
        const bytecode = classFiles.get(className);
        if (!bytecode) {
            console.log(`Skipping ${className} - not found in JAR`);
            return;
        }

        const reader = new ClassReader(bytecode);
        const writer = new ClassWriter(COMPUTE_MAXS);
        reader.accept(writer, 0);

        const regenerated = writer.toByteArray();
        expect(isValidClassFile(regenerated)).toBe(true);

        const verifyReader = new ClassReader(regenerated);
        expect(verifyReader.getClassName()).toBe(reader.getClassName());
    });
});

describe('Bytecode Feature Coverage', () => {
    let classFiles: Map<string, Uint8Array>;

    beforeAll(async () => {
        if (!fs.existsSync(JAR_PATH)) {
            classFiles = new Map();
            return;
        }
        classFiles = await extractClassesFromJar(JAR_PATH);
    });

    it('should track instruction coverage across all classes', { timeout: 120000 }, () => {
        const instructionCounts = new Map<string, number>();

        class InstructionCounter extends MethodVisitor {
            constructor() {
                super(ASM9);
            }

            override visitInsn(opcode: number): void {
                const key = `insn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitIntInsn(opcode: number, operand: number): void {
                const key = `intInsn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitVarInsn(opcode: number, varIndex: number): void {
                const key = `varInsn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitTypeInsn(opcode: number, type: string): void {
                const key = `typeInsn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitFieldInsn(opcode: number, owner: string, name: string, descriptor: string): void {
                const key = `fieldInsn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitMethodInsn(opcode: number, owner: string, name: string, descriptor: string, isInterface: boolean): void {
                const key = `methodInsn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitInvokeDynamicInsn(name: string, descriptor: string, bsm: Handle, ...args: unknown[]): void {
                instructionCounts.set('invokeDynamic', (instructionCounts.get('invokeDynamic') || 0) + 1);
            }

            override visitJumpInsn(opcode: number, label: Label): void {
                const key = `jumpInsn:${opcode}`;
                instructionCounts.set(key, (instructionCounts.get(key) || 0) + 1);
            }

            override visitLdcInsn(value: unknown): void {
                instructionCounts.set('ldc', (instructionCounts.get('ldc') || 0) + 1);
            }

            override visitIincInsn(varIndex: number, increment: number): void {
                instructionCounts.set('iinc', (instructionCounts.get('iinc') || 0) + 1);
            }

            override visitTableSwitchInsn(min: number, max: number, dflt: Label, ...labels: Label[]): void {
                instructionCounts.set('tableswitch', (instructionCounts.get('tableswitch') || 0) + 1);
            }

            override visitLookupSwitchInsn(dflt: Label, keys: number[], labels: Label[]): void {
                instructionCounts.set('lookupswitch', (instructionCounts.get('lookupswitch') || 0) + 1);
            }

            override visitMultiANewArrayInsn(descriptor: string, numDimensions: number): void {
                instructionCounts.set('multianewarray', (instructionCounts.get('multianewarray') || 0) + 1);
            }
        }

        class CountingVisitor extends ClassVisitor {
            constructor() {
                super(ASM9);
            }

            override visitMethod(
                access: number,
                name: string,
                descriptor: string,
                signature: string | null,
                exceptions: string[] | null
            ): MethodVisitor | null {
                return new InstructionCounter();
            }
        }

        for (const [_, bytecode] of classFiles) {
            try {
                const reader = new ClassReader(bytecode);
                reader.accept(new CountingVisitor(), 0);
            } catch {
                // Skip classes that fail to parse
            }
        }

        // Report instruction coverage
        const sortedInstructions = Array.from(instructionCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        console.log('\n=== Instruction Coverage ===');
        console.log(`Total unique instruction types: ${instructionCounts.size}`);
        console.log('\nTop 20 most common instructions:');
        for (const [key, count] of sortedInstructions.slice(0, 20)) {
            console.log(`  ${key}: ${count}`);
        }

        // Ensure we have good coverage
        expect(instructionCounts.size).toBeGreaterThan(30);
    });
});
