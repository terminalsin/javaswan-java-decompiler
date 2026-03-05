import type { MetricResult } from '../types.js';

const DEFAULT_WEIGHTS: Record<string, number> = {
  'jaccard': 0.08,
  'cosine': 0.10,
  'dice': 0.07,
  'levenshtein': 0.12,
  'lcs-ratio': 0.12,
  'line-diff': 0.10,
  'ncd': 0.11,
  'ast-similarity': 0.15,
  'control-flow': 0.10,
};

export class CompositeScorer {
  private readonly weights: Record<string, number>;

  constructor(weightOverrides?: Record<string, number>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weightOverrides };
  }

  score(metrics: MetricResult[]): number {
    // Filter to metrics that actually produced results
    const available = metrics.filter((m) => m.score >= 0);

    if (available.length === 0) return 0;

    // Sum up available weights and normalize
    let totalWeight = 0;
    let weightedSum = 0;

    for (const metric of available) {
      const weight = this.weights[metric.metricName] ?? 0.05;
      totalWeight += weight;
      weightedSum += weight * metric.score;
    }

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }
}
