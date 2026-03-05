import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { ClassReader } from '@blkswn/java-asm';
import { JavaDecompiler, type JavaDecompilerOptions } from '@blkswn/java-decompiler';
import JSZip from 'jszip';
import { AIPostProcessor } from './AIPostProcessor';
import type { AIPostProcessorOptions } from './types';
import type { OnActivity } from './activity';

interface CliOptions {
  input: string;
  output?: string;
  ai: boolean;
  baseUrl: string;
  provider: string;
  model: string;
  timeout: string;
  noCleanup: boolean;
  debug: boolean;
  tui: boolean;
  quiet: boolean;
  verbose: boolean;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('java-decompiler-ai')
    .description('Decompile Java .class/.jar files with optional AI-powered cleanup')
    .argument('<input>', 'Path to a .class file or .jar file')
    .option('-o, --output <path>', 'Output directory for decompiled sources (default: stdout for single file)')
    .option('--no-ai', 'Skip AI post-processing (decompile only)')
    .option('--base-url <url>', 'OpenCode server URL', 'http://localhost:4096')
    .option('--provider <id>', 'AI model provider', 'openrouter-shortcut')
    .option('--model <id>', 'AI model ID', 'minimax/minimax-m2.5:nitro')
    .option('--timeout <ms>', 'AI agent timeout in milliseconds', '600000')
    .option('--no-cleanup', 'Keep temporary workspace after AI processing')
    .option('--debug', 'Include debug comments in decompiled output', false)
    .option('--tui', 'Use interactive TUI panel view instead of streaming log', false)
    .option('-q, --quiet', 'Suppress all progress output (only emit final source)', false)
    .option('-v, --verbose', 'Show raw OpenCode event stream for debugging', false)
    .action(async (input: string, opts: CliOptions) => {
      await run(input, opts);
    });

  return program;
}

async function buildDisplay(opts: CliOptions): Promise<{ onActivity: OnActivity; cleanup?: () => void }> {
  if (opts.quiet) {
    return { onActivity: () => { } };
  }

  if (opts.tui) {
    const { createTuiDisplay } = await import('./display/TuiApp.js');
    const tui = createTuiDisplay();
    return { onActivity: (a) => tui.onActivity(a), cleanup: () => tui.cleanup() };
  }

  const { createStreamingDisplay } = await import('./display/StreamingDisplay.js');
  return { onActivity: createStreamingDisplay() };
}

async function run(inputPath: string, opts: CliOptions): Promise<void> {
  const resolvedInput = resolve(inputPath);

  if (!existsSync(resolvedInput)) {
    console.error(`Error: File not found: ${resolvedInput}`);
    process.exit(1);
  }

  const isJar = resolvedInput.endsWith('.jar');
  const isClass = resolvedInput.endsWith('.class');

  if (!isJar && !isClass) {
    console.error('Error: Input must be a .class or .jar file');
    process.exit(1);
  }

  const { onActivity, cleanup } = await buildDisplay(opts);

  try {
    const decompilerOptions: JavaDecompilerOptions = {
      resolveReferences: true,
      constantFolding: true,
      emitPackageDeclaration: true,
      includeDebugComments: opts.debug,
    };

    // Decompile phase — don't report fileCount yet for JARs since we
    // don't know how many classes are inside until extraction is done.
    onActivity({ type: 'decompile_start', fileCount: isClass ? 1 : undefined });
    const decompileStart = Date.now();

    let sources: Map<string, string>;

    if (isJar) {
      sources = await decompileJar(resolvedInput, decompilerOptions);
    } else {
      sources = decompileClassFile(resolvedInput, decompilerOptions);
    }

    onActivity({ type: 'decompile_complete', fileCount: sources.size, durationMs: Date.now() - decompileStart });

    // AI post-processing
    if (opts.ai !== false) {
      sources = await runAiPostProcess(sources, opts, onActivity);
    }

    // Output
    if (opts.output) {
      writeOutputFiles(opts.output, sources);
      if (!opts.quiet) {
        console.error(`Wrote ${sources.size} file(s) to ${opts.output}`);
      }
    } else {
      for (const [className, source] of sources) {
        if (sources.size > 1) {
          console.log(`// === ${className} ===`);
        }
        console.log(source);
        if (sources.size > 1) {
          console.log('');
        }
      }
    }
  } finally {
    cleanup?.();
  }
}

function decompileClassFile(
  filePath: string,
  options: JavaDecompilerOptions,
): Map<string, string> {
  const bytes = new Uint8Array(readFileSync(filePath));

  // Extract the real fully-qualified internal name from the bytecode
  // (e.g. "com/example/MyClass") so the workspace has proper package structure
  const reader = new ClassReader(bytes);
  const className = reader.getClassName();

  // Decompile using the full pipeline
  const decompiler = new JavaDecompiler();
  const source = decompiler.decompileClassFileBytes(bytes, options);

  return new Map([[className, source]]);
}

async function decompileJar(
  jarPath: string,
  options: JavaDecompilerOptions,
): Promise<Map<string, string>> {
  const jarBuffer = readFileSync(jarPath);
  const zip = await JSZip.loadAsync(jarBuffer);

  const classBytes: Uint8Array[] = [];
  const errors: string[] = [];

  for (const [fileName, zipEntry] of Object.entries(zip.files)) {
    if (!fileName.endsWith('.class') || zipEntry.dir) continue;

    try {
      const data = await zipEntry.async('uint8array');
      classBytes.push(data);
    } catch (err) {
      errors.push(`  ${fileName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    console.error(`Warning: ${errors.length} class(es) failed to read:`);
    for (const e of errors.slice(0, 5)) console.error(e);
    if (errors.length > 5) console.error(`  ... and ${errors.length - 5} more`);
  }

  // Use decompileMultipleClassBytes to avoid cross-package ClassIR incompatibility
  // while still enabling cross-class reference resolution
  const decompiler = new JavaDecompiler();
  return decompiler.decompileMultipleClassBytes(classBytes, options);
}

async function runAiPostProcess(
  sources: Map<string, string>,
  opts: CliOptions,
  onActivity: OnActivity,
): Promise<Map<string, string>> {
  const aiOptions: AIPostProcessorOptions = {
    connection: { baseUrl: opts.baseUrl },
    model: { providerID: opts.provider, modelID: opts.model },
    agentTimeout: parseInt(opts.timeout, 10),
    cleanupWorkspace: opts.noCleanup !== true,
    onActivity,
    verbose: opts.verbose,
  };

  const processor = new AIPostProcessor(aiOptions);

  // Health check
  if (!opts.quiet) {
    console.error(`Connecting to OpenCode server at ${opts.baseUrl}...`);
  }
  const healthy = await processor.healthCheck();
  if (!healthy) {
    console.error('Error: Cannot connect to OpenCode server.');
    console.error('Make sure OpenCode is running: https://opencode.ai/docs/');
    console.error('Or skip AI with --no-ai');
    process.exit(1);
  }

  const result = await processor.postProcess(sources);

  if (result.workspacePath && !opts.quiet) {
    console.error(`Workspace preserved at: ${result.workspacePath}`);
  }

  return result.sources;
}

function writeOutputFiles(outputDir: string, sources: Map<string, string>): void {
  const resolved = resolve(outputDir);
  for (const [className, source] of sources) {
    const filePath = join(resolved, className.replace(/\./g, '/') + '.java');
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, source, 'utf-8');
  }
}

// Entry point
createProgram().parseAsync(process.argv).catch((err) => {
  console.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
