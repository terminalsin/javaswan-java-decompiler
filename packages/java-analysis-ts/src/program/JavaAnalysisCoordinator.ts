import type { ClassIR } from '@blkswn/java-ir';
import { AnalysisClass } from '../model/AnalysisClass';
import { AnalysisMethod } from '../model/AnalysisMethod';
import { AnalysisField } from '../model/AnalysisField';
import type { ExternalClass } from '../model/externals';
import { DiagnosticsCollector, UnresolvedClassDiagnostic } from '../model/diagnostics';
import { ClassHierarchyGraph } from '../hierarchy/ClassHierarchyGraph';
import { VirtualMethodTableBuilder, type VirtualMethodTable } from '../hierarchy/VirtualMethodTableBuilder';
import { MethodReferenceResolver } from '../resolution/MethodReferenceResolver';
import { FieldReferenceResolver } from '../resolution/FieldReferenceResolver';
import { IRResolutionTransformer } from '../ir/IRResolutionTransformer';
import { CallGraph } from '../callgraph/CallGraph';
import { CallGraphBuilder } from '../callgraph/CallGraphBuilder';
import { AnalysisProgram } from './AnalysisProgram';

/**
 * Options for the analysis coordinator.
 */
export interface AnalysisOptions {
  /**
   * Whether to resolve method and field references.
   * Default: true
   */
  resolveReferences?: boolean;

  /**
   * Whether to build the call graph.
   * Default: true
   */
  buildCallGraph?: boolean;

  /**
   * Whether to suppress diagnostics for common JDK classes.
   * Default: true
   */
  suppressJdkDiagnostics?: boolean;
}

const DEFAULT_OPTIONS: Required<AnalysisOptions> = {
  resolveReferences: true,
  buildCallGraph: true,
  suppressJdkDiagnostics: true,
};

/**
 * Coordinates the analysis pipeline.
 * 
 * Pipeline stages:
 * 1. Build class index (AnalysisClass wrappers)
 * 2. Build hierarchy graph
 * 3. Build virtual method tables
 * 4. Resolve references (transform IR)
 * 5. Build call graph
 */
export class JavaAnalysisCoordinator {
  private readonly options: Required<AnalysisOptions>;

  constructor(options: AnalysisOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Analyzes a set of classes.
   */
  public analyze(classIRs: readonly ClassIR[]): AnalysisProgram {
    const diagnostics = new DiagnosticsCollector();

    // Stage 1: Build class index
    const classes = this.buildClassIndex(classIRs);

    // Stage 2: Build hierarchy
    const hierarchy = this.buildHierarchy(classes, diagnostics);

    // Stage 3: Build virtual method tables
    const vtableBuilder = new VirtualMethodTableBuilder(hierarchy, diagnostics);
    const vtables = vtableBuilder.buildAll();

    // Stage 4: Resolve references
    let externalClasses = new Map<string, ExternalClass>();
    if (this.options.resolveReferences) {
      externalClasses = this.resolveReferences(classes, hierarchy, vtables, diagnostics);
    }

    // Stage 5: Build call graph
    let callGraph = new CallGraph();
    if (this.options.buildCallGraph && this.options.resolveReferences) {
      const allMethods: AnalysisMethod[] = [];
      for (const cls of classes.values()) {
        allMethods.push(...cls.methods);
      }
      const cgBuilder = new CallGraphBuilder();
      callGraph = cgBuilder.build(allMethods);
    }

    return new AnalysisProgram(
      classes,
      externalClasses,
      hierarchy,
      vtables,
      callGraph,
      diagnostics
    );
  }

  /**
   * Builds the class index.
   */
  private buildClassIndex(classIRs: readonly ClassIR[]): Map<string, AnalysisClass> {
    const classes = new Map<string, AnalysisClass>();

    for (const classIR of classIRs) {
      const analysisClass = new AnalysisClass(classIR);

      // Wrap methods
      for (const methodIR of classIR.methods) {
        const analysisMethod = new AnalysisMethod(methodIR, analysisClass);
        analysisClass.addMethod(analysisMethod);
      }

      // Wrap fields
      for (const fieldIR of classIR.fields) {
        const analysisField = new AnalysisField(fieldIR, analysisClass);
        analysisClass.addField(analysisField);
      }

      classes.set(classIR.name, analysisClass);
    }

    return classes;
  }

  /**
   * Builds the class hierarchy.
   */
  private buildHierarchy(
    classes: Map<string, AnalysisClass>,
    diagnostics: DiagnosticsCollector
  ): ClassHierarchyGraph {
    const hierarchy = new ClassHierarchyGraph();

    // Add all nodes
    for (const cls of classes.values()) {
      hierarchy.addNode(cls);
    }

    // Add edges
    for (const cls of classes.values()) {
      // Superclass edge
      if (cls.superName) {
        hierarchy.setSuperclass(cls.name, cls.superName);

        // Check if superclass exists
        if (!classes.has(cls.superName) && !this.isJdkClass(cls.superName)) {
          diagnostics.add(new UnresolvedClassDiagnostic(cls.superName, cls.name));
        }
      } else {
        hierarchy.setSuperclass(cls.name, null);
      }

      // Interface edges
      for (const iface of cls.interfaces) {
        hierarchy.addInterface(cls.name, iface);

        // Check if interface exists
        if (!classes.has(iface) && !this.isJdkClass(iface)) {
          diagnostics.add(new UnresolvedClassDiagnostic(iface, cls.name));
        }
      }
    }

    return hierarchy;
  }

  /**
   * Resolves method and field references.
   */
  private resolveReferences(
    classes: Map<string, AnalysisClass>,
    hierarchy: ClassHierarchyGraph,
    vtables: Map<string, VirtualMethodTable>,
    diagnostics: DiagnosticsCollector
  ): Map<string, ExternalClass> {
    const methodResolver = new MethodReferenceResolver(hierarchy, vtables, diagnostics);
    const fieldResolver = new FieldReferenceResolver(hierarchy, diagnostics);
    const transformer = new IRResolutionTransformer(methodResolver, fieldResolver);

    // Transform all methods
    for (const cls of classes.values()) {
      for (const method of cls.methods) {
        transformer.transformMethod(method);
      }
    }

    // Collect external classes
    const externalClasses = new Map<string, ExternalClass>();
    for (const [name, ext] of methodResolver.getExternalClasses()) {
      externalClasses.set(name, ext);
    }
    for (const [name, ext] of fieldResolver.getExternalClasses()) {
      if (!externalClasses.has(name)) {
        externalClasses.set(name, ext);
      }
    }

    return externalClasses;
  }

  /**
   * Checks if a class name is a JDK class.
   */
  private isJdkClass(name: string): boolean {
    if (!this.options.suppressJdkDiagnostics) {
      return false;
    }

    return (
      name.startsWith('java/') ||
      name.startsWith('javax/') ||
      name.startsWith('sun/') ||
      name.startsWith('com/sun/') ||
      name.startsWith('jdk/')
    );
  }
}
