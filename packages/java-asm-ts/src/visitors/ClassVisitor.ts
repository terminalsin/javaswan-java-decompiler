import { ASM5, ASM8, ASM9 } from '../core/Opcodes';
import type { AnnotationVisitor } from './AnnotationVisitor';
import type { FieldVisitor } from './FieldVisitor';
import type { MethodVisitor } from './MethodVisitor';
import type { ModuleVisitor } from './ModuleVisitor';
import type { RecordComponentVisitor } from './RecordComponentVisitor';
import type { Attribute } from '../attributes/Attribute';
import type { TypePath } from '../core/TypePath';

/**
 * A visitor to visit a Java class. The methods of this class must be called in the following order:
 * visit [ visitSource ] [ visitModule ] [ visitNestHost ] [ visitOuterClass ] ( visitAnnotation |
 * visitTypeAnnotation | visitAttribute )* ( visitNestMember | visitPermittedSubclass | visitInnerClass |
 * visitRecordComponent | visitField | visitMethod )* visitEnd.
 */
export abstract class ClassVisitor {
  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /** The class visitor to which this visitor must delegate method calls. May be null. */
  protected cv: ClassVisitor | null;

  /**
   * Constructs a new ClassVisitor.
   * @param api the ASM API version (ASM4 to ASM9)
   * @param classVisitor the class visitor to delegate to
   */
  constructor(api: number, classVisitor: ClassVisitor | null = null) {
    if (api !== ASM9 && (api < 0x40000 || api > 0x90100)) {
      throw new Error('Unsupported API version: ' + api);
    }
    this.api = api;
    this.cv = classVisitor;
  }

  /**
   * Returns the delegate class visitor.
   */
  getDelegate(): ClassVisitor | null {
    return this.cv;
  }

  /**
   * Visits the header of the class.
   * @param version the class version (V1_1 to V21, etc.)
   * @param access the class's access flags (ACC_PUBLIC, ACC_FINAL, etc.)
   * @param name the internal name of the class
   * @param signature the signature of this class (may be null)
   * @param superName the internal of name of the super class (may be null for Object)
   * @param interfaces the internal names of the interfaces (may be null)
   */
  visit(
    version: number,
    access: number,
    name: string,
    signature: string | null,
    superName: string | null,
    interfaces: string[] | null
  ): void {
    this.cv?.visit(version, access, name, signature, superName, interfaces);
  }

  /**
   * Visits the source of the class.
   * @param source the name of the source file (may be null)
   * @param debug additional debug information (may be null)
   */
  visitSource(source: string | null, debug: string | null): void {
    this.cv?.visitSource(source, debug);
  }

  /**
   * Visit the module corresponding to the class.
   * @param name the fully qualified name (using dots) of the module
   * @param access the module access flags (ACC_OPEN, ACC_SYNTHETIC, ACC_MANDATED)
   * @param version the module version (may be null)
   * @returns a visitor to visit the module values, or null
   */
  visitModule(name: string, access: number, version: string | null): ModuleVisitor | null {
    if (this.api < ASM5 + 0x10000) {
      throw new Error('visitModule requires ASM6+');
    }
    if (this.cv !== null) {
      return this.cv.visitModule(name, access, version);
    }
    return null;
  }

  /**
   * Visits the nest host class of the class.
   * @param nestHost the internal name of the host class
   */
  visitNestHost(nestHost: string): void {
    if (this.api < ASM5 + 0x20000) {
      throw new Error('visitNestHost requires ASM7+');
    }
    this.cv?.visitNestHost(nestHost);
  }

  /**
   * Visits the enclosing class of the class.
   * @param owner internal name of the enclosing class
   * @param name the name of the method (may be null)
   * @param descriptor the descriptor of the method (may be null)
   */
  visitOuterClass(owner: string, name: string | null, descriptor: string | null): void {
    this.cv?.visitOuterClass(owner, name, descriptor);
  }

  /**
   * Visits an annotation of the class.
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    if (this.cv !== null) {
      return this.cv.visitAnnotation(descriptor, visible);
    }
    return null;
  }

  /**
   * Visits an annotation on a type in the class signature.
   * @param typeRef a reference to the annotated type
   * @param typePath the path to the annotated type argument (or null)
   * @param descriptor the class descriptor of the annotation class
   * @param visible true if visible at runtime
   * @returns a visitor to visit the annotation values, or null
   */
  visitTypeAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    if (this.api < ASM5) {
      throw new Error('visitTypeAnnotation requires ASM5+');
    }
    if (this.cv !== null) {
      return this.cv.visitTypeAnnotation(typeRef, typePath, descriptor, visible);
    }
    return null;
  }

  /**
   * Visits a non standard attribute of the class.
   * @param attribute an attribute
   */
  visitAttribute(attribute: Attribute): void {
    this.cv?.visitAttribute(attribute);
  }

  /**
   * Visits a member of the nest.
   * @param nestMember the internal name of a nest member
   */
  visitNestMember(nestMember: string): void {
    if (this.api < ASM5 + 0x20000) {
      throw new Error('visitNestMember requires ASM7+');
    }
    this.cv?.visitNestMember(nestMember);
  }

  /**
   * Visits a permitted subclass.
   * @param permittedSubclass the internal name of a permitted subclass
   */
  visitPermittedSubclass(permittedSubclass: string): void {
    if (this.api < ASM9) {
      throw new Error('visitPermittedSubclass requires ASM9+');
    }
    this.cv?.visitPermittedSubclass(permittedSubclass);
  }

  /**
   * Visits information about an inner class.
   * @param name the internal name of an inner class
   * @param outerName the internal name of the class to which the inner class belongs (may be null)
   * @param innerName the simple name of the inner class (may be null)
   * @param access the access flags of the inner class
   */
  visitInnerClass(name: string, outerName: string | null, innerName: string | null, access: number): void {
    this.cv?.visitInnerClass(name, outerName, innerName, access);
  }

  /**
   * Visits a record component of the class.
   * @param name the record component name
   * @param descriptor the record component descriptor
   * @param signature the record component signature (may be null)
   * @returns a visitor to visit this record component, or null
   */
  visitRecordComponent(
    name: string,
    descriptor: string,
    signature: string | null
  ): RecordComponentVisitor | null {
    if (this.api < ASM8) {
      throw new Error('visitRecordComponent requires ASM8+');
    }
    if (this.cv !== null) {
      return this.cv.visitRecordComponent(name, descriptor, signature);
    }
    return null;
  }

  /**
   * Visits a field of the class.
   * @param access the field's access flags (ACC_PUBLIC, ACC_PRIVATE, etc.)
   * @param name the field's name
   * @param descriptor the field's descriptor
   * @param signature the field's signature (may be null)
   * @param value the field's initial value (must be a primitive, String, or null)
   * @returns a visitor to visit field annotations and attributes, or null
   */
  visitField(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    value: unknown
  ): FieldVisitor | null {
    if (this.cv !== null) {
      return this.cv.visitField(access, name, descriptor, signature, value);
    }
    return null;
  }

  /**
   * Visits a method of the class.
   * @param access the method's access flags (ACC_PUBLIC, ACC_PRIVATE, etc.)
   * @param name the method's name
   * @param descriptor the method's descriptor
   * @param signature the method's signature (may be null)
   * @param exceptions the internal names of the method's exception classes (may be null)
   * @returns a visitor to visit the method, or null
   */
  visitMethod(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: string[] | null
  ): MethodVisitor | null {
    if (this.cv !== null) {
      return this.cv.visitMethod(access, name, descriptor, signature, exceptions);
    }
    return null;
  }

  /**
   * Visits the end of the class.
   */
  visitEnd(): void {
    this.cv?.visitEnd();
  }
}
