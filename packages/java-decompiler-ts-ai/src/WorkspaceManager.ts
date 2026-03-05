import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

/**
 * Convert an internal class name (e.g. "com/example/Foo") to a relative .java file path.
 */
export function classNameToFilePath(className: string): string {
  return className + '.java';
}

/**
 * Convert a relative .java file path back to an internal class name.
 */
export function filePathToClassName(filePath: string): string {
  return filePath.replace(/\.java$/, '');
}

/**
 * Creates a temporary workspace directory for decompiled source files.
 */
export async function createWorkspace(baseDir?: string): Promise<string> {
  const base = baseDir ?? tmpdir();
  const workspacePath = join(base, `java-decompiler-ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

/**
 * Writes decompiled source files into the workspace directory,
 * preserving Java package directory structure.
 */
export async function writeSourceFiles(
  workspaceDir: string,
  sources: Map<string, string>,
): Promise<void> {
  const writes: Promise<void>[] = [];

  for (const [className, source] of sources) {
    const filePath = join(workspaceDir, classNameToFilePath(className));
    const dir = dirname(filePath);

    writes.push(
      mkdir(dir, { recursive: true }).then(() => writeFile(filePath, source, 'utf-8')),
    );
  }

  await Promise.all(writes);
}

/**
 * Reads source files back from the workspace directory.
 * Falls back to the original source if a file is missing or unreadable.
 */
export async function readSourceFiles(
  workspaceDir: string,
  originalSources: Map<string, string>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  const reads = Array.from(originalSources.entries()).map(async ([className, originalSource]) => {
    const filePath = join(workspaceDir, classNameToFilePath(className));
    try {
      const content = await readFile(filePath, 'utf-8');
      result.set(className, content);
    } catch {
      result.set(className, originalSource);
    }
  });

  await Promise.all(reads);
  return result;
}

/**
 * Recursively removes the workspace directory.
 */
export async function cleanupWorkspace(workspaceDir: string): Promise<void> {
  await rm(workspaceDir, { recursive: true, force: true });
}

/**
 * Recursively lists all .java files in a directory, returning paths relative to the base.
 */
export async function listJavaFiles(baseDir: string, subDir: string = ''): Promise<string[]> {
  const fullPath = subDir ? join(baseDir, subDir) : baseDir;
  const entries = await readdir(fullPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = subDir ? join(subDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listJavaFiles(baseDir, relativePath));
    } else if (entry.name.endsWith('.java')) {
      files.push(relativePath);
    }
  }

  return files;
}
