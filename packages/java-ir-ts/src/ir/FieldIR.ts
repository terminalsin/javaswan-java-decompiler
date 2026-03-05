import type { Type } from '@blkswn/java-asm';
import type { AnnotationIR } from './AnnotationIR';

/**
 * Represents a field in the IR.
 */
export class FieldIR {
  /**
   * The field access flags.
   */
  public readonly access: number;

  /**
   * The field name.
   */
  public readonly name: string;

  /**
   * The field descriptor.
   */
  public readonly descriptor: string;

  /**
   * The field type.
   */
  public readonly type: Type;

  /**
   * The field signature (for generics).
   */
  public readonly signature: string | null;

  /**
   * The initial value (for static final fields).
   */
  public readonly initialValue: unknown;

  /**
   * Annotations on this field.
   */
  public readonly annotations: AnnotationIR[] = [];

  constructor(
    access: number,
    name: string,
    descriptor: string,
    type: Type,
    signature: string | null,
    initialValue: unknown
  ) {
    this.access = access;
    this.name = name;
    this.descriptor = descriptor;
    this.type = type;
    this.signature = signature;
    this.initialValue = initialValue;
  }

  /**
   * Returns whether this field is static.
   */
  public isStatic(): boolean {
    return (this.access & 0x0008) !== 0;
  }

  /**
   * Returns whether this field is final.
   */
  public isFinal(): boolean {
    return (this.access & 0x0010) !== 0;
  }

  /**
   * Returns whether this field is public.
   */
  public isPublic(): boolean {
    return (this.access & 0x0001) !== 0;
  }

  /**
   * Returns whether this field is private.
   */
  public isPrivate(): boolean {
    return (this.access & 0x0002) !== 0;
  }

  /**
   * Returns whether this field is protected.
   */
  public isProtected(): boolean {
    return (this.access & 0x0004) !== 0;
  }

  /**
   * Returns whether this field is an enum constant (ACC_ENUM).
   */
  public isEnum(): boolean {
    return (this.access & 0x4000) !== 0;
  }

  /**
   * Returns whether this field is synthetic (compiler-generated).
   */
  public isSynthetic(): boolean {
    return (this.access & 0x1000) !== 0;
  }

  public toString(): string {
    return `${this.name}: ${this.type.getClassName()}`;
  }
}
