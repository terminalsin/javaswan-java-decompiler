import { JavaDecompiler } from '@blkswn/java-decompiler';
import type { JavaDecompilerOptions } from '@blkswn/java-decompiler';
import type { ClassIR } from '@blkswn/java-ir';
import { AIPostProcessor } from './AIPostProcessor';
import type { AIJavaDecompilerOptions, AIPostProcessResult } from './types';

/**
 * Convenience wrapper that combines JavaDecompiler with AI post-processing.
 * Decompiles bytecode first, then runs the result through an OpenCode agent
 * for cleanup and improvement.
 */
export class AIJavaDecompiler {
  private readonly decompiler: JavaDecompiler;
  private readonly postProcessor: AIPostProcessor;
  private readonly decompilerOptions: JavaDecompilerOptions;

  constructor(options?: AIJavaDecompilerOptions) {
    this.decompiler = new JavaDecompiler();
    this.postProcessor = new AIPostProcessor(options?.aiOptions);
    this.decompilerOptions = options?.decompilerOptions ?? {};
  }

  /**
   * Decompile a single class file and post-process with AI.
   * Returns the improved Java source string.
   */
  async decompileClassFileBytes(
    classBytes: Uint8Array,
    options?: JavaDecompilerOptions,
  ): Promise<string> {
    const opts = options ?? this.decompilerOptions;
    const source = this.decompiler.decompileClassFileBytes(classBytes, opts);

    // Use a placeholder class name derived from the source or a default
    const className = extractClassName(source) ?? 'DecompiledClass';
    const sources = new Map<string, string>([[className, source]]);

    const result = await this.postProcessor.postProcess(sources);
    return result.sources.get(className) ?? source;
  }

  /**
   * Decompile a set of ClassIRs and post-process the results with AI.
   */
  async decompileClassIRs(
    classIRs: readonly ClassIR[],
    options?: JavaDecompilerOptions,
  ): Promise<AIPostProcessResult> {
    const opts = options ?? this.decompilerOptions;
    const sources = this.decompiler.decompileClassIRs(classIRs, opts);
    return this.postProcessor.postProcess(sources);
  }

  /**
   * Checks whether the OpenCode server is reachable.
   */
  async healthCheck(): Promise<boolean> {
    return this.postProcessor.healthCheck();
  }
}

/**
 * Attempts to extract a class name from Java source by looking for a class/interface declaration.
 */
function extractClassName(source: string): string | null {
  const match = source.match(
    /(?:public\s+)?(?:abstract\s+)?(?:final\s+)?(?:class|interface|enum|@interface)\s+(\w+)/,
  );
  return match?.[1] ?? null;
}
