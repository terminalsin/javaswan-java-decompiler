import type { MetricResult, SourceFile } from '../types.js';

export interface SimilarityMetric {
  readonly name: string;
  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult | null;
}
