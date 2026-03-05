import type { ClassIR } from '@blkswn/java-ir';

export interface JavaClassSourceEmitterOptions {
  readonly emitPackageDeclaration: boolean;
  readonly includeDebugComments: boolean;
  readonly classIRMap?: ReadonlyMap<string, ClassIR>;
}

