import { ASM9 } from '../core/Opcodes';

/**
 * A visitor to visit a Java annotation. The methods of this class must be called in the following
 * order: ( visit | visitEnum | visitAnnotation | visitArray )* visitEnd.
 */
export abstract class AnnotationVisitor {
  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /** The annotation visitor to which this visitor must delegate method calls. May be null. */
  protected av: AnnotationVisitor | null;

  /**
   * Constructs a new AnnotationVisitor.
   * @param api the ASM API version (ASM4 to ASM9)
   * @param annotationVisitor the annotation visitor to delegate to
   */
  constructor(api: number, annotationVisitor: AnnotationVisitor | null = null) {
    if (api !== ASM9 && (api < 0x40000 || api > 0x90100)) {
      throw new Error('Unsupported API version: ' + api);
    }
    this.api = api;
    this.av = annotationVisitor;
  }

  /**
   * Returns the delegate annotation visitor.
   */
  getDelegate(): AnnotationVisitor | null {
    return this.av;
  }

  /**
   * Visits a primitive value of the annotation.
   * @param name the value name
   * @param value the actual value (Boolean, Character, Byte, Short, Integer, Long, Float, Double, String, Type, or 1-dimensional array)
   */
  visit(name: string | null, value: unknown): void {
    this.av?.visit(name, value);
  }

  /**
   * Visits an enumeration value of the annotation.
   * @param name the value name
   * @param descriptor the class descriptor of the enumeration class
   * @param value the actual enumeration value
   */
  visitEnum(name: string | null, descriptor: string, value: string): void {
    this.av?.visitEnum(name, descriptor, value);
  }

  /**
   * Visits a nested annotation value of the annotation.
   * @param name the value name
   * @param descriptor the class descriptor of the nested annotation class
   * @returns a visitor to visit the nested annotation values, or null if this visitor is not interested
   */
  visitAnnotation(name: string | null, descriptor: string): AnnotationVisitor | null {
    if (this.av !== null) {
      return this.av.visitAnnotation(name, descriptor);
    }
    return null;
  }

  /**
   * Visits an array value of the annotation.
   * Note that arrays of primitive values (such as byte, boolean, short, char, int, long, float or double)
   * can be passed as value to visit. This is what ClassReader does.
   * @param name the value name
   * @returns a visitor to visit the array values, or null if this visitor is not interested
   */
  visitArray(name: string | null): AnnotationVisitor | null {
    if (this.av !== null) {
      return this.av.visitArray(name);
    }
    return null;
  }

  /**
   * Visits the end of the annotation.
   */
  visitEnd(): void {
    this.av?.visitEnd();
  }
}
