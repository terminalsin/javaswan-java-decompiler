import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { getAvailableDecompilers, runExternalDecompiler, type DecompilerConfig } from './ExternalDecompiler';
import { decompileWithTs, decompileWithTsAi } from './TsDecompiler';
import { JavaFormatterBridge } from '../formatter/JavaFormatterBridge';

export interface BenchmarkOptions {
  /** Path to the original source directory */
  sourceDir: string;
  /** Path to the compiled JAR file */
  jarPath: string;
  /** Output directory for benchmark results (default: ./benchmark-<timestamp>) */
  outputDir?: string;
  /** Path to decompilers directory (default: auto-detect relative to this package) */
  decompilersDir?: string;
  /** Path to java binary */
  javaPath?: string;
  /** Skip the AI decompiler */
  noAi?: boolean;
  /** Path to java-format-cli JAR for post-decompilation formatting */
  javaFormatterPath?: string;
  /** Skip formatting step */
  skipFormat?: boolean;
  /** AI decompiler options */
  aiOptions?: {
    baseUrl?: string;
    providerID?: string;
    modelID?: string;
    timeout?: number;
  };
  /** Callback for progress updates */
  onProgress?: (message: string) => void;
}

export interface DecompilerResult {
  name: string;
  outputDir: string;
  success: boolean;
  fileCount?: number;
  durationMs: number;
  error?: string;
}

export interface BenchmarkResult {
  outputDir: string;
  sourceDir: string;
  jarPath: string;
  decompilerResults: DecompilerResult[];
}

function defaultDecompilersDir(): string {
  // Try __dirname-relative first (works when bundled), then cwd-relative
  const candidates = [
    resolve(__dirname, '../../decompilers'),
    resolve(process.cwd(), 'decompilers'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return candidates[0]; // Fallback — will show a warning later
}

export async function runBenchmark(opts: BenchmarkOptions): Promise<BenchmarkResult> {
  const sourceDir = resolve(opts.sourceDir);
  const jarPath = resolve(opts.jarPath);
  const javaPath = opts.javaPath ?? 'java';
  const log = opts.onProgress ?? (() => {});

  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }
  if (!existsSync(jarPath)) {
    throw new Error(`JAR file not found: ${jarPath}`);
  }

  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jarName = basename(jarPath, '.jar');
  const outDir = resolve(opts.outputDir ?? `benchmark-${jarName}-${timestamp}`);
  mkdirSync(outDir, { recursive: true });
  log(`Benchmark output directory: ${outDir}`);

  const decompilerResults: DecompilerResult[] = [];

  // 1. Run external Java decompilers (CFR, Procyon, Vineflower)
  const decompilersDir = opts.decompilersDir ?? defaultDecompilersDir();
  const externalDecompilers = getAvailableDecompilers(decompilersDir);

  if (externalDecompilers.length === 0) {
    log(`Warning: No external decompiler JARs found in ${decompilersDir}`);
  }

  for (const config of externalDecompilers) {
    const decompOutDir = join(outDir, config.name);
    log(`Running ${config.name}...`);
    const result = await runExternalDecompiler(config, jarPath, decompOutDir, javaPath);
    decompilerResults.push({
      name: config.name,
      outputDir: decompOutDir,
      success: result.success,
      durationMs: result.durationMs,
      error: result.success ? undefined : result.stderr,
    });
    if (result.success) {
      log(`  ${config.name} completed in ${result.durationMs}ms`);
    } else {
      log(`  ${config.name} FAILED: ${result.stderr.slice(0, 200)}`);
    }
  }

  // 2. Run TypeScript decompiler
  {
    const decompOutDir = join(outDir, 'java-decompiler-ts');
    log('Running java-decompiler-ts...');
    const result = await decompileWithTs(jarPath, decompOutDir);
    decompilerResults.push({
      name: 'java-decompiler-ts',
      outputDir: decompOutDir,
      success: result.success,
      fileCount: result.fileCount,
      durationMs: result.durationMs,
      error: result.error,
    });
    if (result.success) {
      log(`  java-decompiler-ts completed in ${result.durationMs}ms (${result.fileCount} files)`);
    } else {
      log(`  java-decompiler-ts FAILED: ${result.error}`);
    }
  }

  // 3. Run AI-enhanced TypeScript decompiler (optional)
  if (!opts.noAi) {
    const decompOutDir = join(outDir, 'java-decompiler-ts-ai');
    log('Running java-decompiler-ts-ai...');
    const result = await decompileWithTsAi(jarPath, decompOutDir, opts.aiOptions);
    decompilerResults.push({
      name: 'java-decompiler-ts-ai',
      outputDir: decompOutDir,
      success: result.success,
      fileCount: result.fileCount,
      durationMs: result.durationMs,
      error: result.error,
    });
    if (result.success) {
      log(`  java-decompiler-ts-ai completed in ${result.durationMs}ms (${result.fileCount} files)`);
    } else {
      log(`  java-decompiler-ts-ai FAILED: ${result.error}`);
    }
  }

  // 4. Format all decompiled sources with Java formatter
  if (!opts.skipFormat && opts.javaFormatterPath) {
    log('');
    log('=== Formatting decompiled sources ===');
    const formatter = new JavaFormatterBridge(resolve(opts.javaFormatterPath));
    for (const result of decompilerResults) {
      if (!result.success) continue;
      const count = await formatDirectory(result.outputDir, formatter);
      log(`  ${result.name}: formatted ${count} file(s)`);
    }
    // Also format original sources into a copy
    const formattedOrigDir = join(outDir, '_original-formatted');
    mkdirSync(formattedOrigDir, { recursive: true });
    const origCount = await copyAndFormatDirectory(sourceDir, formattedOrigDir, formatter);
    log(`  original: formatted ${origCount} file(s) -> ${formattedOrigDir}`);
  }

  return {
    outputDir: outDir,
    sourceDir,
    jarPath,
    decompilerResults,
  };
}

/**
 * Recursively find all .java files in a directory.
 */
function discoverJavaFiles(dir: string): string[] {
  const results: string[] = [];
  function walk(d: string): void {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.java')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

/**
 * Format all .java files in a directory in-place.
 */
async function formatDirectory(dir: string, formatter: JavaFormatterBridge): Promise<number> {
  const files = discoverJavaFiles(dir);
  let count = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const formatted = await formatter.formatWithStdin(content);
      writeFileSync(file, formatted, 'utf-8');
      count++;
    } catch {
      // Skip files that fail to format (e.g. syntax errors from decompiler)
    }
  }
  return count;
}

/**
 * Copy all .java files from src to dest (preserving structure) and format them.
 */
async function copyAndFormatDirectory(
  srcDir: string,
  destDir: string,
  formatter: JavaFormatterBridge,
): Promise<number> {
  const files = discoverJavaFiles(srcDir);
  const absSrc = resolve(srcDir);
  let count = 0;
  for (const file of files) {
    try {
      const rel = file.slice(absSrc.length + 1);
      const dest = join(destDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      const content = readFileSync(file, 'utf-8');
      const formatted = await formatter.formatWithStdin(content);
      writeFileSync(dest, formatted, 'utf-8');
      count++;
    } catch {
      // Skip files that fail to format
    }
  }
  return count;
}
