import type { EvaluationReport } from '../types.js';

export function formatAsTable(report: EvaluationReport): string {
  const lines: string[] = [];
  const sep = '='.repeat(80);

  lines.push(sep);
  lines.push('  Java Source Similarity Evaluation Report');
  lines.push(`  Generated: ${report.timestamp}`);
  lines.push(`  Original:  ${report.originalFile.path}`);
  lines.push(sep);
  lines.push('');

  // Ranking table
  lines.push('RANKING');
  const rankHeaders = ['Rank', 'File', 'Composite'];
  const rankRows = report.evaluations.map((e, i) => [
    String(i + 1),
    e.deobfuscatedFile.label,
    e.compositeScore.toFixed(4),
  ]);
  lines.push(renderTable(rankHeaders, rankRows));
  lines.push('');

  // Per-file metric breakdown
  if (report.evaluations.length > 0) {
    lines.push('PER-FILE METRIC BREAKDOWN');
    const metricNames = report.evaluations[0].metrics.map((m) => m.metricName);
    const labels = report.evaluations.map((e) => e.deobfuscatedFile.label);

    const breakdownHeaders = ['Metric', ...labels];
    const breakdownRows = metricNames.map((name) => [
      name,
      ...report.evaluations.map((e) => {
        const m = e.metrics.find((m) => m.metricName === name);
        return m ? m.score.toFixed(4) : 'N/A';
      }),
    ]);
    breakdownRows.push([
      'COMPOSITE',
      ...report.evaluations.map((e) => e.compositeScore.toFixed(4)),
    ]);
    lines.push(renderTable(breakdownHeaders, breakdownRows));
    lines.push('');
  }

  // Statistical summary
  lines.push('STATISTICAL SUMMARY');
  const statHeaders = ['Metric', 'Mean', 'Median', 'Std Dev', 'Min', 'Max'];
  const statRows: string[][] = [];
  for (const [name, stats] of Object.entries(report.statistics.perMetric)) {
    statRows.push([
      name,
      stats.mean.toFixed(4),
      stats.median.toFixed(4),
      stats.stddev.toFixed(4),
      stats.min.toFixed(4),
      stats.max.toFixed(4),
    ]);
  }
  statRows.push([
    'COMPOSITE',
    report.statistics.composite.mean.toFixed(4),
    report.statistics.composite.median.toFixed(4),
    report.statistics.composite.stddev.toFixed(4),
    report.statistics.composite.min.toFixed(4),
    report.statistics.composite.max.toFixed(4),
  ]);
  lines.push(renderTable(statHeaders, statRows));
  lines.push('');

  // Human-readable analysis
  lines.push('ANALYSIS');
  lines.push(generateAnalysis(report));
  lines.push('');

  return lines.join('\n');
}

function renderTable(headers: string[], rows: string[][]): string {
  const allRows = [headers, ...rows];
  const colWidths = headers.map((_, i) =>
    Math.max(...allRows.map((row) => (row[i] ?? '').length)) + 2,
  );

  const border = (left: string, mid: string, right: string, fill: string) =>
    left + colWidths.map((w) => fill.repeat(w)).join(mid) + right;

  const formatRow = (row: string[]) =>
    '|' +
    row.map((cell, i) => ` ${cell.padEnd(colWidths[i] - 2)} `).join('|') +
    '|';

  const lines: string[] = [];
  lines.push(border('+', '+', '+', '-'));
  lines.push(formatRow(headers));
  lines.push(border('+', '+', '+', '-'));
  for (const row of rows) {
    lines.push(formatRow(row));
  }
  lines.push(border('+', '+', '+', '-'));

  return lines.join('\n');
}

function generateAnalysis(report: EvaluationReport): string {
  if (report.evaluations.length === 0) {
    return 'No deobfuscated files were provided for evaluation.';
  }

  const best = report.evaluations[0];
  const worst = report.evaluations[report.evaluations.length - 1];
  const stats = report.statistics.composite;

  const parts: string[] = [];

  parts.push(
    `The highest-scoring deobfuscated output is "${best.deobfuscatedFile.label}" with a ` +
    `composite similarity of ${best.compositeScore.toFixed(4)} to the original source.`,
  );

  if (best.compositeScore >= 0.85) {
    parts.push('This suggests excellent structural and lexical recovery.');
  } else if (best.compositeScore >= 0.7) {
    parts.push('This indicates good recovery with moderate differences in structure or naming.');
  } else if (best.compositeScore >= 0.5) {
    parts.push('This indicates partial recovery with significant structural divergence.');
  } else {
    parts.push('This suggests substantial differences from the original source.');
  }

  if (report.evaluations.length > 1) {
    const spread = stats.max - stats.min;
    parts.push('');
    parts.push(
      `Spread: The range of composite scores is ${spread.toFixed(4)} ` +
      `(${stats.min.toFixed(4)} to ${stats.max.toFixed(4)}), ` +
      `with a standard deviation of ${stats.stddev.toFixed(4)}.`,
    );

    if (spread < 0.05) {
      parts.push('All deobfuscators produced very similar results.');
    } else if (spread < 0.15) {
      parts.push('There is moderate variance across deobfuscators.');
    } else {
      parts.push('There is significant variance across deobfuscators, suggesting meaningful quality differences.');
    }

    // Find which metric category shows most variation
    let maxMetricSpread = 0;
    let maxMetricName = '';
    for (const [name, metricStats] of Object.entries(report.statistics.perMetric)) {
      const metricSpread = metricStats.max - metricStats.min;
      if (metricSpread > maxMetricSpread) {
        maxMetricSpread = metricSpread;
        maxMetricName = name;
      }
    }
    if (maxMetricName) {
      parts.push(
        `The greatest variance across deobfuscators is in the "${maxMetricName}" metric ` +
        `(spread: ${maxMetricSpread.toFixed(4)}).`,
      );
    }
  }

  return parts.join('\n');
}
