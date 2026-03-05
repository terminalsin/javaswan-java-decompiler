import { statSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, basename, join } from 'node:path';

export interface ResolvedFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}

export interface MatchedPair {
  originalFile: ResolvedFile;
  deobfuscatedFile: ResolvedFile;
}

export interface ResolvedDirectory {
  label: string;
  dirPath: string;
  matchedPairs: MatchedPair[];
  unmatchedOriginals: string[];
  unmatchedDeobfuscated: string[];
}

export interface ResolvedInputs {
  mode: 'file' | 'directory';
  /** Only set in file mode */
  originalFile?: ResolvedFile;
  /** Only set in file mode */
  deobfuscatedFiles?: ResolvedFile[];
  /** Only set in directory mode */
  originalDir?: string;
  /** Only set in directory mode */
  directories?: ResolvedDirectory[];
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(resolve(path)).isDirectory();
  } catch {
    return false;
  }
}

function discoverJavaFiles(dirPath: string): ResolvedFile[] {
  const absDir = resolve(dirPath);
  const files: ResolvedFile[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.java')) {
        files.push({
          absolutePath: fullPath,
          relativePath: relative(absDir, fullPath),
          content: readFileSync(fullPath, 'utf-8'),
        });
      }
    }
  }

  walk(absDir);
  return files;
}

function matchFiles(
  originals: ResolvedFile[],
  deobfuscated: ResolvedFile[],
): { matched: MatchedPair[]; unmatchedOriginals: string[]; unmatchedDeobfuscated: string[] } {
  const matched: MatchedPair[] = [];
  const usedDeobf = new Set<string>();

  // Build lookup maps for deobfuscated files
  const byRelPath = new Map<string, ResolvedFile>();
  const byFilename = new Map<string, ResolvedFile[]>();

  for (const df of deobfuscated) {
    byRelPath.set(df.relativePath, df);
    const name = basename(df.relativePath);
    if (!byFilename.has(name)) byFilename.set(name, []);
    byFilename.get(name)!.push(df);
  }

  // Match each original file
  const unmatchedOriginals: string[] = [];

  for (const orig of originals) {
    // Try relative path match first
    const pathMatch = byRelPath.get(orig.relativePath);
    if (pathMatch && !usedDeobf.has(pathMatch.absolutePath)) {
      matched.push({ originalFile: orig, deobfuscatedFile: pathMatch });
      usedDeobf.add(pathMatch.absolutePath);
      continue;
    }

    // Fall back to filename match
    const name = basename(orig.relativePath);
    const candidates = byFilename.get(name) ?? [];
    const available = candidates.find((c) => !usedDeobf.has(c.absolutePath));
    if (available) {
      matched.push({ originalFile: orig, deobfuscatedFile: available });
      usedDeobf.add(available.absolutePath);
      continue;
    }

    unmatchedOriginals.push(orig.relativePath);
  }

  // Find unmatched deobfuscated files
  const unmatchedDeobfuscated = deobfuscated
    .filter((df) => !usedDeobf.has(df.absolutePath))
    .map((df) => df.relativePath);

  return { matched, unmatchedOriginals, unmatchedDeobfuscated };
}

export function resolveInputs(
  originalPath: string,
  deobfuscatedPaths: string[],
  labels?: string[],
): ResolvedInputs {
  const origIsDir = isDirectory(originalPath);

  // If original is a file, use legacy file mode
  if (!origIsDir) {
    const content = readFileSync(resolve(originalPath), 'utf-8');
    const originalFile: ResolvedFile = {
      absolutePath: resolve(originalPath),
      relativePath: basename(originalPath),
      content,
    };

    // Deobfuscated might be files or directories
    const deobfuscatedFiles: ResolvedFile[] = [];
    for (const p of deobfuscatedPaths) {
      if (isDirectory(p)) {
        // If original is a file but deobfuscated is a dir, find the matching file in the dir
        const dirFiles = discoverJavaFiles(p);
        const origName = basename(originalPath);
        const match = dirFiles.find((f) => basename(f.relativePath) === origName);
        if (match) {
          deobfuscatedFiles.push(match);
        }
      } else {
        deobfuscatedFiles.push({
          absolutePath: resolve(p),
          relativePath: basename(p),
          content: readFileSync(resolve(p), 'utf-8'),
        });
      }
    }

    return { mode: 'file', originalFile, deobfuscatedFiles };
  }

  // Directory mode: original is a directory
  const originalFiles = discoverJavaFiles(originalPath);
  const directories: ResolvedDirectory[] = [];

  for (let i = 0; i < deobfuscatedPaths.length; i++) {
    const deobPath = deobfuscatedPaths[i];
    const label = labels?.[i] ?? basename(resolve(deobPath));

    if (isDirectory(deobPath)) {
      const deobFiles = discoverJavaFiles(deobPath);
      const { matched, unmatchedOriginals, unmatchedDeobfuscated } = matchFiles(
        originalFiles,
        deobFiles,
      );
      directories.push({
        label,
        dirPath: resolve(deobPath),
        matchedPairs: matched,
        unmatchedOriginals,
        unmatchedDeobfuscated,
      });
    } else {
      // Single file against a directory of originals — match by filename
      const content = readFileSync(resolve(deobPath), 'utf-8');
      const deobFile: ResolvedFile = {
        absolutePath: resolve(deobPath),
        relativePath: basename(deobPath),
        content,
      };
      const origMatch = originalFiles.find(
        (f) => basename(f.relativePath) === basename(deobPath),
      );
      if (origMatch) {
        directories.push({
          label,
          dirPath: resolve(deobPath),
          matchedPairs: [{ originalFile: origMatch, deobfuscatedFile: deobFile }],
          unmatchedOriginals: originalFiles
            .filter((f) => f.absolutePath !== origMatch.absolutePath)
            .map((f) => f.relativePath),
          unmatchedDeobfuscated: [],
        });
      }
    }
  }

  return { mode: 'directory', originalDir: resolve(originalPath), directories };
}
