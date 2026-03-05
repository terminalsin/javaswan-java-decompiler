import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import JSZip from 'jszip';

/**
 * Extract class bytes from a JAR file using JSZip.
 */
export async function extractClassBytes(jarPath: string): Promise<Uint8Array[]> {
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
    console.error(`Warning: ${errors.length} class(es) failed to read from JAR:`);
    for (const e of errors.slice(0, 5)) console.error(e);
    if (errors.length > 5) console.error(`  ... and ${errors.length - 5} more`);
  }

  return classBytes;
}

/**
 * Write decompiled sources (Map<className, source>) to an output directory
 * as .java files with proper package structure.
 */
export function writeSources(outputDir: string, sources: Map<string, string>): void {
  for (const [className, source] of sources) {
    const filePath = join(outputDir, className.replace(/\./g, '/') + '.java');
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, source, 'utf-8');
  }
}

/**
 * Decompile a JAR using @blkswn/java-decompiler (TypeScript decompiler).
 */
export async function decompileWithTs(
  jarPath: string,
  outputDir: string,
): Promise<{ success: boolean; fileCount: number; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const { JavaDecompiler } = await import('@blkswn/java-decompiler');
    const classBytes = await extractClassBytes(jarPath);

    const decompiler = new JavaDecompiler();
    const sources = decompiler.decompileMultipleClassBytes(classBytes, {
      resolveReferences: true,
      constantFolding: true,
      emitPackageDeclaration: true,
    });

    mkdirSync(outputDir, { recursive: true });
    writeSources(outputDir, sources);

    return { success: true, fileCount: sources.size, durationMs: Date.now() - start };
  } catch (err) {
    return {
      success: false,
      fileCount: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Decompile a JAR using @blkswn/java-decompiler-ai (AI-enhanced decompiler).
 * Requires an OpenCode server to be running.
 */
export async function decompileWithTsAi(
  jarPath: string,
  outputDir: string,
  aiOptions?: {
    baseUrl?: string;
    providerID?: string;
    modelID?: string;
    timeout?: number;
  },
): Promise<{ success: boolean; fileCount: number; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const { AIJavaDecompiler } = await import('@blkswn/java-decompiler-ai');
    const { ClassReader } = await import('@blkswn/java-asm');
    const { IRClassVisitor } = await import('@blkswn/java-ir');

    const classBytes = await extractClassBytes(jarPath);

    // Build ClassIRs
    const classIRs = [];
    for (const bytes of classBytes) {
      const reader = new ClassReader(bytes);
      const visitor = new IRClassVisitor();
      reader.accept(visitor, 0);
      const classIR = visitor.getClassIR();
      if (classIR) classIRs.push(classIR);
    }

    const decompiler = new AIJavaDecompiler({
      aiOptions: {
        connection: { baseUrl: aiOptions?.baseUrl ?? 'http://localhost:4096' },
        model: {
          providerID: aiOptions?.providerID ?? 'openrouter-shortcut',
          modelID: aiOptions?.modelID ?? 'minimax/minimax-m2.5:nitro',
        },
        agentTimeout: aiOptions?.timeout ?? 600_000,
        cleanupWorkspace: true,
      },
    });

    // Health check first
    const healthy = await decompiler.healthCheck();
    if (!healthy) {
      return {
        success: false,
        fileCount: 0,
        durationMs: Date.now() - start,
        error: 'OpenCode server not reachable. Start it or skip AI decompiler with --no-ai.',
      };
    }

    const result = await decompiler.decompileClassIRs(classIRs);

    mkdirSync(outputDir, { recursive: true });
    writeSources(outputDir, result.sources);

    return { success: true, fileCount: result.sources.size, durationMs: Date.now() - start };
  } catch (err) {
    return {
      success: false,
      fileCount: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
