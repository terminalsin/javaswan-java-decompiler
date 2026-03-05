import type { EvaluationReport } from '../types.js';

export function formatAsJson(report: EvaluationReport): string {
  const output = {
    timestamp: report.timestamp,
    original: {
      path: report.originalFile.path,
      label: report.originalFile.label,
    },
    evaluations: report.evaluations.map((e) => ({
      file: {
        path: e.deobfuscatedFile.path,
        label: e.deobfuscatedFile.label,
      },
      compositeScore: e.compositeScore,
      metrics: Object.fromEntries(
        e.metrics.map((m) => [
          m.metricName,
          { score: m.score, ...(m.details ?? {}) },
        ]),
      ),
    })),
    statistics: report.statistics,
  };

  return JSON.stringify(output, null, 2);
}
