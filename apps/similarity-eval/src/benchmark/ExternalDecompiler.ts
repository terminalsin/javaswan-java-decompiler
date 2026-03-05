import { execFile } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

export interface DecompilerConfig {
  name: string;
  jarPath: string;
  buildArgs: (inputJar: string, outputDir: string) => string[];
}

const DECOMPILER_CONFIGS: Record<string, (jarPath: string) => DecompilerConfig> = {
  cfr: (jarPath) => ({
    name: 'cfr',
    jarPath,
    buildArgs: (input, output) => ['-jar', jarPath, input, '--outputdir', output],
  }),
  procyon: (jarPath) => ({
    name: 'procyon',
    jarPath,
    buildArgs: (input, output) => ['-jar', jarPath, input, '-o', output],
  }),
  vineflower: (jarPath) => ({
    name: 'vineflower',
    jarPath,
    buildArgs: (input, output) => ['-jar', jarPath, input, output],
  }),
};

export function getDecompilerConfig(name: string, jarPath: string): DecompilerConfig {
  const factory = DECOMPILER_CONFIGS[name];
  if (!factory) {
    throw new Error(`Unknown decompiler: ${name}. Known: ${Object.keys(DECOMPILER_CONFIGS).join(', ')}`);
  }
  return factory(jarPath);
}

export function getAvailableDecompilers(decompilersDir: string): DecompilerConfig[] {
  const configs: DecompilerConfig[] = [];
  const dir = resolve(decompilersDir);

  // Auto-detect JARs by filename pattern
  const mapping: [string, RegExp][] = [
    ['cfr', /^cfr.*\.jar$/i],
    ['procyon', /^procyon.*\.jar$/i],
    ['vineflower', /^vineflower.*\.jar$/i],
  ];

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return configs;
  }

  for (const [name, pattern] of mapping) {
    const match = files.find((f) => pattern.test(f));
    if (match) {
      configs.push(getDecompilerConfig(name, join(dir, match)));
    }
  }

  return configs;
}

export async function runExternalDecompiler(
  config: DecompilerConfig,
  inputJar: string,
  outputDir: string,
  javaPath: string = 'java',
): Promise<{ success: boolean; stderr: string; durationMs: number }> {
  mkdirSync(outputDir, { recursive: true });

  const args = config.buildArgs(inputJar, outputDir);
  const start = Date.now();

  return new Promise((resolve) => {
    execFile(javaPath, args, { maxBuffer: 50 * 1024 * 1024, timeout: 120_000 }, (err, _stdout, stderr) => {
      resolve({
        success: !err,
        stderr: stderr || (err?.message ?? ''),
        durationMs: Date.now() - start,
      });
    });
  });
}
