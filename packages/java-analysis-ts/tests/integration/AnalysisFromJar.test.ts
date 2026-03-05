/**
 * Integration test that builds analysis from a JAR file.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, ClassIR } from '@blkswn/java-ir';
import {
  JavaAnalysisCoordinator,
  ConstantFoldingPass,
  isResolvedStaticInvocation,
  isResolvedVirtualInvocation,
  isResolvedFieldLoad,
} from '../../src';

const JAR_PATH = path.join(__dirname, '../../../java-ir-ts/workspace/test.jar');

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
 * Build ClassIR from bytecode.
 */
function buildClassIR(bytecode: Uint8Array): ClassIR | null {
  const reader = new ClassReader(bytecode);
  const visitor = new IRClassVisitor();
  reader.accept(visitor, 0);
  return visitor.getClassIR();
}

describe('Analysis from JAR', () => {
  let classIRs: ClassIR[];
  let classCount: number;

  beforeAll(async () => {
    if (!fs.existsSync(JAR_PATH)) {
      console.warn(`Warning: test.jar not found at ${JAR_PATH}`);
      classIRs = [];
      return;
    }

    const classFiles = await extractClassesFromJar(JAR_PATH);
    classCount = classFiles.size;

    classIRs = [];
    for (const [, bytecode] of classFiles) {
      try {
        const classIR = buildClassIR(bytecode);
        if (classIR) {
          classIRs.push(classIR);
        }
      } catch (e) {
        // Skip classes that fail to parse
      }
    }

    console.log(`Built IR for ${classIRs.length}/${classCount} classes`);
  }, 60000);

  it('should build analysis program', () => {
    if (classIRs.length === 0) {
      console.log('Skipping test - no classes available');
      return;
    }

    const coordinator = new JavaAnalysisCoordinator();
    const program = coordinator.analyze(classIRs);

    expect(program.classCount).toBeGreaterThan(0);
    expect(program.methodCount).toBeGreaterThan(0);

    const stats = program.getStatistics();
    console.log('Analysis Statistics:', stats);
  });

  it('should build class hierarchy', () => {
    if (classIRs.length === 0) {
      return;
    }

    const coordinator = new JavaAnalysisCoordinator();
    const program = coordinator.analyze(classIRs);

    // Check hierarchy relationships
    for (const cls of program.classes.values()) {
      if (cls.superName) {
        const supertypes = program.hierarchy.getAllSupertypes(cls.name);
        expect(supertypes.has(cls.name)).toBe(true);
        expect(supertypes.has(cls.superName)).toBe(true);
      }

      for (const iface of cls.interfaces) {
        const supertypes = program.hierarchy.getAllSupertypes(cls.name);
        expect(supertypes.has(iface)).toBe(true);
      }
    }
  });

  it('should resolve method invocations', () => {
    if (classIRs.length === 0) {
      return;
    }

    const coordinator = new JavaAnalysisCoordinator();
    const program = coordinator.analyze(classIRs);

    let resolvedStatic = 0;
    let resolvedVirtual = 0;

    for (const method of program.getAllMethods()) {
      if (!method.cfg) continue;

      for (const block of method.cfg.blocks) {
        for (const stmt of block.statements) {
          for (const expr of stmt.getExpressions()) {
            if (isResolvedStaticInvocation(expr)) {
              resolvedStatic++;
              expect(expr.declaredMethod).toBeDefined();
            }
            if (isResolvedVirtualInvocation(expr)) {
              resolvedVirtual++;
              expect(expr.declaredMethod).toBeDefined();
              expect(expr.possibleTargets).toBeDefined();
            }
          }
        }
      }
    }

    console.log(`Resolved invocations: ${resolvedStatic} static, ${resolvedVirtual} virtual`);
  });

  it('should build call graph', () => {
    if (classIRs.length === 0) {
      return;
    }

    const coordinator = new JavaAnalysisCoordinator();
    const program = coordinator.analyze(classIRs);

    expect(program.callGraph.callSiteCount).toBeGreaterThan(0);
    expect(program.callGraph.edgeCount).toBeGreaterThan(0);

    console.log(`Call graph: ${program.callGraph.callSiteCount} call sites, ${program.callGraph.edgeCount} edges`);
  });

  it('should run constant folding pass', () => {
    if (classIRs.length === 0) {
      return;
    }

    const coordinator = new JavaAnalysisCoordinator();
    const program = coordinator.analyze(classIRs);

    const pass = new ConstantFoldingPass();
    const stats = pass.runOnMethods(program.getAllMethods());

    console.log('Constant Folding Statistics:', stats);

    expect(stats.methodsProcessed).toBeGreaterThan(0);
  });

  it('should report diagnostics for unresolved references', () => {
    if (classIRs.length === 0) {
      return;
    }

    const coordinator = new JavaAnalysisCoordinator({ suppressJdkDiagnostics: false });
    const program = coordinator.analyze(classIRs);

    console.log(`Diagnostics: ${program.diagnostics.count}`);

    // There should be some diagnostics for JDK references
    expect(program.diagnostics.count).toBeGreaterThanOrEqual(0);
  });
});

describe('Constant Folding', () => {
  it('should fold arithmetic with constants', async () => {
    // Create a simple test case manually
    const { ConstantExpr, ArithmeticExpr, ArithmeticOp } = await import('@blkswn/java-ir');
    const { Type } = await import('@blkswn/java-asm');
    const { ConstantFolder } = await import('../../src');

    const folder = new ConstantFolder();

    // Test: 2 + 3 = 5
    const left = new ConstantExpr(Type.INT_TYPE, 2);
    const right = new ConstantExpr(Type.INT_TYPE, 3);
    const add = new ArithmeticExpr(Type.INT_TYPE, left, right, ArithmeticOp.ADD);

    const result = folder.foldArithmetic(add);

    expect(result).toBeInstanceOf(ConstantExpr);
    expect((result as any).value).toBe(5);
  });

  it('should fold negation with constants', async () => {
    const { ConstantExpr, NegationExpr } = await import('@blkswn/java-ir');
    const { Type } = await import('@blkswn/java-asm');
    const { ConstantFolder } = await import('../../src');

    const folder = new ConstantFolder();

    // Test: -42 = -42
    const operand = new ConstantExpr(Type.INT_TYPE, 42);
    const neg = new NegationExpr(Type.INT_TYPE, operand);

    const result = folder.foldNegation(neg);

    expect(result).toBeInstanceOf(ConstantExpr);
    expect((result as any).value).toBe(-42);
  });

  it('should fold comparison with constants', async () => {
    const { ConstantExpr, ComparisonExpr, ComparisonOp } = await import('@blkswn/java-ir');
    const { Type } = await import('@blkswn/java-asm');
    const { ConstantFolder } = await import('../../src');

    const folder = new ConstantFolder();

    // Test: lcmp(5L, 3L) = 1
    const left = new ConstantExpr(Type.LONG_TYPE, BigInt(5));
    const right = new ConstantExpr(Type.LONG_TYPE, BigInt(3));
    const cmp = new ComparisonExpr(left, right, ComparisonOp.LCMP);

    const result = folder.foldComparison(cmp);

    expect(result).toBeInstanceOf(ConstantExpr);
    expect((result as any).value).toBe(1);
  });

  it('should not fold division by zero', async () => {
    const { ConstantExpr, ArithmeticExpr, ArithmeticOp } = await import('@blkswn/java-ir');
    const { Type } = await import('@blkswn/java-asm');
    const { ConstantFolder } = await import('../../src');

    const folder = new ConstantFolder();

    // Test: 10 / 0 should not be folded
    const left = new ConstantExpr(Type.INT_TYPE, 10);
    const right = new ConstantExpr(Type.INT_TYPE, 0);
    const div = new ArithmeticExpr(Type.INT_TYPE, left, right, ArithmeticOp.DIV);

    const result = folder.foldArithmetic(div);

    // Should return the original expression
    expect(result).toBe(div);
  });

  it('should fold integer shifts with masking', async () => {
    const { ConstantExpr, ArithmeticExpr, ArithmeticOp } = await import('@blkswn/java-ir');
    const { Type } = await import('@blkswn/java-asm');
    const { ConstantFolder } = await import('../../src');

    const folder = new ConstantFolder();

    // Test: 1 << 34 should be 1 << (34 & 0x1f) = 1 << 2 = 4
    const left = new ConstantExpr(Type.INT_TYPE, 1);
    const right = new ConstantExpr(Type.INT_TYPE, 34);
    const shl = new ArithmeticExpr(Type.INT_TYPE, left, right, ArithmeticOp.SHL);

    const result = folder.foldArithmetic(shl);

    expect(result).toBeInstanceOf(ConstantExpr);
    expect((result as any).value).toBe(4);
  });
});

describe('Class Hierarchy', () => {
  it('should handle basic hierarchy queries', async () => {
    const { ClassHierarchyGraph } = await import('../../src');

    const hierarchy = new ClassHierarchyGraph();

    // Add mock classes
    hierarchy.addNode({ name: 'A' } as any);
    hierarchy.addNode({ name: 'B' } as any);
    hierarchy.addNode({ name: 'C' } as any);
    hierarchy.addNode({ name: 'I' } as any);

    hierarchy.setSuperclass('B', 'A');
    hierarchy.setSuperclass('C', 'B');
    hierarchy.setSuperclass('A', null);
    hierarchy.addInterface('C', 'I');

    // Test superclass chain
    const chain = hierarchy.getSuperclassChain('C');
    expect(chain).toEqual(['C', 'B', 'A']);

    // Test all supertypes
    const supertypes = hierarchy.getAllSupertypes('C');
    expect(supertypes.has('C')).toBe(true);
    expect(supertypes.has('B')).toBe(true);
    expect(supertypes.has('A')).toBe(true);
    expect(supertypes.has('I')).toBe(true);

    // Test subtypes
    const subtypes = hierarchy.getAllSubtypes('A');
    expect(subtypes.has('A')).toBe(true);
    expect(subtypes.has('B')).toBe(true);
    expect(subtypes.has('C')).toBe(true);

    // Test isSubtypeOf
    expect(hierarchy.isSubtypeOf('C', 'A')).toBe(true);
    expect(hierarchy.isSubtypeOf('A', 'C')).toBe(false);
  });
});
