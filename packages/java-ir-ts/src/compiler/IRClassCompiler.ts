import type { ClassWriter } from '@blkswn/java-asm';
import { COMPUTE_MAXS, ClassWriter as AsmClassWriter } from '@blkswn/java-asm';
import type { ClassIR } from '../ir/ClassIR';
import { IRMethodCompiler } from './IRMethodCompiler';

export interface IRClassCompileOptions {
  /**
   * ClassWriter compute flags (e.g., COMPUTE_MAXS).
   * Defaults to COMPUTE_MAXS for convenience.
   */
  readonly computeFlags?: number;
}

/**
 * Compiles a ClassIR into JVM `.class` bytes using @blkswn/java-asm.
 */
export class IRClassCompiler {
  constructor(private readonly methodCompiler: IRMethodCompiler = new IRMethodCompiler()) { }

  public compileToBytes(classIR: ClassIR, options: IRClassCompileOptions = {}): Uint8Array {
    const cw = this.compileToClassWriter(classIR, options);
    return cw.toByteArray();
  }

  public compileToClassWriter(classIR: ClassIR, options: IRClassCompileOptions = {}): ClassWriter {
    const flags = options.computeFlags ?? COMPUTE_MAXS;
    const cw = new AsmClassWriter(flags);

    cw.visit(
      classIR.version,
      classIR.access,
      classIR.name,
      classIR.signature,
      classIR.superName,
      classIR.interfaces.length > 0 ? [...classIR.interfaces] : null
    );

    if (classIR.sourceFile) {
      cw.visitSource(classIR.sourceFile, null);
    }

    for (const inner of classIR.innerClasses) {
      cw.visitInnerClass(inner.name, inner.outerName, inner.innerName, inner.access);
    }

    for (const field of classIR.fields) {
      const fv = cw.visitField(field.access, field.name, field.descriptor, field.signature, field.initialValue);
      fv?.visitEnd();
    }

    for (const method of classIR.methods) {
      const mv = cw.visitMethod(
        method.access,
        method.name,
        method.descriptor,
        method.signature,
        method.exceptions.length > 0 ? [...method.exceptions] : null
      );
      if (!mv) continue;

      this.methodCompiler.compile(method, mv, { enforceExplicitFallthrough: true });
      mv.visitEnd();
    }

    cw.visitEnd();
    return cw;
  }
}

