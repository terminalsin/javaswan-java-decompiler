import type { EvaluationReport } from '../types.js';

export function formatAsMarkdown(report: EvaluationReport): string {
  const lines: string[] = [];

  lines.push('# Java Source Similarity Evaluation Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Original:** \`${report.originalFile.path}\``);
  lines.push('');

  // Ranking
  lines.push('## Ranking');
  lines.push('');
  lines.push('| Rank | File | Composite |');
  lines.push('|------|------|-----------|');
  for (let i = 0; i < report.evaluations.length; i++) {
    const e = report.evaluations[i];
    lines.push(`| ${i + 1} | ${e.deobfuscatedFile.label} | ${e.compositeScore.toFixed(4)} |`);
  }
  lines.push('');

  // Per-file breakdown
  if (report.evaluations.length > 0) {
    lines.push('## Per-File Metric Breakdown');
    lines.push('');
    const labels = report.evaluations.map((e) => e.deobfuscatedFile.label);
    const metricNames = report.evaluations[0].metrics.map((m) => m.metricName);

    lines.push(`| Metric | ${labels.join(' | ')} |`);
    lines.push(`|--------|${labels.map(() => '--------').join('|')}|`);

    for (const name of metricNames) {
      const values = report.evaluations.map((e) => {
        const m = e.metrics.find((m) => m.metricName === name);
        return m ? m.score.toFixed(4) : 'N/A';
      });
      lines.push(`| ${name} | ${values.join(' | ')} |`);
    }

    const composites = report.evaluations.map((e) => e.compositeScore.toFixed(4));
    lines.push(`| **COMPOSITE** | ${composites.map((c) => `**${c}**`).join(' | ')} |`);
    lines.push('');
  }

  // Statistical summary
  lines.push('## Statistical Summary');
  lines.push('');
  lines.push('| Metric | Mean | Median | Std Dev | Min | Max |');
  lines.push('|--------|------|--------|---------|-----|-----|');

  for (const [name, stats] of Object.entries(report.statistics.perMetric)) {
    lines.push(
      `| ${name} | ${stats.mean.toFixed(4)} | ${stats.median.toFixed(4)} | ` +
      `${stats.stddev.toFixed(4)} | ${stats.min.toFixed(4)} | ${stats.max.toFixed(4)} |`,
    );
  }

  const cs = report.statistics.composite;
  lines.push(
    `| **COMPOSITE** | **${cs.mean.toFixed(4)}** | **${cs.median.toFixed(4)}** | ` +
    `**${cs.stddev.toFixed(4)}** | **${cs.min.toFixed(4)}** | **${cs.max.toFixed(4)}** |`,
  );
  lines.push('');

  return lines.join('\n');
}
