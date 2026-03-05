import type { Type } from '@blkswn/java-asm';
import { MethodKey, FieldKey } from './keys';

/**
 * Represents a class that is referenced but not present in the analyzed program.
 * Used as a placeholder for classes from the JDK or other libraries.
 */
export class ExternalClass {
  /**
   * The internal name of the class.
   */
  public readonly name: string;

  /**
   * Methods that have been referenced on this external class.
   */
  private readonly _referencedMethods: Map<string, ExternalMethod> = new Map();

  /**
   * Fields that have been referenced on this external class.
   */
  private readonly _referencedFields: Map<string, ExternalField> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Gets or creates an external method reference.
   */
  public getOrCreateMethod(name: string, descriptor: string): ExternalMethod {
    const key = `${name}${descriptor}`;
    let method = this._referencedMethods.get(key);
    if (!method) {
      method = new ExternalMethod(this, name, descriptor);
      this._referencedMethods.set(key, method);
    }
    return method;
  }

  /**
   * Gets or creates an external field reference.
   */
  public getOrCreateField(name: string, descriptor: string): ExternalField {
    const key = `${name}:${descriptor}`;
    let field = this._referencedFields.get(key);
    if (!field) {
      field = new ExternalField(this, name, descriptor);
      this._referencedFields.set(key, field);
    }
    return field;
  }

  /**
   * Gets all referenced methods.
   */
  public get referencedMethods(): readonly ExternalMethod[] {
    return Array.from(this._referencedMethods.values());
  }

  /**
   * Gets all referenced fields.
   */
  public get referencedFields(): readonly ExternalField[] {
    return Array.from(this._referencedFields.values());
  }

  /**
   * Returns the class name in dotted format.
   */
  public getClassName(): string {
    return this.name.replace(/\//g, '.');
  }

  /**
   * External classes are treated as potentially non-final.
   */
  public isFinal(): boolean {
    return false;
  }

  /**
   * We don't know if external classes are interfaces.
   */
  public isInterface(): boolean {
    return false;
  }

  public toString(): string {
    return `ExternalClass(${this.getClassName()})`;
  }
}

/**
 * Represents a method on an external class.
 */
export class ExternalMethod {
  /**
   * The external class that owns this method.
   */
  public readonly declaringClass: ExternalClass;

  /**
   * The method name.
   */
  public readonly name: string;

  /**
   * The method descriptor.
   */
  public readonly descriptor: string;

  /**
   * The stable key for this method.
   */
  public readonly key: MethodKey;

  constructor(declaringClass: ExternalClass, name: string, descriptor: string) {
    this.declaringClass = declaringClass;
    this.name = name;
    this.descriptor = descriptor;
    this.key = new MethodKey(declaringClass.name, name, descriptor);
  }

  /**
   * Gets the signature (name + descriptor).
   */
  public getSignature(): string {
    return this.key.getSignature();
  }

  /**
   * External methods are conservatively assumed to be non-final.
   */
  public isFinal(): boolean {
    return false;
  }

  /**
   * External methods are conservatively assumed to be non-static.
   */
  public isStatic(): boolean {
    return false;
  }

  /**
   * External methods are conservatively assumed to be non-private.
   */
  public isPrivate(): boolean {
    return false;
  }

  public toString(): string {
    return `ExternalMethod(${this.declaringClass.name}.${this.name}${this.descriptor})`;
  }
}

/**
 * Represents a field on an external class.
 */
export class ExternalField {
  /**
   * The external class that owns this field.
   */
  public readonly declaringClass: ExternalClass;

  /**
   * The field name.
   */
  public readonly name: string;

  /**
   * The field descriptor.
   */
  public readonly descriptor: string;

  /**
   * The stable key for this field.
   */
  public readonly key: FieldKey;

  constructor(declaringClass: ExternalClass, name: string, descriptor: string) {
    this.declaringClass = declaringClass;
    this.name = name;
    this.descriptor = descriptor;
    this.key = new FieldKey(declaringClass.name, name, descriptor);
  }

  /**
   * External fields are conservatively assumed to be non-final.
   */
  public isFinal(): boolean {
    return false;
  }

  /**
   * External fields are conservatively assumed to be non-static.
   */
  public isStatic(): boolean {
    return false;
  }

  public toString(): string {
    return `ExternalField(${this.declaringClass.name}.${this.name}:${this.descriptor})`;
  }
}

/**
 * Type union for resolved method references.
 */
export type ResolvedMethodRef =
  | { kind: 'internal'; method: import('./AnalysisMethod').AnalysisMethod }
  | { kind: 'external'; method: ExternalMethod };

/**
 * Type union for resolved field references.
 */
export type ResolvedFieldRef =
  | { kind: 'internal'; field: import('./AnalysisField').AnalysisField }
  | { kind: 'external'; field: ExternalField };
