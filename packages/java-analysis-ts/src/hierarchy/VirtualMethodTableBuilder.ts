import type { ClassHierarchyGraph, HierarchyNode } from './ClassHierarchyGraph';
import type { AnalysisClass } from '../model/AnalysisClass';
import type { AnalysisMethod } from '../model/AnalysisMethod';
import type { ExternalClass, ExternalMethod } from '../model/externals';
import { DiamondDefaultMethodConflictDiagnostic, type DiagnosticsCollector } from '../model/diagnostics';

/**
 * A method entry in the virtual method table.
 */
export type VTableEntry = 
  | { kind: 'internal'; method: AnalysisMethod }
  | { kind: 'external'; method: ExternalMethod }
  | { kind: 'abstract'; signature: string; declaredIn: string }
  | { kind: 'conflict'; signature: string; candidates: VTableEntry[] };

/**
 * Virtual method table for a class.
 * Maps method signatures (name + descriptor) to their implementations.
 */
export class VirtualMethodTable {
  /**
   * The class this vtable belongs to.
   */
  public readonly className: string;

  /**
   * Map from signature to vtable entry.
   */
  private readonly entries: Map<string, VTableEntry> = new Map();

  constructor(className: string) {
    this.className = className;
  }

  /**
   * Sets an entry in the vtable.
   */
  public set(signature: string, entry: VTableEntry): void {
    this.entries.set(signature, entry);
  }

  /**
   * Gets an entry from the vtable.
   */
  public get(signature: string): VTableEntry | undefined {
    return this.entries.get(signature);
  }

  /**
   * Checks if the vtable has an entry for a signature.
   */
  public has(signature: string): boolean {
    return this.entries.has(signature);
  }

  /**
   * Gets all entries.
   */
  public getAllEntries(): ReadonlyMap<string, VTableEntry> {
    return this.entries;
  }

  /**
   * Gets all signatures in the vtable.
   */
  public getSignatures(): IterableIterator<string> {
    return this.entries.keys();
  }
}

/**
 * Builds virtual method tables for all classes in the hierarchy.
 * Handles interface default method diamonds conservatively.
 */
export class VirtualMethodTableBuilder {
  private readonly hierarchy: ClassHierarchyGraph;
  private readonly diagnostics: DiagnosticsCollector;
  private readonly vtables: Map<string, VirtualMethodTable> = new Map();

  /**
   * Tracks which classes we're currently building (for cycle detection).
   */
  private readonly building: Set<string> = new Set();

  constructor(hierarchy: ClassHierarchyGraph, diagnostics: DiagnosticsCollector) {
    this.hierarchy = hierarchy;
    this.diagnostics = diagnostics;
  }

  /**
   * Builds vtables for all classes in the hierarchy.
   */
  public buildAll(): Map<string, VirtualMethodTable> {
    for (const className of this.hierarchy.getAllClassNames()) {
      this.getOrBuild(className);
    }
    return this.vtables;
  }

  /**
   * Gets or builds the vtable for a class.
   */
  public getOrBuild(className: string): VirtualMethodTable {
    const existing = this.vtables.get(className);
    if (existing) {
      return existing;
    }

    // Cycle detection
    if (this.building.has(className)) {
      // Return empty vtable for cycles
      const vtable = new VirtualMethodTable(className);
      this.vtables.set(className, vtable);
      return vtable;
    }

    this.building.add(className);
    const vtable = this.buildVTable(className);
    this.building.delete(className);

    this.vtables.set(className, vtable);
    return vtable;
  }

  private buildVTable(className: string): VirtualMethodTable {
    const vtable = new VirtualMethodTable(className);
    const node = this.hierarchy.getNode(className);

    if (!node) {
      return vtable;
    }

    // Step 1: Inherit from superclass
    const superName = this.hierarchy.getSuperClassName(className);
    if (superName) {
      const superVTable = this.getOrBuild(superName);
      for (const [sig, entry] of superVTable.getAllEntries()) {
        vtable.set(sig, entry);
      }
    }

    // Step 2: Collect interface methods (including defaults)
    const interfaceEntries = this.collectInterfaceMethods(className);

    // Step 3: For each interface method, apply the inheritance rules
    for (const [sig, candidates] of interfaceEntries) {
      const existingEntry = vtable.get(sig);
      
      if (existingEntry) {
        // If we already have a concrete implementation from the class hierarchy,
        // it takes precedence over interface defaults
        if (existingEntry.kind === 'internal' || existingEntry.kind === 'external') {
          continue;
        }
      }

      // Apply interface method to vtable
      if (candidates.length === 1) {
        vtable.set(sig, candidates[0]!);
      } else if (candidates.length > 1) {
        // Multiple candidates - try to find most specific
        const resolved = this.resolveDiamond(sig, candidates);
        vtable.set(sig, resolved);

        if (resolved.kind === 'conflict') {
          const conflictingInterfaces = candidates
            .map(c => this.getDeclaringClass(c))
            .filter((c): c is string => c !== null);
          this.diagnostics.add(
            new DiamondDefaultMethodConflictDiagnostic(className, sig, conflictingInterfaces)
          );
        }
      }
    }

    // Step 4: Add methods declared in this class (override any inherited)
    if (this.isAnalysisClass(node)) {
      for (const method of node.methods) {
        if (!method.isStatic() && !method.isPrivate()) {
          const sig = method.getSignature();
          vtable.set(sig, { kind: 'internal', method });
        }
      }
    }

    return vtable;
  }

  /**
   * Collects all methods from directly and transitively implemented interfaces.
   */
  private collectInterfaceMethods(className: string): Map<string, VTableEntry[]> {
    const result = new Map<string, VTableEntry[]>();
    const visited = new Set<string>();
    const queue = [...this.hierarchy.getDirectInterfaceNames(className)];

    while (queue.length > 0) {
      const ifaceName = queue.pop()!;
      if (visited.has(ifaceName)) {
        continue;
      }
      visited.add(ifaceName);

      const ifaceNode = this.hierarchy.getNode(ifaceName);
      if (ifaceNode && this.isAnalysisClass(ifaceNode)) {
        for (const method of ifaceNode.methods) {
          if (!method.isStatic() && !method.isPrivate()) {
            const sig = method.getSignature();
            let candidates = result.get(sig);
            if (!candidates) {
              candidates = [];
              result.set(sig, candidates);
            }

            const entry: VTableEntry = method.isAbstract()
              ? { kind: 'abstract', signature: sig, declaredIn: ifaceName }
              : { kind: 'internal', method };
            
            // Don't add duplicates
            if (!candidates.some(c => this.entriesEqual(c, entry))) {
              candidates.push(entry);
            }
          }
        }
      }

      // Add super-interfaces to queue
      const superInterfaces = this.hierarchy.getDirectInterfaceNames(ifaceName);
      for (const superIface of superInterfaces) {
        queue.push(superIface);
      }
    }

    return result;
  }

  /**
   * Resolves diamond inheritance by selecting the most specific method.
   */
  private resolveDiamond(signature: string, candidates: VTableEntry[]): VTableEntry {
    // Filter out abstract methods if there are concrete ones
    const concrete = candidates.filter(c => c.kind === 'internal' || c.kind === 'external');
    if (concrete.length === 1) {
      return concrete[0]!;
    }
    if (concrete.length > 1) {
      // Multiple concrete defaults - try to find most specific
      const mostSpecific = this.findMostSpecific(concrete);
      if (mostSpecific) {
        return mostSpecific;
      }
      // Unresolvable conflict
      return { kind: 'conflict', signature, candidates: concrete };
    }

    // All abstract - just pick the first one
    if (candidates.length > 0) {
      return candidates[0]!;
    }

    return { kind: 'abstract', signature, declaredIn: 'unknown' };
  }

  /**
   * Finds the most specific entry when one interface extends another.
   */
  private findMostSpecific(candidates: VTableEntry[]): VTableEntry | null {
    if (candidates.length === 0) {
      return null;
    }

    // For each candidate, check if its declaring class is a subtype of all others
    for (const candidate of candidates) {
      const candidateClass = this.getDeclaringClass(candidate);
      if (!candidateClass) {
        continue;
      }

      let isMostSpecific = true;
      for (const other of candidates) {
        if (other === candidate) {
          continue;
        }
        const otherClass = this.getDeclaringClass(other);
        if (!otherClass) {
          continue;
        }

        // candidate is most specific if it's a subtype of other
        if (!this.hierarchy.isSubtypeOf(candidateClass, otherClass)) {
          // Also check if other is NOT a subtype of candidate (to handle equal cases)
          if (candidateClass !== otherClass) {
            isMostSpecific = false;
            break;
          }
        }
      }

      if (isMostSpecific) {
        return candidate;
      }
    }

    return null;
  }

  private getDeclaringClass(entry: VTableEntry): string | null {
    switch (entry.kind) {
      case 'internal':
        return entry.method.declaringClass.name;
      case 'external':
        return entry.method.declaringClass.name;
      case 'abstract':
        return entry.declaredIn;
      case 'conflict':
        return null;
    }
  }

  private entriesEqual(a: VTableEntry, b: VTableEntry): boolean {
    if (a.kind !== b.kind) {
      return false;
    }
    switch (a.kind) {
      case 'internal':
        return b.kind === 'internal' && a.method.key.equals(b.method.key);
      case 'external':
        return b.kind === 'external' && a.method.key.equals(b.method.key);
      case 'abstract':
        return b.kind === 'abstract' && a.declaredIn === b.declaredIn && a.signature === b.signature;
      case 'conflict':
        return false; // Conflicts are never equal
    }
  }

  private isAnalysisClass(node: HierarchyNode): node is AnalysisClass {
    return 'classIR' in node;
  }
}
