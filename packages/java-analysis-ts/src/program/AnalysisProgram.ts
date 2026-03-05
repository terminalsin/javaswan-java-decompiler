import type { AnalysisClass } from '../model/AnalysisClass';
import type { AnalysisMethod } from '../model/AnalysisMethod';
import type { AnalysisField } from '../model/AnalysisField';
import type { ExternalClass } from '../model/externals';
import type { DiagnosticsCollector } from '../model/diagnostics';
import type { ClassHierarchyGraph } from '../hierarchy/ClassHierarchyGraph';
import type { VirtualMethodTable } from '../hierarchy/VirtualMethodTableBuilder';
import type { CallGraph } from '../callgraph/CallGraph';

/**
 * The result of analyzing a set of classes.
 * Provides access to the resolved IR, hierarchy, call graph, and diagnostics.
 */
export class AnalysisProgram {
  /**
   * All analyzed classes indexed by internal name.
   */
  private readonly _classes: Map<string, AnalysisClass>;

  /**
   * All external classes indexed by internal name.
   */
  private readonly _externalClasses: Map<string, ExternalClass>;

  /**
   * The class hierarchy graph.
   */
  public readonly hierarchy: ClassHierarchyGraph;

  /**
   * Virtual method tables for all classes.
   */
  public readonly vtables: Map<string, VirtualMethodTable>;

  /**
   * The call graph.
   */
  public readonly callGraph: CallGraph;

  /**
   * Diagnostics from the analysis.
   */
  public readonly diagnostics: DiagnosticsCollector;

  constructor(
    classes: Map<string, AnalysisClass>,
    externalClasses: Map<string, ExternalClass>,
    hierarchy: ClassHierarchyGraph,
    vtables: Map<string, VirtualMethodTable>,
    callGraph: CallGraph,
    diagnostics: DiagnosticsCollector
  ) {
    this._classes = classes;
    this._externalClasses = externalClasses;
    this.hierarchy = hierarchy;
    this.vtables = vtables;
    this.callGraph = callGraph;
    this.diagnostics = diagnostics;
  }

  /**
   * Gets a class by internal name.
   */
  public getClass(name: string): AnalysisClass | undefined {
    return this._classes.get(name);
  }

  /**
   * Gets an external class by internal name.
   */
  public getExternalClass(name: string): ExternalClass | undefined {
    return this._externalClasses.get(name);
  }

  /**
   * Gets all analyzed classes.
   */
  public get classes(): ReadonlyMap<string, AnalysisClass> {
    return this._classes;
  }

  /**
   * Gets all external classes.
   */
  public get externalClasses(): ReadonlyMap<string, ExternalClass> {
    return this._externalClasses;
  }

  /**
   * Gets all methods in the program.
   */
  public getAllMethods(): AnalysisMethod[] {
    const methods: AnalysisMethod[] = [];
    for (const cls of this._classes.values()) {
      methods.push(...cls.methods);
    }
    return methods;
  }

  /**
   * Gets all fields in the program.
   */
  public getAllFields(): AnalysisField[] {
    const fields: AnalysisField[] = [];
    for (const cls of this._classes.values()) {
      fields.push(...cls.fields);
    }
    return fields;
  }

  /**
   * Gets the number of analyzed classes.
   */
  public get classCount(): number {
    return this._classes.size;
  }

  /**
   * Gets the number of external classes.
   */
  public get externalClassCount(): number {
    return this._externalClasses.size;
  }

  /**
   * Gets the total number of methods.
   */
  public get methodCount(): number {
    let count = 0;
    for (const cls of this._classes.values()) {
      count += cls.methods.length;
    }
    return count;
  }

  /**
   * Gets the total number of fields.
   */
  public get fieldCount(): number {
    let count = 0;
    for (const cls of this._classes.values()) {
      count += cls.fields.length;
    }
    return count;
  }

  /**
   * Gets a method by its key string.
   */
  public getMethodByKey(key: string): AnalysisMethod | undefined {
    // Key format: "owner.name descriptor"
    const dotIndex = key.indexOf('.');
    if (dotIndex === -1) {
      return undefined;
    }

    const owner = key.substring(0, dotIndex);
    const rest = key.substring(dotIndex + 1);
    
    const cls = this._classes.get(owner);
    if (!cls) {
      return undefined;
    }

    // Find method by matching name+descriptor
    for (const method of cls.methods) {
      if (`${method.name}${method.descriptor}` === rest) {
        return method;
      }
    }

    return undefined;
  }

  /**
   * Finds all classes that match a pattern (simple glob with *).
   */
  public findClasses(pattern: string): AnalysisClass[] {
    if (!pattern.includes('*')) {
      const cls = this._classes.get(pattern);
      return cls ? [cls] : [];
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const results: AnalysisClass[] = [];
    
    for (const [name, cls] of this._classes) {
      if (regex.test(name)) {
        results.push(cls);
      }
    }

    return results;
  }

  /**
   * Gets statistics about the analysis.
   */
  public getStatistics(): ProgramStatistics {
    let totalBlocks = 0;
    let totalStatements = 0;

    for (const cls of this._classes.values()) {
      for (const method of cls.methods) {
        if (method.cfg) {
          totalBlocks += method.cfg.blocks.length;
          for (const block of method.cfg.blocks) {
            totalStatements += block.statements.length;
          }
        }
      }
    }

    return {
      classCount: this._classes.size,
      externalClassCount: this._externalClasses.size,
      methodCount: this.methodCount,
      fieldCount: this.fieldCount,
      blockCount: totalBlocks,
      statementCount: totalStatements,
      callSiteCount: this.callGraph.callSiteCount,
      callEdgeCount: this.callGraph.edgeCount,
      diagnosticCount: this.diagnostics.count,
    };
  }
}

/**
 * Statistics about an analysis program.
 */
export interface ProgramStatistics {
  classCount: number;
  externalClassCount: number;
  methodCount: number;
  fieldCount: number;
  blockCount: number;
  statementCount: number;
  callSiteCount: number;
  callEdgeCount: number;
  diagnosticCount: number;
}
