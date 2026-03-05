import { ASM9 } from '../core/Opcodes';
import type { AnnotationVisitor } from './AnnotationVisitor';
import type { Attribute } from '../attributes/Attribute';
import type { TypePath } from '../core/TypePath';

/**
 * A visitor to visit a record component. The methods of this class must be called in the
 * following order: ( visitAnnotation | visitTypeAnnotation | visitAttribute )* visitEnd.
 */
export abstract class RecordComponentVisitor {
  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /** The record component visitor to which this visitor must delegate method calls. May be null. */
  protected delegate: RecordComponentVisitor | null;

  /**
   * Constructs a new RecordComponentVisitor.
   * @param api the ASM API version (ASM8 or ASM9)
   * @param recordComponentVisitor the record component visitor to delegate to
   */
  constructor(api: number, recordComponentVisitor: RecordComponentVisitor | null = null) {
    if (api !== ASM9 && (api < 0x80000 || api > 0x90100)) {
      throw new Error('Unsupported API version for record component visitor: ' + api);
    }
    this.api = api;
    this.delegate = recordComponentVisitor;
  }

  /**
   * Returns the delegate record component visitor.
   */
  getDelegate(): RecordComponentVisitor | null {
    return this.delegate;
  }

  /**
   * Visits an annotation of the record component.
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if the annotation is visible at runtime
   * @returns a visitor to visit the annotation values, or null if not interested
   */
  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    if (this.delegate !== null) {
      return this.delegate.visitAnnotation(descriptor, visible);
    }
    return null;
  }

  /**
   * Visits an annotation on the type of the record component.
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
    if (this.delegate !== null) {
      return this.delegate.visitTypeAnnotation(typeRef, typePath, descriptor, visible);
    }
    return null;
  }

  /**
   * Visits a non standard attribute of the record component.
   * @param attribute an attribute
   */
  visitAttribute(attribute: Attribute): void {
    this.delegate?.visitAttribute(attribute);
  }

  /**
   * Visits the end of the record component. This method, which is the last one to be called, is
   * used to inform the visitor that everything has been visited.
   */
  visitEnd(): void {
    this.delegate?.visitEnd();
  }
}
