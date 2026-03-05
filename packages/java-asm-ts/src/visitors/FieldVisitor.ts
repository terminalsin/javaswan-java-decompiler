import { ASM9 } from '../core/Opcodes';
import type { AnnotationVisitor } from './AnnotationVisitor';
import type { Attribute } from '../attributes/Attribute';
import type { TypePath } from '../core/TypePath';

/**
 * A visitor to visit a Java field. The methods of this class must be called in the following order:
 * ( visitAnnotation | visitTypeAnnotation | visitAttribute )* visitEnd.
 */
export abstract class FieldVisitor {
  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /** The field visitor to which this visitor must delegate method calls. May be null. */
  protected fv: FieldVisitor | null;

  /**
   * Constructs a new FieldVisitor.
   * @param api the ASM API version (ASM4 to ASM9)
   * @param fieldVisitor the field visitor to delegate to
   */
  constructor(api: number, fieldVisitor: FieldVisitor | null = null) {
    if (api !== ASM9 && (api < 0x40000 || api > 0x90100)) {
      throw new Error('Unsupported API version: ' + api);
    }
    this.api = api;
    this.fv = fieldVisitor;
  }

  /**
   * Returns the delegate field visitor.
   */
  getDelegate(): FieldVisitor | null {
    return this.fv;
  }

  /**
   * Visits an annotation of the field.
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if the annotation is visible at runtime
   * @returns a visitor to visit the annotation values, or null if not interested
   */
  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    if (this.fv !== null) {
      return this.fv.visitAnnotation(descriptor, visible);
    }
    return null;
  }

  /**
   * Visits an annotation on the type of the field.
   * @param typeRef a reference to the annotated type
   * @param typePath the path to the annotated type argument (or null)
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if the annotation is visible at runtime
   * @returns a visitor to visit the annotation values, or null if not interested
   */
  visitTypeAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.fv !== null) {
      return this.fv.visitTypeAnnotation(typeRef, typePath, descriptor, visible);
    }
    return null;
  }

  /**
   * Visits a non standard attribute of the field.
   * @param attribute an attribute
   */
  visitAttribute(attribute: Attribute): void {
    this.fv?.visitAttribute(attribute);
  }

  /**
   * Visits the end of the field. This method, which is the last one to be called, is used to
   * inform the visitor that all the annotations and attributes of the field have been visited.
   */
  visitEnd(): void {
    this.fv?.visitEnd();
  }
}
