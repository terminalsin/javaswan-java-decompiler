import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createAllMetrics } from './metrics/index.js';
import { CompositeScorer } from './scoring/CompositeScorer.js';
import { computeStatistics } from './scoring/StatisticalSummary.js';
import { JavaFormatterBridge } from './formatter/JavaFormatterBridge.js';
import { formatAsTable } from './output/TableFormatter.js';
import { formatAsJson } from './output/JsonReporter.js';
import { formatAsMarkdown } from './output/MarkdownReporter.js';
import { resolveInputs } from './resolver/resolveInputs.js';
import type {
  DirectoryEvaluation,
  DirectoryReport,
  EvaluationReport,
  FileEvaluation,
  SourceFile,
} from './types.js';
import type { SimilarityMetric } from './metrics/SimilarityMetric.js';
import type { ResolvedFile } from './resolver/resolveInputs.js';

interface CliOptions {
  original: string;
  deobfuscated: string[];
  labels?: string[];
  javaFormatter?: string;
  skipFormat: boolean;
  format: 'text' | 'json' | 'markdown';
  output?: string;
  verbose: boolean;
  perFile: boolean;
  weights?: string;
  disableMetrics?: string[];
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('similarity-eval')
    .description('Research-grade Java source code similarity evaluation for deobfuscation quality assessment')
    .option('-o, --original <path>', 'Path to original Java source file or directory')
    .option('-d, --deobfuscated <paths...>', 'Paths to deobfuscated Java source files or directories')
    .option('-l, --labels <names...>', 'Labels for deobfuscated inputs (defaults to filenames/dirnames)')
    .option('--java-formatter <path>', 'Path to the Java formatter CLI JAR')
    .option('--skip-format', 'Skip Java formatting/comment stripping', false)
    .option('-f, --format <type>', 'Output format: text, json, markdown', 'text')
    .option('-O, --output <path>', 'Write output to file instead of stdout')
    .option('-v, --verbose', 'Include per-metric details in output', false)
    .option('--per-file', 'Show per-file breakdowns in directory mode', false)
    .option('--weights <json>', 'JSON string of metric weight overrides')
    .option('--disable-metrics <names...>', 'Disable specific metrics by name')
    .action(async (opts: CliOptions) => {
      if (!opts.original) {
        console.error('Error: required option -o, --original <path> not specified');
        process.exit(1);
      }
      if (!opts.deobfuscated || opts.deobfuscated.length === 0) {
        console.error('Error: required option -d, --deobfuscated <paths...> not specified');
        process.exit(1);
      }
      await run(opts);
    });

  return program;
}

async function normalizeFile(
  file: ResolvedFile,
  formatter: JavaFormatterBridge | null,
): Promise<SourceFile> {
  const normalized = formatter
    ? await formatter.formatWithStdin(file.content)
    : file.content;
  return {
    path: file.absolutePath,
    label: basename(file.relativePath, '.java'),
    rawContent: file.content,
    normalizedContent: normalized,
  };
}

function evaluateFilePair(
  original: SourceFile,
  deobfuscated: SourceFile,
  metrics: SimilarityMetric[],
  scorer: CompositeScorer,
  verbose: boolean,
): FileEvaluation {
  const results = metrics
    .map((metric) => {
      try {
        return metric.compute(original, deobfuscated);
      } catch (err) {
        if (verbose) {
          console.error(`Warning: metric "${metric.name}" failed for "${deobfuscated.label}": ${err}`);
        }
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    deobfuscatedFile: deobfuscated,
    originalFile: original,
    metrics: results,
    compositeScore: scorer.score(results),
  };
}

function aggregateMetrics(evaluations: FileEvaluation[]): Record<string, number> {
  if (evaluations.length === 0) return {};

  const sums: Record<string, { total: number; count: number }> = {};
  for (const evaluation of evaluations) {
    for (const m of evaluation.metrics) {
      if (!sums[m.metricName]) sums[m.metricName] = { total: 0, count: 0 };
      sums[m.metricName].total += m.score;
      sums[m.metricName].count++;
    }
  }

  const result: Record<string, number> = {};
  for (const [name, { total, count }] of Object.entries(sums)) {
    result[name] = total / count;
  }
  return result;
}

async function run(opts: CliOptions): Promise<void> {
  const resolved = resolveInputs(opts.original, opts.deobfuscated, opts.labels);

  let formatter: JavaFormatterBridge | null = null;
  if (!opts.skipFormat && opts.javaFormatter) {
    formatter = new JavaFormatterBridge(resolve(opts.javaFormatter));
  }

  const allMetrics = createAllMetrics();
  const disabledSet = new Set(opts.disableMetrics ?? []);
  const enabledMetrics = allMetrics.filter((m) => !disabledSet.has(m.name));

  let weightOverrides: Record<string, number> | undefined;
  if (opts.weights) {
    try {
      weightOverrides = JSON.parse(opts.weights);
    } catch {
      console.error('Invalid --weights JSON');
      process.exit(1);
    }
  }
  const scorer = new CompositeScorer(weightOverrides);

  let output: string;

  if (resolved.mode === 'file') {
    // Legacy single-file mode
    const original = await normalizeFile(resolved.originalFile!, formatter);
    const deobfuscated: SourceFile[] = [];
    for (const f of resolved.deobfuscatedFiles!) {
      deobfuscated.push(await normalizeFile(f, formatter));
    }

    // Apply labels
    if (opts.labels) {
      for (let i = 0; i < deobfuscated.length; i++) {
        if (opts.labels[i]) deobfuscated[i].label = opts.labels[i];
      }
    }

    const evaluations: FileEvaluation[] = deobfuscated.map((deob) =>
      evaluateFilePair(original, deob, enabledMetrics, scorer, opts.verbose),
    );

    evaluations.sort((a, b) => b.compositeScore - a.compositeScore);

    const report: EvaluationReport = {
      timestamp: new Date().toISOString(),
      originalFile: original,
      evaluations,
      statistics: computeStatistics(evaluations),
    };

    output = formatOutput(report, opts.format);
  } else {
    // Directory mode
    const dirEvaluations: DirectoryEvaluation[] = [];

    for (const dir of resolved.directories!) {
      if (opts.verbose) {
        console.error(`Processing directory: ${dir.label} (${dir.matchedPairs.length} matched files)`);
      }

      const fileEvals: FileEvaluation[] = [];
      for (const pair of dir.matchedPairs) {
        const orig = await normalizeFile(pair.originalFile, formatter);
        const deob = await normalizeFile(pair.deobfuscatedFile, formatter);
        fileEvals.push(evaluateFilePair(orig, deob, enabledMetrics, scorer, opts.verbose));
      }

      fileEvals.sort((a, b) => b.compositeScore - a.compositeScore);

      const aggComposite =
        fileEvals.length === 0
          ? 0
          : fileEvals.reduce((sum, e) => sum + e.compositeScore, 0) / fileEvals.length;

      const totalOriginals = dir.matchedPairs.length + dir.unmatchedOriginals.length;

      dirEvaluations.push({
        label: dir.label,
        dirPath: dir.dirPath,
        fileEvaluations: fileEvals,
        unmatchedOriginals: dir.unmatchedOriginals,
        unmatchedDeobfuscated: dir.unmatchedDeobfuscated,
        aggregateComposite: aggComposite,
        aggregateMetrics: aggregateMetrics(fileEvals),
        matchRate: totalOriginals === 0 ? 0 : dir.matchedPairs.length / totalOriginals,
      });
    }

    dirEvaluations.sort((a, b) => b.aggregateComposite - a.aggregateComposite);

    // Compute stats across directory-level composites
    const allFileEvals = dirEvaluations.flatMap((d) => d.fileEvaluations);
    const statistics = computeStatistics(allFileEvals);

    const report: DirectoryReport = {
      timestamp: new Date().toISOString(),
      originalDir: resolved.originalDir!,
      directoryEvaluations: dirEvaluations,
      statistics,
    };

    output = formatDirectoryOutput(report, opts.format, opts.perFile);
  }

  if (opts.output) {
    writeFileSync(resolve(opts.output), output, 'utf-8');
    console.log(`Report written to ${opts.output}`);
  } else {
    console.log(output);
  }
}

function formatOutput(report: EvaluationReport, format: string): string {
  switch (format) {
    case 'json':
      return formatAsJson(report);
    case 'markdown':
      return formatAsMarkdown(report);
    default:
      return formatAsTable(report);
  }
}

function formatDirectoryOutput(
  report: DirectoryReport,
  format: string,
  perFile: boolean,
): string {
  switch (format) {
    case 'json':
      return formatDirectoryJson(report, perFile);
    case 'markdown':
      return formatDirectoryMarkdown(report, perFile);
    default:
      return formatDirectoryTable(report, perFile);
  }
}

// ── Directory Output: Text ──────────────────────────────────────────────

function formatDirectoryTable(report: DirectoryReport, perFile: boolean): string {
  const lines: string[] = [];
  const sep = '='.repeat(90);

  lines.push(sep);
  lines.push('  Java Source Similarity Evaluation Report (Directory Mode)');
  lines.push(`  Generated: ${report.timestamp}`);
  lines.push(`  Original:  ${report.originalDir}`);
  lines.push(sep);
  lines.push('');

  // Directory ranking
  lines.push('DIRECTORY RANKING');
  const rankHeaders = ['Rank', 'Directory', 'Composite', 'Match Rate', 'Files'];
  const rankRows = report.directoryEvaluations.map((d, i) => [
    String(i + 1),
    d.label,
    d.aggregateComposite.toFixed(4),
    `${(d.matchRate * 100).toFixed(1)}%`,
    `${d.fileEvaluations.length}/${d.fileEvaluations.length + d.unmatchedOriginals.length}`,
  ]);
  lines.push(renderTable(rankHeaders, rankRows));
  lines.push('');

  // Per-metric aggregates
  if (report.directoryEvaluations.length > 0) {
    lines.push('AGGREGATE METRIC BREAKDOWN');
    const metricNames = Object.keys(report.directoryEvaluations[0].aggregateMetrics);
    const labels = report.directoryEvaluations.map((d) => d.label);

    const breakdownHeaders = ['Metric', ...labels];
    const breakdownRows = metricNames.map((name) => [
      name,
      ...report.directoryEvaluations.map((d) =>
        d.aggregateMetrics[name] !== undefined ? d.aggregateMetrics[name].toFixed(4) : 'N/A',
      ),
    ]);
    breakdownRows.push([
      'COMPOSITE',
      ...report.directoryEvaluations.map((d) => d.aggregateComposite.toFixed(4)),
    ]);
    lines.push(renderTable(breakdownHeaders, breakdownRows));
    lines.push('');
  }

  // Unmatched files
  for (const dir of report.directoryEvaluations) {
    if (dir.unmatchedOriginals.length > 0 || dir.unmatchedDeobfuscated.length > 0) {
      lines.push(`UNMATCHED FILES: ${dir.label}`);
      if (dir.unmatchedOriginals.length > 0) {
        lines.push(`  Missing from deobfuscated (${dir.unmatchedOriginals.length}):`);
        for (const f of dir.unmatchedOriginals.slice(0, 10)) {
          lines.push(`    - ${f}`);
        }
        if (dir.unmatchedOriginals.length > 10) {
          lines.push(`    ... and ${dir.unmatchedOriginals.length - 10} more`);
        }
      }
      if (dir.unmatchedDeobfuscated.length > 0) {
        lines.push(`  Extra in deobfuscated (${dir.unmatchedDeobfuscated.length}):`);
        for (const f of dir.unmatchedDeobfuscated.slice(0, 10)) {
          lines.push(`    - ${f}`);
        }
        if (dir.unmatchedDeobfuscated.length > 10) {
          lines.push(`    ... and ${dir.unmatchedDeobfuscated.length - 10} more`);
        }
      }
      lines.push('');
    }
  }

  // Statistical summary
  lines.push('STATISTICAL SUMMARY (across all matched files)');
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

  // Analysis
  lines.push('ANALYSIS');
  lines.push(generateDirectoryAnalysis(report));
  lines.push('');

  // Per-file detail
  if (perFile) {
    for (const dir of report.directoryEvaluations) {
      lines.push(sep);
      lines.push(`  PER-FILE DETAIL: ${dir.label}`);
      lines.push(sep);
      lines.push('');

      const fileHeaders = ['File', 'Composite', ...getMetricNames(dir)];
      const fileRows = dir.fileEvaluations.map((e) => [
        basename(e.deobfuscatedFile.path),
        e.compositeScore.toFixed(4),
        ...getMetricNames(dir).map((name) => {
          const m = e.metrics.find((m) => m.metricName === name);
          return m ? m.score.toFixed(4) : 'N/A';
        }),
      ]);
      lines.push(renderTable(fileHeaders, fileRows));
      lines.push('');
    }
  }

  return lines.join('\n');
}

function getMetricNames(dir: DirectoryEvaluation): string[] {
  if (dir.fileEvaluations.length === 0) return [];
  return dir.fileEvaluations[0].metrics.map((m) => m.metricName);
}

function generateDirectoryAnalysis(report: DirectoryReport): string {
  if (report.directoryEvaluations.length === 0) {
    return 'No deobfuscated directories were provided for evaluation.';
  }

  const parts: string[] = [];
  const best = report.directoryEvaluations[0];

  parts.push(
    `The highest-scoring deobfuscated output is "${best.label}" with an aggregate ` +
    `composite similarity of ${best.aggregateComposite.toFixed(4)} across ` +
    `${best.fileEvaluations.length} matched files (${(best.matchRate * 100).toFixed(1)}% match rate).`,
  );

  if (best.aggregateComposite >= 0.85) {
    parts.push('This suggests excellent overall deobfuscation quality.');
  } else if (best.aggregateComposite >= 0.7) {
    parts.push('This indicates good recovery with moderate divergence in some files.');
  } else if (best.aggregateComposite >= 0.5) {
    parts.push('This indicates partial recovery with significant structural differences.');
  } else {
    parts.push('This suggests substantial differences from the original source.');
  }

  if (report.directoryEvaluations.length > 1) {
    const scores = report.directoryEvaluations.map((d) => d.aggregateComposite);
    const spread = Math.max(...scores) - Math.min(...scores);
    parts.push('');
    parts.push(
      `Spread across ${report.directoryEvaluations.length} directories: ` +
      `${spread.toFixed(4)} (${Math.min(...scores).toFixed(4)} to ${Math.max(...scores).toFixed(4)}).`,
    );
  }

  // Report match rate issues
  const lowMatch = report.directoryEvaluations.filter((d) => d.matchRate < 1);
  if (lowMatch.length > 0) {
    parts.push('');
    for (const d of lowMatch) {
      parts.push(
        `"${d.label}" has ${d.unmatchedOriginals.length} unmatched original file(s) ` +
        `(${(d.matchRate * 100).toFixed(1)}% match rate).`,
      );
    }
  }

  return parts.join('\n');
}

// ── Directory Output: JSON ──────────────────────────────────────────────

function formatDirectoryJson(report: DirectoryReport, perFile: boolean): string {
  const output = {
    timestamp: report.timestamp,
    originalDir: report.originalDir,
    directories: report.directoryEvaluations.map((d) => ({
      label: d.label,
      dirPath: d.dirPath,
      aggregateComposite: d.aggregateComposite,
      matchRate: d.matchRate,
      matchedFiles: d.fileEvaluations.length,
      unmatchedOriginals: d.unmatchedOriginals,
      unmatchedDeobfuscated: d.unmatchedDeobfuscated,
      aggregateMetrics: d.aggregateMetrics,
      ...(perFile
        ? {
            fileEvaluations: d.fileEvaluations.map((e) => ({
              original: e.originalFile.path,
              deobfuscated: e.deobfuscatedFile.path,
              compositeScore: e.compositeScore,
              metrics: Object.fromEntries(
                e.metrics.map((m) => [m.metricName, { score: m.score, ...(m.details ?? {}) }]),
              ),
            })),
          }
        : {}),
    })),
    statistics: report.statistics,
  };

  return JSON.stringify(output, null, 2);
}

// ── Directory Output: Markdown ──────────────────────────────────────────

function formatDirectoryMarkdown(report: DirectoryReport, perFile: boolean): string {
  const lines: string[] = [];

  lines.push('# Java Source Similarity Evaluation Report (Directory Mode)');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Original:** \`${report.originalDir}\``);
  lines.push('');

  // Ranking
  lines.push('## Directory Ranking');
  lines.push('');
  lines.push('| Rank | Directory | Composite | Match Rate | Files |');
  lines.push('|------|-----------|-----------|------------|-------|');
  for (let i = 0; i < report.directoryEvaluations.length; i++) {
    const d = report.directoryEvaluations[i];
    const total = d.fileEvaluations.length + d.unmatchedOriginals.length;
    lines.push(
      `| ${i + 1} | ${d.label} | ${d.aggregateComposite.toFixed(4)} | ` +
      `${(d.matchRate * 100).toFixed(1)}% | ${d.fileEvaluations.length}/${total} |`,
    );
  }
  lines.push('');

  // Aggregate breakdown
  if (report.directoryEvaluations.length > 0) {
    lines.push('## Aggregate Metric Breakdown');
    lines.push('');
    const labels = report.directoryEvaluations.map((d) => d.label);
    const metricNames = Object.keys(report.directoryEvaluations[0].aggregateMetrics);

    lines.push(`| Metric | ${labels.join(' | ')} |`);
    lines.push(`|--------|${labels.map(() => '--------').join('|')}|`);

    for (const name of metricNames) {
      const values = report.directoryEvaluations.map((d) =>
        d.aggregateMetrics[name] !== undefined ? d.aggregateMetrics[name].toFixed(4) : 'N/A',
      );
      lines.push(`| ${name} | ${values.join(' | ')} |`);
    }
    const composites = report.directoryEvaluations.map((d) => d.aggregateComposite.toFixed(4));
    lines.push(`| **COMPOSITE** | ${composites.map((c) => `**${c}**`).join(' | ')} |`);
    lines.push('');
  }

  // Per-file detail
  if (perFile) {
    for (const dir of report.directoryEvaluations) {
      lines.push(`## Per-File Detail: ${dir.label}`);
      lines.push('');
      const metricNames = getMetricNames(dir);
      lines.push(`| File | Composite | ${metricNames.join(' | ')} |`);
      lines.push(`|------|-----------|${metricNames.map(() => '--------').join('|')}|`);
      for (const e of dir.fileEvaluations) {
        const scores = metricNames.map((name) => {
          const m = e.metrics.find((m) => m.metricName === name);
          return m ? m.score.toFixed(4) : 'N/A';
        });
        lines.push(`| ${basename(e.deobfuscatedFile.path)} | ${e.compositeScore.toFixed(4)} | ${scores.join(' | ')} |`);
      }
      lines.push('');
    }
  }

  // Stats
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

// ── Shared Helpers ──────────────────────────────────────────────────────

function renderTable(headers: string[], rows: string[][]): string {
  const allRows = [headers, ...rows];
  const colWidths = headers.map((_, i) =>
    Math.max(...allRows.map((row) => (row[i] ?? '').length)) + 2,
  );

  const border = (left: string, mid: string, right: string, fill: string) =>
    left + colWidths.map((w) => fill.repeat(w)).join(mid) + right;

  const formatRow = (row: string[]) =>
    '|' +
    row.map((cell, i) => ` ${(cell ?? '').padEnd(colWidths[i] - 2)} `).join('|') +
    '|';

  const tableLines: string[] = [];
  tableLines.push(border('+', '+', '+', '-'));
  tableLines.push(formatRow(headers));
  tableLines.push(border('+', '+', '+', '-'));
  for (const row of rows) {
    tableLines.push(formatRow(row));
  }
  tableLines.push(border('+', '+', '+', '-'));

  return tableLines.join('\n');
}
