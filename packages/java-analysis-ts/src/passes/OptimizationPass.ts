import type { AnalysisMethod } from '../model/AnalysisMethod';

/**
 * Statistics from running an optimization pass.
 */
export interface PassStatistics {
  /**
   * Number of methods processed.
   */
  methodsProcessed: number;

  /**
   * Number of transformations applied.
   */
  transformationsApplied: number;

  /**
   * Pass-specific statistics.
   */
  [key: string]: number | string | boolean;
}

/**
 * Context provided to optimization passes.
 */
export interface PassContext {
  /**
   * The method being optimized.
   */
  readonly method: AnalysisMethod;
}

/**
 * Base interface for optimization passes.
 */
export interface OptimizationPass {
  /**
   * The name of this pass.
   */
  readonly name: string;

  /**
   * A brief description of what this pass does.
   */
  readonly description: string;

  /**
   * Runs the pass on a single method.
   * Returns true if any transformations were made.
   */
  runOnMethod(method: AnalysisMethod): boolean;

  /**
   * Runs the pass on all methods.
   * Returns statistics about the pass execution.
   */
  runOnMethods(methods: readonly AnalysisMethod[]): PassStatistics;

  /**
   * Resets any internal state of the pass.
   */
  reset(): void;
}

/**
 * Abstract base class for optimization passes.
 */
export abstract class AbstractOptimizationPass implements OptimizationPass {
  public abstract readonly name: string;
  public abstract readonly description: string;

  protected statistics: PassStatistics = {
    methodsProcessed: 0,
    transformationsApplied: 0,
  };

  public abstract runOnMethod(method: AnalysisMethod): boolean;

  public runOnMethods(methods: readonly AnalysisMethod[]): PassStatistics {
    this.reset();

    for (const method of methods) {
      if (method.hasCode()) {
        const changed = this.runOnMethod(method);
        this.statistics.methodsProcessed++;
        if (changed) {
          this.statistics.transformationsApplied++;
        }
      }
    }

    return { ...this.statistics };
  }

  public reset(): void {
    this.statistics = {
      methodsProcessed: 0,
      transformationsApplied: 0,
    };
  }
}

/**
 * A pipeline of optimization passes.
 */
export class OptimizationPipeline {
  private readonly passes: OptimizationPass[] = [];

  /**
   * Adds a pass to the pipeline.
   */
  public addPass(pass: OptimizationPass): this {
    this.passes.push(pass);
    return this;
  }

  /**
   * Runs all passes in sequence on the given methods.
   */
  public run(methods: readonly AnalysisMethod[]): Map<string, PassStatistics> {
    const results = new Map<string, PassStatistics>();

    for (const pass of this.passes) {
      const stats = pass.runOnMethods(methods);
      results.set(pass.name, stats);
    }

    return results;
  }

  /**
   * Runs all passes repeatedly until no changes are made (fixed point).
   */
  public runToFixedPoint(
    methods: readonly AnalysisMethod[],
    maxIterations: number = 10
  ): Map<string, PassStatistics[]> {
    const allResults = new Map<string, PassStatistics[]>();
    
    for (const pass of this.passes) {
      allResults.set(pass.name, []);
    }

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let anyChanged = false;

      for (const pass of this.passes) {
        const stats = pass.runOnMethods(methods);
        allResults.get(pass.name)!.push(stats);

        if (stats.transformationsApplied > 0) {
          anyChanged = true;
        }
      }

      if (!anyChanged) {
        break;
      }
    }

    return allResults;
  }

  /**
   * Gets the passes in this pipeline.
   */
  public getPasses(): readonly OptimizationPass[] {
    return this.passes;
  }
}
