/**
 * Options to control the decompilation pipeline.
 */
export interface JavaDecompilerOptions {
  /**
   * Whether to run @blkswn/java-analysis reference resolution.
   * This can improve naming (resolved owners) but requires a program context.
   *
   * Default: true
   */
  readonly resolveReferences?: boolean;

  /**
   * Whether to run constant folding before emitting Java source.
   *
   * Default: true
   */
  readonly constantFolding?: boolean;

  /**
   * Whether to emit a `package ...;` declaration when the class internal name includes a package.
   *
   * Default: true
   */
  readonly emitPackageDeclaration?: boolean;

  /**
   * Whether to include additional debug comments (block ids, etc).
   *
   * Default: false
   */
  readonly includeDebugComments?: boolean;
}

