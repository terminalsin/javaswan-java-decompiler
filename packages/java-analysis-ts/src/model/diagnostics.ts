import type { MethodKey, FieldKey } from './keys';

/**
 * Base interface for analysis diagnostics.
 */
export interface AnalysisDiagnostic {
  /**
   * The kind of diagnostic.
   */
  readonly kind: string;

  /**
   * Human-readable message.
   */
  readonly message: string;
}

/**
 * Diagnostic for when a class is referenced but not present in the analysis.
 */
export class UnresolvedClassDiagnostic implements AnalysisDiagnostic {
  public readonly kind = 'unresolved_class';
  public readonly className: string;
  public readonly referencedFrom: string;

  constructor(className: string, referencedFrom: string) {
    this.className = className;
    this.referencedFrom = referencedFrom;
  }

  public get message(): string {
    return `Class '${this.className}' referenced from '${this.referencedFrom}' was not found in the analysis scope`;
  }
}

/**
 * Diagnostic for when a method cannot be resolved.
 */
export class UnresolvedMethodDiagnostic implements AnalysisDiagnostic {
  public readonly kind = 'unresolved_method';
  public readonly methodKey: MethodKey;
  public readonly referencedFrom: string;

  constructor(methodKey: MethodKey, referencedFrom: string) {
    this.methodKey = methodKey;
    this.referencedFrom = referencedFrom;
  }

  public get message(): string {
    return `Method '${this.methodKey}' referenced from '${this.referencedFrom}' could not be resolved`;
  }
}

/**
 * Diagnostic for when a field cannot be resolved.
 */
export class UnresolvedFieldDiagnostic implements AnalysisDiagnostic {
  public readonly kind = 'unresolved_field';
  public readonly fieldKey: FieldKey;
  public readonly referencedFrom: string;

  constructor(fieldKey: FieldKey, referencedFrom: string) {
    this.fieldKey = fieldKey;
    this.referencedFrom = referencedFrom;
  }

  public get message(): string {
    return `Field '${this.fieldKey}' referenced from '${this.referencedFrom}' could not be resolved`;
  }
}

/**
 * Diagnostic for diamond inheritance conflicts with interface default methods.
 */
export class DiamondDefaultMethodConflictDiagnostic implements AnalysisDiagnostic {
  public readonly kind = 'diamond_default_method_conflict';
  public readonly className: string;
  public readonly methodSignature: string;
  public readonly conflictingInterfaces: readonly string[];

  constructor(className: string, methodSignature: string, conflictingInterfaces: readonly string[]) {
    this.className = className;
    this.methodSignature = methodSignature;
    this.conflictingInterfaces = conflictingInterfaces;
  }

  public get message(): string {
    return `Class '${this.className}' inherits conflicting default implementations of '${this.methodSignature}' from interfaces: ${this.conflictingInterfaces.join(', ')}`;
  }
}

/**
 * Diagnostic for abstract method not implemented.
 */
export class AbstractMethodNotImplementedDiagnostic implements AnalysisDiagnostic {
  public readonly kind = 'abstract_method_not_implemented';
  public readonly className: string;
  public readonly methodSignature: string;
  public readonly declaredIn: string;

  constructor(className: string, methodSignature: string, declaredIn: string) {
    this.className = className;
    this.methodSignature = methodSignature;
    this.declaredIn = declaredIn;
  }

  public get message(): string {
    return `Non-abstract class '${this.className}' does not implement abstract method '${this.methodSignature}' from '${this.declaredIn}'`;
  }
}

/**
 * Collector for analysis diagnostics.
 */
export class DiagnosticsCollector {
  private readonly _diagnostics: AnalysisDiagnostic[] = [];
  private readonly _seenKeys: Set<string> = new Set();

  /**
   * Adds a diagnostic, deduplicating by a computed key.
   */
  public add(diagnostic: AnalysisDiagnostic): void {
    const key = `${diagnostic.kind}:${diagnostic.message}`;
    if (!this._seenKeys.has(key)) {
      this._seenKeys.add(key);
      this._diagnostics.push(diagnostic);
    }
  }

  /**
   * Gets all collected diagnostics.
   */
  public get diagnostics(): readonly AnalysisDiagnostic[] {
    return this._diagnostics;
  }

  /**
   * Gets the count of diagnostics.
   */
  public get count(): number {
    return this._diagnostics.length;
  }

  /**
   * Filters diagnostics by kind.
   */
  public getByKind(kind: string): readonly AnalysisDiagnostic[] {
    return this._diagnostics.filter(d => d.kind === kind);
  }

  /**
   * Checks if there are any diagnostics of a specific kind.
   */
  public hasKind(kind: string): boolean {
    return this._diagnostics.some(d => d.kind === kind);
  }
}
