import type { FileEvaluation, MetricStats, StatisticalSummary } from '../types.js';

export function computeStatistics(evaluations: FileEvaluation[]): StatisticalSummary {
  if (evaluations.length === 0) {
    return { perMetric: {}, composite: emptyStats() };
  }

  // Collect all metric names
  const metricNames = new Set<string>();
  for (const evaluation of evaluations) {
    for (const m of evaluation.metrics) {
      metricNames.add(m.metricName);
    }
  }

  // Compute per-metric stats
  const perMetric: Record<string, MetricStats> = {};
  for (const name of metricNames) {
    const values = evaluations
      .map((e) => e.metrics.find((m) => m.metricName === name)?.score)
      .filter((v): v is number => v !== undefined);
    perMetric[name] = computeStats(values);
  }

  // Composite stats
  const compositeValues = evaluations.map((e) => e.compositeScore);
  const composite = computeStats(compositeValues);

  return { perMetric, composite };
}

function computeStats(values: number[]): MetricStats {
  if (values.length === 0) return emptyStats();

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const variance =
    n < 2 ? 0 : sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const stddev = Math.sqrt(variance);

  return {
    mean,
    median,
    stddev,
    min: sorted[0],
    max: sorted[n - 1],
  };
}

function emptyStats(): MetricStats {
  return { mean: 0, median: 0, stddev: 0, min: 0, max: 0 };
}
