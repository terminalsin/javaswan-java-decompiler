import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, type ClassIR } from '@blkswn/java-ir';
import { JavaAnalysisCoordinator } from '@blkswn/java-analysis';
import { ConstantFoldingPass, OptimizationPipeline } from '@blkswn/java-analysis';
import type { JavaDecompilerOptions } from './JavaDecompilerOptions';
import { JavaClassSourceEmitter } from '../source/JavaClassSourceEmitter';

const DEFAULT_OPTIONS: Required<JavaDecompilerOptions> = {
  resolveReferences: true,
  constantFolding: true,
  emitPackageDeclaration: true,
  includeDebugComments: false,
};

/**
 * High-level entry point for decompiling Java `.class` files to Java-ish source code.
 */
export class JavaDecompiler {
  private readonly classEmitter: JavaClassSourceEmitter;

  constructor() {
    this.classEmitter = new JavaClassSourceEmitter();
  }

  /**
   * Decompiles a single class file's bytes into Java-like source.
   *
   * Note: For best reference resolution, use `decompileClassIRs` with a larger program.
   */
  public decompileClassFileBytes(classBytes: Uint8Array, options: JavaDecompilerOptions = {}): string {
    const merged = { ...DEFAULT_OPTIONS, ...options };
    const classIR = this.buildClassIr(classBytes);
    return this.decompileClassIRs([classIR], merged).get(classIR.name)!;
  }

  /**
   * Decompiles multiple class files from their raw bytes.
   * Builds ClassIR internally to avoid cross-package type incompatibilities,
   * while still enabling cross-class reference resolution.
   */
  public decompileMultipleClassBytes(
    classFileBytes: Uint8Array[],
    options: JavaDecompilerOptions = {},
  ): Map<string, string> {
    const merged = { ...DEFAULT_OPTIONS, ...options };
    const classIRs: ClassIR[] = [];
    for (const bytes of classFileBytes) {
      classIRs.push(this.buildClassIr(bytes));
    }
    return this.decompileClassIRs(classIRs, merged);
  }

  /**
   * Decompiles a set of `ClassIR`s (a "program") to Java-like source.
   * This enables better reference resolution and optimization passes.
   */
  public decompileClassIRs(
    classIRs: readonly ClassIR[],
    options: JavaDecompilerOptions = {}
  ): Map<string, string> {
    const merged = { ...DEFAULT_OPTIONS, ...options };

    if (merged.resolveReferences || merged.constantFolding) {
      const coordinator = new JavaAnalysisCoordinator({
        resolveReferences: merged.resolveReferences,
        buildCallGraph: false,
      });
      const program = coordinator.analyze(classIRs);

      if (merged.constantFolding) {
        const pipeline = new OptimizationPipeline();
        pipeline.addPass(new ConstantFoldingPass());
        pipeline.run(program.getAllMethods());
      }
    }

    const classIRMap = new Map<string, ClassIR>();
    for (const classIR of classIRs) {
      classIRMap.set(classIR.name, classIR);
    }

    const results = new Map<string, string>();
    const inlinedInnerClasses = new Set<string>();
    for (const classIR of classIRs) {
      const emitResult = this.classEmitter.emit(classIR, {
        emitPackageDeclaration: merged.emitPackageDeclaration,
        includeDebugComments: merged.includeDebugComments,
        classIRMap,
      });
      results.set(classIR.name, emitResult.source);
      for (const name of emitResult.inlinedInnerClasses) {
        inlinedInnerClasses.add(name);
      }
    }

    // Remove inlined inner classes from results
    for (const name of inlinedInnerClasses) {
      results.delete(name);
    }

    return results;
  }

  private buildClassIr(classBytes: Uint8Array): ClassIR {
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

