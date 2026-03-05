import type { ClassIR } from '@blkswn/java-ir';

export interface JavaClassDecompilationContext {
  readonly currentClassInternalName: string;
  readonly currentSuperInternalName: string | null;
  readonly currentPackageName: string | null;
  readonly isEnum?: boolean;
  readonly isInterface?: boolean;
  /** Maps inner class internal names to their simple names for type resolution. */
  readonly innerClassSimpleNames?: ReadonlyMap<string, string>;
  /** The full ClassIR, needed for lambda body inlining. */
  readonly classIR?: ClassIR;
  /** When present, collects fully-qualified type names that need import statements. */
  readonly importCollector?: Set<string>;
}
