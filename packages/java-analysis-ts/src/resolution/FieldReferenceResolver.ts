import type { ClassHierarchyGraph } from '../hierarchy/ClassHierarchyGraph';
import type { AnalysisClass } from '../model/AnalysisClass';
import type { AnalysisField } from '../model/AnalysisField';
import { ExternalClass, ExternalField, type ResolvedFieldRef } from '../model/externals';
import { FieldKey } from '../model/keys';
import { UnresolvedFieldDiagnostic, type DiagnosticsCollector } from '../model/diagnostics';

/**
 * Resolves field references to their declarations.
 */
export class FieldReferenceResolver {
  private readonly hierarchy: ClassHierarchyGraph;
  private readonly diagnostics: DiagnosticsCollector;

  /**
   * Index of all fields by class name.
   */
  private readonly fieldsByClass: Map<string, Map<string, AnalysisField>> = new Map();

  /**
   * External classes created for unresolved references.
   */
  private readonly externalClasses: Map<string, ExternalClass> = new Map();

  constructor(hierarchy: ClassHierarchyGraph, diagnostics: DiagnosticsCollector) {
    this.hierarchy = hierarchy;
    this.diagnostics = diagnostics;

    // Build field index
    for (const node of hierarchy.getAllNodes()) {
      if (this.isAnalysisClass(node)) {
        const fieldMap = new Map<string, AnalysisField>();
        for (const field of node.fields) {
          // Use name:descriptor as key since fields can have same name with different types
          // in different classes (though unusual in practice)
          fieldMap.set(`${field.name}:${field.descriptor}`, field);
        }
        this.fieldsByClass.set(node.name, fieldMap);
      }
    }
  }

  /**
   * Resolves a field reference.
   */
  public resolve(
    owner: string,
    name: string,
    descriptor: string,
    referencedFrom: string
  ): ResolvedFieldRef {
    const fieldKey = `${name}:${descriptor}`;

    // Walk up the class hierarchy to find the field
    const chain = this.hierarchy.getSuperclassChain(owner);

    for (const className of chain) {
      const fields = this.fieldsByClass.get(className);
      if (fields) {
        const field = fields.get(fieldKey);
        if (field) {
          return { kind: 'internal', field };
        }
      }
    }

    // For interfaces, we also need to check interface hierarchy
    // (interface fields are implicitly public static final)
    const ownerSupertypes = this.hierarchy.getAllSupertypes(owner);
    for (const supertype of ownerSupertypes) {
      if (supertype === owner) {
        continue; // Already checked via superclass chain
      }

      const fields = this.fieldsByClass.get(supertype);
      if (fields) {
        const field = fields.get(fieldKey);
        if (field && field.isStatic()) {
          return { kind: 'internal', field };
        }
      }
    }

    // Field not found - create external reference
    const key = new FieldKey(owner, name, descriptor);
    this.diagnostics.add(new UnresolvedFieldDiagnostic(key, referencedFrom));

    return { kind: 'external', field: this.getOrCreateExternalField(owner, name, descriptor) };
  }

  /**
   * Resolves a static field reference.
   */
  public resolveStatic(
    owner: string,
    name: string,
    descriptor: string,
    referencedFrom: string
  ): ResolvedFieldRef {
    // Static field resolution is the same, but we might want to verify it's static
    return this.resolve(owner, name, descriptor, referencedFrom);
  }

  /**
   * Resolves an instance field reference.
   */
  public resolveInstance(
    owner: string,
    name: string,
    descriptor: string,
    referencedFrom: string
  ): ResolvedFieldRef {
    // Instance field resolution is the same
    return this.resolve(owner, name, descriptor, referencedFrom);
  }

  private getOrCreateExternalField(owner: string, name: string, descriptor: string): ExternalField {
    let externalClass = this.externalClasses.get(owner);
    if (!externalClass) {
      externalClass = new ExternalClass(owner);
      this.externalClasses.set(owner, externalClass);
    }
    return externalClass.getOrCreateField(name, descriptor);
  }

  /**
   * Gets all external classes that were created during resolution.
   */
  public getExternalClasses(): ReadonlyMap<string, ExternalClass> {
    return this.externalClasses;
  }

  private isAnalysisClass(node: unknown): node is AnalysisClass {
    return node !== null && typeof node === 'object' && 'classIR' in node;
  }
}
