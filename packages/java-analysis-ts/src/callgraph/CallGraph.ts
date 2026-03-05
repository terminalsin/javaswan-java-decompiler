import type { AnalysisMethod } from '../model/AnalysisMethod';
import type { ExternalMethod, ResolvedMethodRef } from '../model/externals';

/**
 * Represents a call site in the program.
 */
export interface CallSite {
  /**
   * The method containing this call site.
   */
  readonly caller: AnalysisMethod;

  /**
   * The block index containing the call.
   */
  readonly blockIndex: number;

  /**
   * The statement index within the block.
   */
  readonly stmtIndex: number;

  /**
   * The declared callee (link-time resolution).
   */
  readonly declaredCallee: ResolvedMethodRef;

  /**
   * Possible runtime targets (for virtual/interface calls).
   */
  readonly possibleTargets: readonly ResolvedMethodRef[];

  /**
   * Whether this is a static call.
   */
  readonly isStatic: boolean;

  /**
   * Whether this is a special call (constructor, super, private).
   */
  readonly isSpecial: boolean;
}

/**
 * Edge in the call graph.
 */
export interface CallEdge {
  /**
   * The call site that creates this edge.
   */
  readonly callSite: CallSite;

  /**
   * The target method.
   */
  readonly target: ResolvedMethodRef;
}

/**
 * Represents the call graph of the analyzed program.
 */
export class CallGraph {
  /**
   * All call sites in the program, indexed by caller method key.
   */
  private readonly callSitesByCaller: Map<string, CallSite[]> = new Map();

  /**
   * Edges from callers to callees.
   */
  private readonly outgoingEdges: Map<string, CallEdge[]> = new Map();

  /**
   * Reverse edges from callees to callers.
   */
  private readonly incomingEdges: Map<string, CallEdge[]> = new Map();

  /**
   * All methods that are reachable (have call sites or are called).
   */
  private readonly reachableMethods: Set<string> = new Set();

  /**
   * Adds a call site to the graph.
   */
  public addCallSite(callSite: CallSite): void {
    const callerKey = callSite.caller.key.toString();
    this.reachableMethods.add(callerKey);

    // Index by caller
    let callerSites = this.callSitesByCaller.get(callerKey);
    if (!callerSites) {
      callerSites = [];
      this.callSitesByCaller.set(callerKey, callerSites);
    }
    callerSites.push(callSite);

    // Create edges to all possible targets
    for (const target of callSite.possibleTargets) {
      this.addEdge(callSite, target);
    }

    // If no possible targets but has a declared callee, add edge to declared
    if (callSite.possibleTargets.length === 0) {
      this.addEdge(callSite, callSite.declaredCallee);
    }
  }

  private addEdge(callSite: CallSite, target: ResolvedMethodRef): void {
    const callerKey = callSite.caller.key.toString();
    const targetKey = target.kind === 'internal' 
      ? target.method.key.toString() 
      : target.method.key.toString();

    this.reachableMethods.add(targetKey);

    const edge: CallEdge = { callSite, target };

    // Outgoing edge
    let outgoing = this.outgoingEdges.get(callerKey);
    if (!outgoing) {
      outgoing = [];
      this.outgoingEdges.set(callerKey, outgoing);
    }
    outgoing.push(edge);

    // Incoming edge
    let incoming = this.incomingEdges.get(targetKey);
    if (!incoming) {
      incoming = [];
      this.incomingEdges.set(targetKey, incoming);
    }
    incoming.push(edge);
  }

  /**
   * Gets all call sites in a method.
   */
  public getCallSites(method: AnalysisMethod): readonly CallSite[] {
    return this.callSitesByCaller.get(method.key.toString()) ?? [];
  }

  /**
   * Gets all outgoing edges from a method.
   */
  public getOutgoingEdges(method: AnalysisMethod): readonly CallEdge[] {
    return this.outgoingEdges.get(method.key.toString()) ?? [];
  }

  /**
   * Gets all incoming edges to a method.
   */
  public getIncomingEdges(methodKey: string): readonly CallEdge[] {
    return this.incomingEdges.get(methodKey) ?? [];
  }

  /**
   * Gets all methods that directly call the given method.
   */
  public getCallers(methodKey: string): AnalysisMethod[] {
    const edges = this.incomingEdges.get(methodKey) ?? [];
    const seen = new Set<string>();
    const result: AnalysisMethod[] = [];

    for (const edge of edges) {
      const callerKey = edge.callSite.caller.key.toString();
      if (!seen.has(callerKey)) {
        seen.add(callerKey);
        result.push(edge.callSite.caller);
      }
    }

    return result;
  }

  /**
   * Gets all methods that are directly called by the given method.
   */
  public getCallees(method: AnalysisMethod): ResolvedMethodRef[] {
    const edges = this.outgoingEdges.get(method.key.toString()) ?? [];
    const seen = new Set<string>();
    const result: ResolvedMethodRef[] = [];

    for (const edge of edges) {
      const targetKey = edge.target.kind === 'internal'
        ? edge.target.method.key.toString()
        : edge.target.method.key.toString();

      if (!seen.has(targetKey)) {
        seen.add(targetKey);
        result.push(edge.target);
      }
    }

    return result;
  }

  /**
   * Checks if a method is reachable in the call graph.
   */
  public isReachable(methodKey: string): boolean {
    return this.reachableMethods.has(methodKey);
  }

  /**
   * Gets the total number of call sites.
   */
  public get callSiteCount(): number {
    let count = 0;
    for (const sites of this.callSitesByCaller.values()) {
      count += sites.length;
    }
    return count;
  }

  /**
   * Gets the total number of edges.
   */
  public get edgeCount(): number {
    let count = 0;
    for (const edges of this.outgoingEdges.values()) {
      count += edges.length;
    }
    return count;
  }

  /**
   * Gets the number of reachable methods.
   */
  public get reachableMethodCount(): number {
    return this.reachableMethods.size;
  }

  /**
   * Gets all reachable method keys.
   */
  public getReachableMethodKeys(): ReadonlySet<string> {
    return this.reachableMethods;
  }
}

/**
 * Result of a call tree traversal.
 */
export interface CallTreeNode {
  /**
   * The method at this node.
   */
  readonly method: ResolvedMethodRef;

  /**
   * The depth in the call tree.
   */
  readonly depth: number;

  /**
   * Children (callees).
   */
  readonly children: CallTreeNode[];

  /**
   * Whether this node was truncated due to cycles or depth limit.
   */
  readonly truncated: boolean;
}

/**
 * Builds call trees for traversal.
 */
export class CallTreeBuilder {
  private readonly callGraph: CallGraph;
  private readonly maxDepth: number;

  constructor(callGraph: CallGraph, maxDepth: number = 10) {
    this.callGraph = callGraph;
    this.maxDepth = maxDepth;
  }

  /**
   * Builds a call tree rooted at the given method.
   */
  public buildTree(root: AnalysisMethod): CallTreeNode {
    const visited = new Set<string>();
    return this.buildNode({ kind: 'internal', method: root }, 0, visited);
  }

  private buildNode(
    methodRef: ResolvedMethodRef,
    depth: number,
    visited: Set<string>
  ): CallTreeNode {
    const key = methodRef.kind === 'internal'
      ? methodRef.method.key.toString()
      : methodRef.method.key.toString();

    // Check for cycles or depth limit
    if (visited.has(key) || depth >= this.maxDepth) {
      return {
        method: methodRef,
        depth,
        children: [],
        truncated: true,
      };
    }

    visited.add(key);

    const children: CallTreeNode[] = [];

    // Only internal methods have call sites we can traverse
    if (methodRef.kind === 'internal') {
      const callees = this.callGraph.getCallees(methodRef.method);
      for (const callee of callees) {
        children.push(this.buildNode(callee, depth + 1, new Set(visited)));
      }
    }

    return {
      method: methodRef,
      depth,
      children,
      truncated: false,
    };
  }

  /**
   * Builds a reverse call tree (callers instead of callees).
   */
  public buildReverseTree(methodKey: string): CallTreeNode | null {
    const visited = new Set<string>();
    return this.buildReverseNode(methodKey, 0, visited);
  }

  private buildReverseNode(
    methodKey: string,
    depth: number,
    visited: Set<string>
  ): CallTreeNode | null {
    if (visited.has(methodKey) || depth >= this.maxDepth) {
      return null;
    }

    visited.add(methodKey);

    const callers = this.callGraph.getCallers(methodKey);
    const children: CallTreeNode[] = [];

    for (const caller of callers) {
      const child = this.buildReverseNode(caller.key.toString(), depth + 1, new Set(visited));
      if (child) {
        children.push(child);
      }
    }

    // We don't have the actual method ref here, just the key
    // Return null if no callers found
    if (callers.length === 0 && depth > 0) {
      return null;
    }

    // Create a placeholder node
    return {
      method: callers[0] ? { kind: 'internal', method: callers[0] } : null as any,
      depth,
      children,
      truncated: depth >= this.maxDepth,
    };
  }
}
