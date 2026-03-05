import type { ClassIR } from '@blkswn/java-ir';
import type { AnalysisMethod } from './AnalysisMethod';
import type { AnalysisField } from './AnalysisField';

/**
 * Wrapper around ClassIR that provides analysis-specific functionality.
 * Maintains references to resolved methods and fields.
 */
export class AnalysisClass {
  /**
   * The underlying ClassIR.
   */
  public readonly classIR: ClassIR;

  /**
   * The internal name of this class (e.g., "java/lang/Object").
   */
  public readonly name: string;

  /**
   * Analyzed methods belonging to this class.
   */
  private _methods: AnalysisMethod[] = [];

  /**
   * Analyzed fields belonging to this class.
   */
  private _fields: AnalysisField[] = [];

  constructor(classIR: ClassIR) {
    this.classIR = classIR;
    this.name = classIR.name;
  }

  /**
   * Gets the methods of this class.
   */
  public get methods(): readonly AnalysisMethod[] {
    return this._methods;
  }

  /**
   * Gets the fields of this class.
   */
  public get fields(): readonly AnalysisField[] {
    return this._fields;
  }

  /**
   * Adds a method to this class (called during analysis setup).
   */
  public addMethod(method: AnalysisMethod): void {
    this._methods.push(method);
  }

  /**
   * Adds a field to this class (called during analysis setup).
   */
  public addField(field: AnalysisField): void {
    this._fields.push(field);
  }

  /**
   * Gets the internal name of the superclass, or null for java/lang/Object.
   */
  public get superName(): string | null {
    return this.classIR.superName;
  }

  /**
   * Gets the internal names of directly implemented interfaces.
   */
  public get interfaces(): readonly string[] {
    return this.classIR.interfaces;
  }

  /**
   * Returns whether this is an interface.
   */
  public isInterface(): boolean {
    return this.classIR.isInterface();
  }

  /**
   * Returns whether this is an abstract class.
   */
  public isAbstract(): boolean {
    return this.classIR.isAbstract();
  }

  /**
   * Returns whether this is a final class.
   */
  public isFinal(): boolean {
    return this.classIR.isFinal();
  }

  /**
   * Returns whether this is public.
   */
  public isPublic(): boolean {
    return this.classIR.isPublic();
  }

  /**
   * Gets the access flags.
   */
  public get access(): number {
    return this.classIR.access;
  }

  /**
   * Returns the class name in dotted format.
   */
  public getClassName(): string {
    return this.name.replace(/\//g, '.');
  }

  /**
   * Finds a method by name and descriptor.
   */
  public getMethod(name: string, descriptor: string): AnalysisMethod | undefined {
    return this._methods.find(m => m.name === name && m.descriptor === descriptor);
  }

  /**
   * Finds a field by name.
   */
  public getField(name: string): AnalysisField | undefined {
    return this._fields.find(f => f.name === name);
  }

  public toString(): string {
    return `AnalysisClass(${this.getClassName()})`;
  }
}
