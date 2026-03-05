import type { FieldIR } from '@blkswn/java-ir';
import type { Type } from '@blkswn/java-asm';
import { FieldKey } from './keys';
import type { AnalysisClass } from './AnalysisClass';

/**
 * Wrapper around FieldIR that provides analysis-specific functionality.
 */
export class AnalysisField {
  /**
   * The underlying FieldIR.
   */
  public readonly fieldIR: FieldIR;

  /**
   * The class that declares this field.
   */
  public readonly declaringClass: AnalysisClass;

  /**
   * The stable key for this field.
   */
  public readonly key: FieldKey;

  constructor(fieldIR: FieldIR, declaringClass: AnalysisClass) {
    this.fieldIR = fieldIR;
    this.declaringClass = declaringClass;
    this.key = new FieldKey(declaringClass.name, fieldIR.name, fieldIR.descriptor);
  }

  /**
   * Gets the field name.
   */
  public get name(): string {
    return this.fieldIR.name;
  }

  /**
   * Gets the field descriptor.
   */
  public get descriptor(): string {
    return this.fieldIR.descriptor;
  }

  /**
   * Gets the field type.
   */
  public get type(): Type {
    return this.fieldIR.type;
  }

  /**
   * Gets the access flags.
   */
  public get access(): number {
    return this.fieldIR.access;
  }

  /**
   * Gets the initial value (for static final fields).
   */
  public get initialValue(): unknown {
    return this.fieldIR.initialValue;
  }

  /**
   * Returns whether this field is static.
   */
  public isStatic(): boolean {
    return this.fieldIR.isStatic();
  }

  /**
   * Returns whether this field is final.
   */
  public isFinal(): boolean {
    return this.fieldIR.isFinal();
  }

  /**
   * Returns whether this field is public.
   */
  public isPublic(): boolean {
    return this.fieldIR.isPublic();
  }

  /**
   * Returns whether this field is private.
   */
  public isPrivate(): boolean {
    return this.fieldIR.isPrivate();
  }

  /**
   * Returns whether this field is protected.
   */
  public isProtected(): boolean {
    return this.fieldIR.isProtected();
  }

  public toString(): string {
    return `AnalysisField(${this.declaringClass.name}.${this.name}:${this.descriptor})`;
  }
}
