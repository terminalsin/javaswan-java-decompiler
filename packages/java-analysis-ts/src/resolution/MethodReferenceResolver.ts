import type { ClassHierarchyGraph } from '../hierarchy/ClassHierarchyGraph';
import type { VirtualMethodTable, VTableEntry } from '../hierarchy/VirtualMethodTableBuilder';
import type { AnalysisClass } from '../model/AnalysisClass';
import type { AnalysisMethod } from '../model/AnalysisMethod';
import { ExternalClass, ExternalMethod, type ResolvedMethodRef } from '../model/externals';
import { MethodKey } from '../model/keys';
import { UnresolvedMethodDiagnostic, type DiagnosticsCollector } from '../model/diagnostics';

/**
 * Result of resolving a method reference.
 */
export interface MethodResolutionResult {
  /**
   * The declared method (link-time resolution).
   */
  declared: ResolvedMethodRef;

  /**
   * Possible runtime targets for virtual/interface dispatch.
   * Empty for static and special invocations.
   */
  possibleTargets: readonly ResolvedMethodRef[];
}

/**
 * Resolves method references to their declarations and possible runtime targets.
 */
export class MethodReferenceResolver {
  private readonly hierarchy: ClassHierarchyGraph;
  private readonly vtables: Map<string, VirtualMethodTable>;
  private readonly diagnostics: DiagnosticsCollector;

  /**
   * Index of all methods by class name.
   */
  private readonly methodsByClass: Map<string, Map<string, AnalysisMethod>> = new Map();

  /**
   * External classes created for unresolved references.
   */
  private readonly externalClasses: Map<string, ExternalClass> = new Map();

  constructor(
    hierarchy: ClassHierarchyGraph,
    vtables: Map<string, VirtualMethodTable>,
    diagnostics: DiagnosticsCollector
  ) {
    this.hierarchy = hierarchy;
    this.vtables = vtables;
    this.diagnostics = diagnostics;

    // Build method index
    for (const node of hierarchy.getAllNodes()) {
      if (this.isAnalysisClass(node)) {
        const methodMap = new Map<string, AnalysisMethod>();
        for (const method of node.methods) {
          methodMap.set(method.getSignature(), method);
        }
        this.methodsByClass.set(node.name, methodMap);
      }
    }
  }

  /**
   * Resolves a static method invocation.
   */
  public resolveStatic(
    owner: string,
    name: string,
    descriptor: string,
    referencedFrom: string
  ): MethodResolutionResult {
    const declared = this.resolveDeclared(owner, name, descriptor, referencedFrom);
    return {
      declared,
      possibleTargets: [], // Static calls have no virtual dispatch
    };
  }

  /**
   * Resolves a special method invocation (constructors, super calls, private methods).
   */
  public resolveSpecial(
    owner: string,
    name: string,
    descriptor: string,
    referencedFrom: string
  ): MethodResolutionResult {
    const declared = this.resolveDeclared(owner, name, descriptor, referencedFrom);
    return {
      declared,
      possibleTargets: [], // Special calls are not virtual
    };
  }

  /**
   * Resolves a virtual method invocation.
   */
  public resolveVirtual(
    owner: string,
    name: string,
    descriptor: string,
    receiverType: string | null,
    referencedFrom: string
  ): MethodResolutionResult {
    const declared = this.resolveDeclared(owner, name, descriptor, referencedFrom);
    const signature = `${name}${descriptor}`;
    
    // Compute possible targets based on receiver type
    const baseType = receiverType ?? owner;
    const possibleTargets = this.computePossibleTargets(baseType, signature);

    return {
      declared,
      possibleTargets,
    };
  }

  /**
   * Resolves an interface method invocation.
   */
  public resolveInterface(
    owner: string,
    name: string,
    descriptor: string,
    receiverType: string | null,
    referencedFrom: string
  ): MethodResolutionResult {
    // Interface resolution is similar to virtual, but starts from the interface
    const declared = this.resolveDeclared(owner, name, descriptor, referencedFrom);
    const signature = `${name}${descriptor}`;
    
    // For interface calls, we need to find all implementors
    const baseType = receiverType ?? owner;
    const possibleTargets = this.computePossibleTargets(baseType, signature);

    return {
      declared,
      possibleTargets,
    };
  }

  /**
   * Resolves the declared method (link-time resolution).
   */
  private resolveDeclared(
    owner: string,
    name: string,
    descriptor: string,
    referencedFrom: string
  ): ResolvedMethodRef {
    const signature = `${name}${descriptor}`;

    // Walk up the class hierarchy to find the declaration
    const chain = this.hierarchy.getSuperclassChain(owner);
    
    for (const className of chain) {
      const methods = this.methodsByClass.get(className);
      if (methods) {
        const method = methods.get(signature);
        if (method) {
          return { kind: 'internal', method };
        }
      }
    }

    // Also check interfaces for the owner
    const ownerSupertypes = this.hierarchy.getAllSupertypes(owner);
    for (const supertype of ownerSupertypes) {
      const methods = this.methodsByClass.get(supertype);
      if (methods) {
        const method = methods.get(signature);
        if (method) {
          return { kind: 'internal', method };
        }
      }
    }

    // Method not found in analyzed classes - create external reference
    const methodKey = new MethodKey(owner, name, descriptor);
    this.diagnostics.add(new UnresolvedMethodDiagnostic(methodKey, referencedFrom));

    return { kind: 'external', method: this.getOrCreateExternalMethod(owner, name, descriptor) };
  }

  /**
   * Computes possible runtime targets for virtual dispatch.
   */
  private computePossibleTargets(baseType: string, signature: string): ResolvedMethodRef[] {
    const targets: ResolvedMethodRef[] = [];
    const seen = new Set<string>();

    // Get all subtypes of the base type
    const subtypes = this.hierarchy.getAllSubtypes(baseType);

    for (const subtype of subtypes) {
      const vtable = this.vtables.get(subtype);
      if (!vtable) {
        continue;
      }

      const entry = vtable.get(signature);
      if (!entry) {
        continue;
      }

      const target = this.vtableEntryToRef(entry);
      if (!target) {
        continue;
      }

      // Deduplicate by method key
      const key = target.kind === 'internal' 
        ? target.method.key.toString()
        : target.method.key.toString();
      
      if (!seen.has(key)) {
        seen.add(key);
        targets.push(target);
      }
    }

    return targets;
  }

  private vtableEntryToRef(entry: VTableEntry): ResolvedMethodRef | null {
    switch (entry.kind) {
      case 'internal':
        return { kind: 'internal', method: entry.method };
      case 'external':
        return { kind: 'external', method: entry.method };
      case 'abstract':
        // Abstract entries don't have implementations
        return null;
      case 'conflict':
        // For conflicts, return the first candidate if any
        if (entry.candidates.length > 0) {
          return this.vtableEntryToRef(entry.candidates[0]!);
        }
        return null;
    }
  }

  private getOrCreateExternalMethod(owner: string, name: string, descriptor: string): ExternalMethod {
    let externalClass = this.externalClasses.get(owner);
    if (!externalClass) {
      externalClass = new ExternalClass(owner);
      this.externalClasses.set(owner, externalClass);
    }
    return externalClass.getOrCreateMethod(name, descriptor);
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
