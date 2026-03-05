import type { AnnotationIR } from './AnnotationIR';
import { FieldIR } from './FieldIR';
import { MethodIR } from './MethodIR';

/**
 * Represents a class in the IR.
 */
export class ClassIR {
  /**
   * The class version (major.minor).
   */
  public readonly version: number;

  /**
   * The class access flags.
   */
  public readonly access: number;

  /**
   * The internal name of this class.
   */
  public readonly name: string;

  /**
   * The class signature (for generics).
   */
  public readonly signature: string | null;

  /**
   * The internal name of the superclass.
   */
  public readonly superName: string | null;

  /**
   * The internal names of implemented interfaces.
   */
  public readonly interfaces: readonly string[];

  /**
   * The source file name.
   */
  public sourceFile: string | null = null;

  /**
   * The fields.
   */
  public readonly fields: FieldIR[] = [];

  /**
   * The methods.
   */
  public readonly methods: MethodIR[] = [];

  /**
   * Annotations on this class.
   */
  public readonly annotations: AnnotationIR[] = [];

  /**
   * Inner class information.
   */
  public readonly innerClasses: InnerClassInfo[] = [];

  constructor(
    version: number,
    access: number,
    name: string,
    signature: string | null,
    superName: string | null,
    interfaces: readonly string[]
  ) {
    this.version = version;
    this.access = access;
    this.name = name;
    this.signature = signature;
    this.superName = superName;
    this.interfaces = interfaces;
  }

  /**
   * Returns the major version.
   */
  public getMajorVersion(): number {
    return this.version & 0xFFFF;
  }

  /**
   * Returns the minor version.
   */
  public getMinorVersion(): number {
    return (this.version >>> 16) & 0xFFFF;
  }

  /**
   * Returns whether this is an interface.
   */
  public isInterface(): boolean {
    return (this.access & 0x0200) !== 0;
  }

  /**
   * Returns whether this is an abstract class.
   */
  public isAbstract(): boolean {
    return (this.access & 0x0400) !== 0;
  }

  /**
   * Returns whether this is a final class.
   */
  public isFinal(): boolean {
    return (this.access & 0x0010) !== 0;
  }

  /**
   * Returns whether this is an enum.
   */
  public isEnum(): boolean {
    return (this.access & 0x4000) !== 0;
  }

  /**
   * Returns whether this is an annotation.
   */
  public isAnnotation(): boolean {
    return (this.access & 0x2000) !== 0;
  }

  /**
   * Returns whether this is public.
   */
  public isPublic(): boolean {
    return (this.access & 0x0001) !== 0;
  }

  /**
   * Adds a field to this class.
   */
  public addField(field: FieldIR): void {
    this.fields.push(field);
  }

  /**
   * Adds a method to this class.
   */
  public addMethod(method: MethodIR): void {
    this.methods.push(method);
  }

  /**
   * Adds an inner class entry.
   */
  public addInnerClass(innerClass: InnerClassInfo): void {
    this.innerClasses.push(innerClass);
  }

  /**
   * Gets a method by name and descriptor.
   */
  public getMethod(name: string, descriptor: string): MethodIR | undefined {
    return this.methods.find(m => m.name === name && m.descriptor === descriptor);
  }

  /**
   * Gets a field by name.
   */
  public getField(name: string): FieldIR | undefined {
    return this.fields.find(f => f.name === name);
  }

  /**
   * Returns the class name in dotted format.
   */
  public getClassName(): string {
    return this.name.replace(/\//g, '.');
  }

  public toString(): string {
    return `class ${this.getClassName()}`;
  }
}

/**
 * Inner class information.
 */
export interface InnerClassInfo {
  /**
   * The internal name of the inner class.
   */
  readonly name: string;

  /**
   * The internal name of the outer class.
   */
  readonly outerName: string | null;

  /**
   * The simple name of the inner class.
   */
  readonly innerName: string | null;

  /**
   * The access flags of the inner class.
   */
  readonly access: number;
}
