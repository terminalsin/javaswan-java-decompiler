import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runBenchmark, type BenchmarkOptions } from './BenchmarkRunner';
import { resolveInputs } from '../resolver/resolveInputs';
import { createAllMetrics } from '../metrics/index';
import { CompositeScorer } from '../scoring/CompositeScorer';
import { computeStatistics } from '../scoring/StatisticalSummary';
import { JavaFormatterBridge } from '../formatter/JavaFormatterBridge';
import { formatAsTable } from '../output/TableFormatter';
import { formatAsJson } from '../output/JsonReporter';
import { formatAsMarkdown } from '../output/MarkdownReporter';
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import type {
  DirectoryEvaluation,
  DirectoryReport,
  FileEvaluation,
  SourceFile,
} from '../types';
import type { SimilarityMetric } from '../metrics/SimilarityMetric';
import type { ResolvedFile } from '../resolver/resolveInputs';

interface BenchmarkCliOptions {
  source: string;
  jar: string;
  output?: string;
  decompilersDir?: string;
  javaFormatter?: string;
  skipFormat: boolean;
  ai: boolean;
  baseUrl: string;
  provider: string;
  model: string;
  timeout: string;
  format: 'text' | 'json' | 'markdown';
  reportOutput?: string;
  verbose: boolean;
  perFile: boolean;
  java: string;
}

export function createBenchmarkCommand(): Command {
  const cmd = new Command('benchmark');

  cmd
    .description('Decompile a JAR with multiple decompilers and evaluate similarity against original source')
    .requiredOption('-s, --source <dir>', 'Path to original Java source directory')
    .requiredOption('-j, --jar <path>', 'Path to compiled JAR file')
    .option('-o, --output <dir>', 'Output directory for decompiled files (default: benchmark-<jar>-<timestamp>)')
    .option('--decompilers-dir <dir>', 'Directory containing decompiler JARs')
    .option('--java-formatter <path>', 'Path to the Java formatter CLI JAR')
    .option('--skip-format', 'Skip Java formatting/comment stripping', false)
    .option('--no-ai', 'Skip AI-enhanced decompiler')
    .option('--base-url <url>', 'OpenCode server URL for AI decompiler', 'http://localhost:4096')
    .option('--provider <id>', 'AI model provider', 'openrouter-shortcut')
    .option('--model <id>', 'AI model ID', 'minimax/minimax-m2.5:nitro')
    .option('--timeout <ms>', 'AI agent timeout in milliseconds', '600000')
    .option('-f, --format <type>', 'Report format: text, json, markdown', 'text')
    .option('-R, --report-output <path>', 'Write report to file instead of stdout')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--per-file', 'Show per-file breakdowns in report', false)
    .option('--java <path>', 'Path to java binary', 'java')
    .action(async (opts: BenchmarkCliOptions) => {
      await runBenchmarkCommand(opts);
    });

  return cmd;
}

async function runBenchmarkCommand(opts: BenchmarkCliOptions): Promise<void> {
  const log = (msg: string) => console.error(msg);

  log(`Source:          ${resolve(opts.source)}`);
  log(`JAR:             ${resolve(opts.jar)}`);
  log(`Java formatter:  ${opts.javaFormatter ? resolve(opts.javaFormatter) : '(none — skipping format step)'}`);
  log(`AI decompiler:   ${opts.ai === false ? 'disabled' : 'enabled'}`);
  log('');

  // Phase 1: Decompile
  log('=== Phase 1: Decompilation ===');

  const benchmarkOpts: BenchmarkOptions = {
    sourceDir: opts.source,
    jarPath: opts.jar,
    outputDir: opts.output,
    decompilersDir: opts.decompilersDir,
    javaPath: opts.java,
    noAi: opts.ai === false,
    javaFormatterPath: opts.javaFormatter,
    skipFormat: opts.skipFormat,
    aiOptions: {
      baseUrl: opts.baseUrl,
      providerID: opts.provider,
      modelID: opts.model,
      timeout: parseInt(opts.timeout, 10),
    },
    onProgress: log,
  };

  const benchResult = await runBenchmark(benchmarkOpts);

  // Summarize decompilation results
  log('');
  log('Decompilation Summary:');
  for (const r of benchResult.decompilerResults) {
    const status = r.success ? 'OK' : 'FAILED';
    const extra = r.fileCount !== undefined ? ` (${r.fileCount} files)` : '';
    log(`  ${r.name.padEnd(25)} ${status.padEnd(8)} ${r.durationMs}ms${extra}`);
  }

  const successful = benchResult.decompilerResults.filter((r) => r.success);
  if (successful.length === 0) {
    console.error('\nError: All decompilers failed. Cannot run similarity evaluation.');
    process.exit(1);
  }

  // Phase 2: Similarity evaluation
  log('');
  log('=== Phase 2: Similarity Evaluation ===');

  const deobPaths = successful.map((r) => r.outputDir);
  const labels = successful.map((r) => r.name);

  // If formatting was done, use the formatted original copy for comparison
  const formattedOrigDir = join(benchResult.outputDir, '_original-formatted');
  const useFormattedOrig = !opts.skipFormat && opts.javaFormatter && existsSync(formattedOrigDir);
  const originalForEval = useFormattedOrig ? formattedOrigDir : opts.source;

  const resolved = resolveInputs(originalForEval, deobPaths, labels);

  // No inline formatting needed — files are already formatted on disk
  const formatter: JavaFormatterBridge | null = null;

  const allMetrics = createAllMetrics();
  const scorer = new CompositeScorer();

  if (resolved.mode === 'file') {
    console.error('Error: Source must be a directory for benchmark mode');
    process.exit(1);
  }

  const dirEvaluations: DirectoryEvaluation[] = [];

  for (const dir of resolved.directories!) {
    if (opts.verbose) {
      log(`Evaluating: ${dir.label} (${dir.matchedPairs.length} matched files)`);
    }

    const fileEvals: FileEvaluation[] = [];
    for (const pair of dir.matchedPairs) {
      const orig = await normalizeFile(pair.originalFile, formatter);
      const deob = await normalizeFile(pair.deobfuscatedFile, formatter);
      fileEvals.push(evaluateFilePair(orig, deob, allMetrics, scorer, opts.verbose));
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

  const allFileEvals = dirEvaluations.flatMap((d) => d.fileEvaluations);
  const statistics = computeStatistics(allFileEvals);

  const report: DirectoryReport = {
    timestamp: new Date().toISOString(),
    originalDir: resolve(opts.source),
    directoryEvaluations: dirEvaluations,
    statistics,
  };

  // Import formatters from cli (we duplicate the needed helpers here to avoid circular deps)
  const output = formatBenchmarkReport(report, opts.format, opts.perFile, benchResult.decompilerResults);

  if (opts.reportOutput) {
    writeFileSync(resolve(opts.reportOutput), output, 'utf-8');
    log(`\nReport written to ${opts.reportOutput}`);
  } else {
    console.log(output);
  }
}

// ── Helpers (duplicated from cli.ts to avoid circular imports) ──────────

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
          console.error(`Warning: metric "${metric.name}" failed: ${err}`);
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

// ── Benchmark-specific report formatting ────────────────────────────────

import type { DecompilerResult } from './BenchmarkRunner';

function formatBenchmarkReport(
  report: DirectoryReport,
  format: string,
  perFile: boolean,
  decompilerResults: DecompilerResult[],
): string {
  switch (format) {
    case 'json':
      return formatBenchmarkJson(report, perFile, decompilerResults);
    case 'markdown':
      return formatBenchmarkMarkdown(report, perFile, decompilerResults);
    default:
      return formatBenchmarkText(report, perFile, decompilerResults);
  }
}

function formatBenchmarkText(
  report: DirectoryReport,
  perFile: boolean,
  decompilerResults: DecompilerResult[],
): string {
  const lines: string[] = [];
  const sep = '='.repeat(90);

  lines.push(sep);
  lines.push('  Decompiler Benchmark Report');
  lines.push(`  Generated: ${report.timestamp}`);
  lines.push(`  Original:  ${report.originalDir}`);
  lines.push(sep);
  lines.push('');

  // Decompilation summary
  lines.push('DECOMPILATION RESULTS');
  lines.push(renderTable(
    ['Decompiler', 'Status', 'Duration', 'Files'],
    decompilerResults.map((r) => [
      r.name,
      r.success ? 'OK' : 'FAILED',
      `${r.durationMs}ms`,
      r.fileCount !== undefined ? String(r.fileCount) : '-',
    ]),
  ));
  lines.push('');

  // Similarity ranking
  lines.push('SIMILARITY RANKING');
  lines.push(renderTable(
    ['Rank', 'Decompiler', 'Composite', 'Match Rate', 'Files'],
    report.directoryEvaluations.map((d, i) => [
      String(i + 1),
      d.label,
      d.aggregateComposite.toFixed(4),
      `${(d.matchRate * 100).toFixed(1)}%`,
      `${d.fileEvaluations.length}/${d.fileEvaluations.length + d.unmatchedOriginals.length}`,
    ]),
  ));
  lines.push('');

  // Per-metric breakdown
  if (report.directoryEvaluations.length > 0) {
    lines.push('METRIC BREAKDOWN');
    const metricNames = Object.keys(report.directoryEvaluations[0].aggregateMetrics);
    const labels = report.directoryEvaluations.map((d) => d.label);

    lines.push(renderTable(
      ['Metric', ...labels],
      [
        ...metricNames.map((name) => [
          name,
          ...report.directoryEvaluations.map((d) =>
            d.aggregateMetrics[name] !== undefined ? d.aggregateMetrics[name].toFixed(4) : 'N/A',
          ),
        ]),
        ['COMPOSITE', ...report.directoryEvaluations.map((d) => d.aggregateComposite.toFixed(4))],
      ],
    ));
    lines.push('');
  }

  // Stats
  lines.push('STATISTICAL SUMMARY');
  const statRows: string[][] = [];
  for (const [name, stats] of Object.entries(report.statistics.perMetric)) {
    statRows.push([name, stats.mean.toFixed(4), stats.median.toFixed(4), stats.stddev.toFixed(4), stats.min.toFixed(4), stats.max.toFixed(4)]);
  }
  const cs = report.statistics.composite;
  statRows.push(['COMPOSITE', cs.mean.toFixed(4), cs.median.toFixed(4), cs.stddev.toFixed(4), cs.min.toFixed(4), cs.max.toFixed(4)]);
  lines.push(renderTable(['Metric', 'Mean', 'Median', 'Std Dev', 'Min', 'Max'], statRows));
  lines.push('');

  // Per-file detail
  if (perFile) {
    for (const dir of report.directoryEvaluations) {
      lines.push(sep);
      lines.push(`  PER-FILE: ${dir.label}`);
      lines.push(sep);
      const metricNames = dir.fileEvaluations.length > 0
        ? dir.fileEvaluations[0].metrics.map((m) => m.metricName)
        : [];
      lines.push(renderTable(
        ['File', 'Composite', ...metricNames],
        dir.fileEvaluations.map((e) => [
          basename(e.deobfuscatedFile.path),
          e.compositeScore.toFixed(4),
          ...metricNames.map((name) => {
            const m = e.metrics.find((m) => m.metricName === name);
            return m ? m.score.toFixed(4) : 'N/A';
          }),
        ]),
      ));
      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatBenchmarkJson(
  report: DirectoryReport,
  perFile: boolean,
  decompilerResults: DecompilerResult[],
): string {
  return JSON.stringify({
    timestamp: report.timestamp,
    originalDir: report.originalDir,
    decompilation: decompilerResults.map((r) => ({
      name: r.name,
      success: r.success,
      durationMs: r.durationMs,
      fileCount: r.fileCount,
      error: r.error,
    })),
    similarity: report.directoryEvaluations.map((d) => ({
      label: d.label,
      aggregateComposite: d.aggregateComposite,
      matchRate: d.matchRate,
      matchedFiles: d.fileEvaluations.length,
      aggregateMetrics: d.aggregateMetrics,
      ...(perFile ? {
        fileEvaluations: d.fileEvaluations.map((e) => ({
          original: e.originalFile.path,
          deobfuscated: e.deobfuscatedFile.path,
          compositeScore: e.compositeScore,
          metrics: Object.fromEntries(e.metrics.map((m) => [m.metricName, m.score])),
        })),
      } : {}),
    })),
    statistics: report.statistics,
  }, null, 2);
}

function formatBenchmarkMarkdown(
  report: DirectoryReport,
  perFile: boolean,
  decompilerResults: DecompilerResult[],
): string {
  const lines: string[] = [];

  lines.push('# Decompiler Benchmark Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Original:** \`${report.originalDir}\``);
  lines.push('');

  // Decompilation
  lines.push('## Decompilation Results');
  lines.push('');
  lines.push('| Decompiler | Status | Duration | Files |');
  lines.push('|------------|--------|----------|-------|');
  for (const r of decompilerResults) {
    lines.push(`| ${r.name} | ${r.success ? 'OK' : 'FAILED'} | ${r.durationMs}ms | ${r.fileCount ?? '-'} |`);
  }
  lines.push('');

  // Ranking
  lines.push('## Similarity Ranking');
  lines.push('');
  lines.push('| Rank | Decompiler | Composite | Match Rate | Files |');
  lines.push('|------|------------|-----------|------------|-------|');
  for (let i = 0; i < report.directoryEvaluations.length; i++) {
    const d = report.directoryEvaluations[i];
    const total = d.fileEvaluations.length + d.unmatchedOriginals.length;
    lines.push(`| ${i + 1} | ${d.label} | ${d.aggregateComposite.toFixed(4)} | ${(d.matchRate * 100).toFixed(1)}% | ${d.fileEvaluations.length}/${total} |`);
  }
  lines.push('');

  // Metric breakdown
  if (report.directoryEvaluations.length > 0) {
    lines.push('## Metric Breakdown');
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
    lines.push(`| **COMPOSITE** | ${report.directoryEvaluations.map((d) => `**${d.aggregateComposite.toFixed(4)}**`).join(' | ')} |`);
    lines.push('');
  }

  // Stats
  lines.push('## Statistical Summary');
  lines.push('');
  lines.push('| Metric | Mean | Median | Std Dev | Min | Max |');
  lines.push('|--------|------|--------|---------|-----|-----|');
  for (const [name, stats] of Object.entries(report.statistics.perMetric)) {
    lines.push(`| ${name} | ${stats.mean.toFixed(4)} | ${stats.median.toFixed(4)} | ${stats.stddev.toFixed(4)} | ${stats.min.toFixed(4)} | ${stats.max.toFixed(4)} |`);
  }
  const cs = report.statistics.composite;
  lines.push(`| **COMPOSITE** | **${cs.mean.toFixed(4)}** | **${cs.median.toFixed(4)}** | **${cs.stddev.toFixed(4)}** | **${cs.min.toFixed(4)}** | **${cs.max.toFixed(4)}** |`);
  lines.push('');

  return lines.join('\n');
}

// ── Shared table renderer ───────────────────────────────────────────────

function renderTable(headers: string[], rows: string[][]): string {
  const allRows = [headers, ...rows];
  const colWidths = headers.map((_, i) =>
    Math.max(...allRows.map((row) => (row[i] ?? '').length)) + 2,
  );

  const border = (left: string, mid: string, right: string, fill: string) =>
    left + colWidths.map((w) => fill.repeat(w)).join(mid) + right;

  const formatRow = (row: string[]) =>
    '|' + row.map((cell, i) => ` ${(cell ?? '').padEnd(colWidths[i] - 2)} `).join('|') + '|';

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
