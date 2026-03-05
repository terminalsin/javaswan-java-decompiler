import type { AnalysisClass } from '../model/AnalysisClass';
import type { ExternalClass } from '../model/externals';

/**
 * A node in the class hierarchy graph.
 */
export type HierarchyNode = AnalysisClass | ExternalClass;

/**
 * Represents the class hierarchy graph for the analyzed program.
 * Provides queries for superclass/interface relationships.
 */
export class ClassHierarchyGraph {
  /**
   * Map from internal class name to hierarchy node.
   */
  private readonly nodesByName: Map<string, HierarchyNode> = new Map();

  /**
   * Direct superclass relationships (child -> parent).
   */
  private readonly superclassEdges: Map<string, string | null> = new Map();

  /**
   * Direct interface implementations (class -> interfaces).
   */
  private readonly interfaceEdges: Map<string, Set<string>> = new Map();

  /**
   * Reverse: parent -> children (direct subclasses/implementors).
   */
  private readonly childrenEdges: Map<string, Set<string>> = new Map();

  /**
   * Cache for getAllSupertypes.
   */
  private readonly supertypesCache: Map<string, Set<string>> = new Map();

  /**
   * Cache for getAllSubtypes.
   */
  private readonly subtypesCache: Map<string, Set<string>> = new Map();

  /**
   * Registers a node in the hierarchy.
   */
  public addNode(node: HierarchyNode): void {
    this.nodesByName.set(node.name, node);
  }

  /**
   * Sets the superclass relationship for a class.
   */
  public setSuperclass(className: string, superClassName: string | null): void {
    this.superclassEdges.set(className, superClassName);

    if (superClassName !== null) {
      let children = this.childrenEdges.get(superClassName);
      if (!children) {
        children = new Set();
        this.childrenEdges.set(superClassName, children);
      }
      children.add(className);
    }

    // Invalidate caches
    this.supertypesCache.delete(className);
    this.subtypesCache.clear();
  }

  /**
   * Adds an interface implementation relationship.
   */
  public addInterface(className: string, interfaceName: string): void {
    let interfaces = this.interfaceEdges.get(className);
    if (!interfaces) {
      interfaces = new Set();
      this.interfaceEdges.set(className, interfaces);
    }
    interfaces.add(interfaceName);

    let children = this.childrenEdges.get(interfaceName);
    if (!children) {
      children = new Set();
      this.childrenEdges.set(interfaceName, children);
    }
    children.add(className);

    // Invalidate caches
    this.supertypesCache.delete(className);
    this.subtypesCache.clear();
  }

  /**
   * Gets a node by name.
   */
  public getNode(name: string): HierarchyNode | undefined {
    return this.nodesByName.get(name);
  }

  /**
   * Checks if a class exists in the hierarchy.
   */
  public hasClass(name: string): boolean {
    return this.nodesByName.has(name);
  }

  /**
   * Gets the direct superclass name (null for java/lang/Object or unknown).
   */
  public getSuperClassName(className: string): string | null {
    return this.superclassEdges.get(className) ?? null;
  }

  /**
   * Gets the direct superclass node.
   */
  public getSuperClass(className: string): HierarchyNode | undefined {
    const superName = this.getSuperClassName(className);
    return superName ? this.nodesByName.get(superName) : undefined;
  }

  /**
   * Gets the direct interface names for a class.
   */
  public getDirectInterfaceNames(className: string): ReadonlySet<string> {
    return this.interfaceEdges.get(className) ?? new Set();
  }

  /**
   * Gets the direct interface nodes for a class.
   */
  public getDirectInterfaces(className: string): HierarchyNode[] {
    const names = this.getDirectInterfaceNames(className);
    return Array.from(names)
      .map(name => this.nodesByName.get(name))
      .filter((n): n is HierarchyNode => n !== undefined);
  }

  /**
   * Gets all direct children (subclasses and implementors).
   */
  public getDirectChildren(className: string): ReadonlySet<string> {
    return this.childrenEdges.get(className) ?? new Set();
  }

  /**
   * Gets all supertypes (transitive closure of superclass + interfaces).
   * Includes the class itself.
   */
  public getAllSupertypes(className: string): ReadonlySet<string> {
    const cached = this.supertypesCache.get(className);
    if (cached) {
      return cached;
    }

    const result = new Set<string>();
    const queue = [className];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (result.has(current)) {
        continue;
      }
      result.add(current);

      // Add superclass
      const superName = this.superclassEdges.get(current);
      if (superName) {
        queue.push(superName);
      }

      // Add interfaces
      const interfaces = this.interfaceEdges.get(current);
      if (interfaces) {
        for (const iface of interfaces) {
          queue.push(iface);
        }
      }
    }

    this.supertypesCache.set(className, result);
    return result;
  }

  /**
   * Gets all subtypes (transitive closure of subclasses + implementors).
   * Includes the class itself.
   */
  public getAllSubtypes(className: string): ReadonlySet<string> {
    const cached = this.subtypesCache.get(className);
    if (cached) {
      return cached;
    }

    const result = new Set<string>();
    const queue = [className];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (result.has(current)) {
        continue;
      }
      result.add(current);

      // Add all children
      const children = this.childrenEdges.get(current);
      if (children) {
        for (const child of children) {
          queue.push(child);
        }
      }
    }

    this.subtypesCache.set(className, result);
    return result;
  }

  /**
   * Checks if `subtype` is a subtype of `supertype` (including equality).
   */
  public isSubtypeOf(subtype: string, supertype: string): boolean {
    if (subtype === supertype) {
      return true;
    }
    return this.getAllSupertypes(subtype).has(supertype);
  }

  /**
   * Gets the chain of superclasses from class to java/lang/Object.
   */
  public getSuperclassChain(className: string): string[] {
    const result: string[] = [];
    let current: string | null = className;

    while (current !== null) {
      result.push(current);
      current = this.superclassEdges.get(current) ?? null;
    }

    return result;
  }

  /**
   * Gets all nodes in the hierarchy.
   */
  public getAllNodes(): IterableIterator<HierarchyNode> {
    return this.nodesByName.values();
  }

  /**
   * Gets all class names in the hierarchy.
   */
  public getAllClassNames(): IterableIterator<string> {
    return this.nodesByName.keys();
  }

  /**
   * Gets the number of nodes in the hierarchy.
   */
  public get size(): number {
    return this.nodesByName.size;
  }
}
