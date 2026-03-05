import { ByteVector } from '../core/ByteVector';
import { SymbolTable } from '../core/SymbolTable';
import { ClassVisitor } from '../visitors/ClassVisitor';
import { MethodVisitor } from '../visitors/MethodVisitor';
import { FieldVisitor } from '../visitors/FieldVisitor';
import { AnnotationVisitor } from '../visitors/AnnotationVisitor';
import { ModuleVisitor } from '../visitors/ModuleVisitor';
import { RecordComponentVisitor } from '../visitors/RecordComponentVisitor';
import { Attribute } from '../attributes/Attribute';
import { Label } from '../core/Label';
import { TypePath } from '../core/TypePath';
import { ASM9, ACC_DEPRECATED, ACC_SYNTHETIC } from '../core/Opcodes';
import { CLASS_FILE_MAGIC } from '../core/Constants';
import { MethodWriter } from './MethodWriter';
import { FieldWriter } from './FieldWriter';
import { AnnotationWriter } from './AnnotationWriter';
import { ModuleWriter } from './ModuleWriter';
import { RecordComponentWriter } from './RecordComponentWriter';

/**
 * Flag to tell the ClassWriter to automatically compute maximum stack size and
 * maximum number of local variables (max_stack and max_locals) for methods.
 */
export const COMPUTE_MAXS = 1;

/**
 * Flag to tell the ClassWriter to automatically compute the stack map frames
 * for methods. Note: Full frame computation is not currently implemented.
 * When set, only basic stack/locals tracking is performed.
 * For production use with Java 7+, consider providing explicit frames via visitFrame().
 */
export const COMPUTE_FRAMES = 2;

/**
 * A ClassVisitor that generates a corresponding ClassFile structure.
 */
export class ClassWriter extends ClassVisitor {
  /** The symbol table for this class. */
  readonly symbolTable: SymbolTable;

  /** Access flags. */
  private accessFlags: number = 0;

  /** The internal name of this class. */
  private thisClass: number = 0;

  /** The internal name of the super class. */
  private superClass: number = 0;

  /** The interfaces implemented by this class. */
  private interfaces: number[] = [];

  /** The fields of this class. */
  private firstField: FieldWriter | null = null;
  private lastField: FieldWriter | null = null;

  /** The methods of this class. */
  private firstMethod: MethodWriter | null = null;
  private lastMethod: MethodWriter | null = null;

  /** The number of attributes. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _attributeCount: number = 0;

  /** Source file name. */
  private sourceFileIndex: number = 0;

  /** Source debug extension. */
  private sourceDebugExtension: ByteVector | null = null;

  /** The signature. */
  private signatureIndex: number = 0;

  /** The enclosing class. */
  private enclosingClassIndex: number = 0;
  private enclosingMethodIndex: number = 0;

  /** Nest host class. */
  private nestHostClassIndex: number = 0;

  /** Nest members. */
  private nestMemberClasses: ByteVector | null = null;
  private nestMembersCount: number = 0;

  /** Permitted subclasses. */
  private permittedSubclasses: ByteVector | null = null;
  private permittedSubclassesCount: number = 0;

  /** Inner classes. */
  private innerClasses: ByteVector | null = null;
  private innerClassesCount: number = 0;

  /** Record components. */
  private firstRecordComponent: RecordComponentWriter | null = null;
  private lastRecordComponent: RecordComponentWriter | null = null;
  private recordComponentsCount: number = 0;

  /** Runtime visible annotations. */
  private runtimeVisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible annotations. */
  private runtimeInvisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime visible type annotations. */
  private runtimeVisibleTypeAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible type annotations. */
  private runtimeInvisibleTypeAnnotations: AnnotationWriter | null = null;

  /** Module writer. */
  private moduleWriter: ModuleWriter | null = null;

  /** Other attributes. */
  private firstAttribute: Attribute | null = null;

  /** Compute flags. */
  private readonly computeFlags: number;

  /** Version. */
  private version: number = 0;

  /**
   * Constructs a new ClassWriter.
   * @param flags the compute flags (COMPUTE_MAXS, COMPUTE_FRAMES, or 0)
   */
  constructor(flags: number);
  /**
   * Constructs a new ClassWriter from an existing ClassReader.
   * @param classReader the class reader to copy from
   * @param flags the compute flags
   */
  constructor(classReader: unknown, flags: number);
  constructor(arg1: number | unknown, arg2?: number) {
    super(ASM9);
    if (typeof arg1 === 'number') {
      this.computeFlags = arg1;
    } else {
      this.computeFlags = arg2 ?? 0;
    }
    this.symbolTable = new SymbolTable(this);
  }

  /**
   * Returns the compute flags.
   */
  hasFlags(flags: number): boolean {
    return (this.computeFlags & flags) !== 0;
  }

  override visit(
    version: number,
    access: number,
    name: string,
    signature: string | null,
    superName: string | null,
    interfaces: string[] | null
  ): void {
    this.version = version;
    this.accessFlags = access;
    this.thisClass = this.symbolTable.addConstantClass(name).index;
    this.symbolTable.setClassName(name);
    
    if (signature !== null) {
      this.signatureIndex = this.symbolTable.addConstantUtf8(signature);
    }
    
    this.superClass = superName === null ? 0 : this.symbolTable.addConstantClass(superName).index;
    
    if (interfaces !== null) {
      this.interfaces = interfaces.map(iface => this.symbolTable.addConstantClass(iface).index);
    }
  }

  override visitSource(source: string | null, debug: string | null): void {
    if (source !== null) {
      this.sourceFileIndex = this.symbolTable.addConstantUtf8(source);
    }
    if (debug !== null) {
      this.sourceDebugExtension = new ByteVector();
      const encoder = new TextEncoder();
      const bytes = encoder.encode(debug);
      this.sourceDebugExtension.putByteArray(bytes, 0, bytes.length);
    }
  }

  override visitModule(name: string, access: number, version: string | null): ModuleVisitor | null {
    this.moduleWriter = new ModuleWriter(this.symbolTable, name, access, version);
    return this.moduleWriter;
  }

  override visitNestHost(nestHost: string): void {
    this.nestHostClassIndex = this.symbolTable.addConstantClass(nestHost).index;
  }

  override visitOuterClass(owner: string, name: string | null, descriptor: string | null): void {
    this.enclosingClassIndex = this.symbolTable.addConstantClass(owner).index;
    if (name !== null && descriptor !== null) {
      this.enclosingMethodIndex = this.symbolTable.addConstantNameAndType(name, descriptor);
    }
  }

  override visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    const annotationWriter = AnnotationWriter.create(this.symbolTable, descriptor);
    if (visible) {
      annotationWriter.nextAnnotation = this.runtimeVisibleAnnotations;
      this.runtimeVisibleAnnotations = annotationWriter;
    } else {
      annotationWriter.nextAnnotation = this.runtimeInvisibleAnnotations;
      this.runtimeInvisibleAnnotations = annotationWriter;
    }
    return annotationWriter;
  }

  override visitTypeAnnotation(
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string,
    visible: boolean
  ): AnnotationVisitor | null {
    const annotationWriter = AnnotationWriter.createTypeAnnotation(
      this.symbolTable,
      typeRef,
      typePath,
      descriptor
    );
    if (visible) {
      annotationWriter.nextAnnotation = this.runtimeVisibleTypeAnnotations;
      this.runtimeVisibleTypeAnnotations = annotationWriter;
    } else {
      annotationWriter.nextAnnotation = this.runtimeInvisibleTypeAnnotations;
      this.runtimeInvisibleTypeAnnotations = annotationWriter;
    }
    return annotationWriter;
  }

  override visitAttribute(attribute: Attribute): void {
    attribute.nextAttribute = this.firstAttribute;
    this.firstAttribute = attribute;
  }

  override visitNestMember(nestMember: string): void {
    if (this.nestMemberClasses === null) {
      this.nestMemberClasses = new ByteVector();
    }
    this.nestMembersCount++;
    this.nestMemberClasses.putShort(this.symbolTable.addConstantClass(nestMember).index);
  }

  override visitPermittedSubclass(permittedSubclass: string): void {
    if (this.permittedSubclasses === null) {
      this.permittedSubclasses = new ByteVector();
    }
    this.permittedSubclassesCount++;
    this.permittedSubclasses.putShort(this.symbolTable.addConstantClass(permittedSubclass).index);
  }

  override visitInnerClass(
    name: string,
    outerName: string | null,
    innerName: string | null,
    access: number
  ): void {
    if (this.innerClasses === null) {
      this.innerClasses = new ByteVector();
    }
    this.innerClassesCount++;
    this.innerClasses.putShort(this.symbolTable.addConstantClass(name).index);
    this.innerClasses.putShort(outerName === null ? 0 : this.symbolTable.addConstantClass(outerName).index);
    this.innerClasses.putShort(innerName === null ? 0 : this.symbolTable.addConstantUtf8(innerName));
    this.innerClasses.putShort(access);
  }

  override visitRecordComponent(
    name: string,
    descriptor: string,
    signature: string | null
  ): RecordComponentVisitor | null {
    const recordComponentWriter = new RecordComponentWriter(this.symbolTable, name, descriptor, signature);
    if (this.firstRecordComponent === null) {
      this.firstRecordComponent = recordComponentWriter;
    } else {
      this.lastRecordComponent!.nextRecordComponentWriter = recordComponentWriter;
    }
    this.lastRecordComponent = recordComponentWriter;
    this.recordComponentsCount++;
    return recordComponentWriter;
  }

  override visitField(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    value: unknown
  ): FieldVisitor | null {
    const fieldWriter = new FieldWriter(this.symbolTable, access, name, descriptor, signature, value);
    if (this.firstField === null) {
      this.firstField = fieldWriter;
    } else {
      this.lastField!.nextFieldWriter = fieldWriter;
    }
    this.lastField = fieldWriter;
    return fieldWriter;
  }

  override visitMethod(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: string[] | null
  ): MethodVisitor | null {
    const methodWriter = new MethodWriter(
      this.symbolTable,
      access,
      name,
      descriptor,
      signature,
      exceptions,
      this.computeFlags
    );
    if (this.firstMethod === null) {
      this.firstMethod = methodWriter;
    } else {
      this.lastMethod!.nextMethodWriter = methodWriter;
    }
    this.lastMethod = methodWriter;
    return methodWriter;
  }

  override visitEnd(): void {
    // Nothing to do
  }

  /**
   * Returns the bytecode of the class file.
   */
  toByteArray(): Uint8Array {
    // Compute the size of the class file
    let size = 24; // magic + version + access + this/super + interfaces_count
    size += 2 * this.interfaces.length;

    // Compute size of fields
    let fieldCount = 0;
    let fieldWriter = this.firstField;
    while (fieldWriter !== null) {
      fieldCount++;
      size += fieldWriter.computeFieldInfoSize();
      fieldWriter = fieldWriter.nextFieldWriter;
    }

    // Compute size of methods
    let methodCount = 0;
    let methodWriter = this.firstMethod;
    while (methodWriter !== null) {
      methodCount++;
      size += methodWriter.computeMethodInfoSize();
      methodWriter = methodWriter.nextMethodWriter;
    }

    // Compute size of attributes
    let attributeCount = 0;
    
    if (this.sourceFileIndex !== 0) {
      this.symbolTable.addConstantUtf8('SourceFile');
      size += 8;
      attributeCount++;
    }
    
    if (this.sourceDebugExtension !== null) {
      this.symbolTable.addConstantUtf8('SourceDebugExtension');
      size += 6 + this.sourceDebugExtension.length;
      attributeCount++;
    }
    
    if (this.signatureIndex !== 0) {
      this.symbolTable.addConstantUtf8('Signature');
      size += 8;
      attributeCount++;
    }
    
    if (this.enclosingClassIndex !== 0) {
      this.symbolTable.addConstantUtf8('EnclosingMethod');
      size += 10;
      attributeCount++;
    }
    
    if ((this.accessFlags & ACC_DEPRECATED) !== 0) {
      this.symbolTable.addConstantUtf8('Deprecated');
      size += 6;
      attributeCount++;
    }
    
    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) {
      this.symbolTable.addConstantUtf8('Synthetic');
      size += 6;
      attributeCount++;
    }
    
    if (this.innerClasses !== null) {
      this.symbolTable.addConstantUtf8('InnerClasses');
      size += 8 + this.innerClasses.length;
      attributeCount++;
    }
    
    if (this.nestHostClassIndex !== 0) {
      this.symbolTable.addConstantUtf8('NestHost');
      size += 8;
      attributeCount++;
    }
    
    if (this.nestMemberClasses !== null) {
      this.symbolTable.addConstantUtf8('NestMembers');
      size += 8 + this.nestMemberClasses.length;
      attributeCount++;
    }
    
    if (this.permittedSubclasses !== null) {
      this.symbolTable.addConstantUtf8('PermittedSubclasses');
      size += 8 + this.permittedSubclasses.length;
      attributeCount++;
    }

    // Module attributes
    if (this.moduleWriter !== null) {
      this.symbolTable.addConstantUtf8('Module');
      size += this.moduleWriter.computeModuleSize();
      attributeCount++;

      if (this.moduleWriter.getPackagesCount() > 0) {
        this.symbolTable.addConstantUtf8('ModulePackages');
        size += this.moduleWriter.computePackagesSize();
        attributeCount++;
      }

      if (this.moduleWriter.getMainClassIndex() !== 0) {
        this.symbolTable.addConstantUtf8('ModuleMainClass');
        size += this.moduleWriter.computeMainClassSize();
        attributeCount++;
      }
    }

    // Record attributes
    if (this.firstRecordComponent !== null) {
      this.symbolTable.addConstantUtf8('Record');
      let recordSize = 2; // components_count
      let recordComponent = this.firstRecordComponent;
      while (recordComponent !== null) {
        recordSize += recordComponent.computeRecordComponentInfoSize();
        recordComponent = recordComponent.nextRecordComponentWriter;
      }
      size += 6 + recordSize;
      attributeCount++;
    }

    if (this.runtimeVisibleAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeVisibleAnnotations');
      size += 8 + this.runtimeVisibleAnnotations.computeAnnotationsSize();
      attributeCount++;
    }

    if (this.runtimeInvisibleAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeInvisibleAnnotations');
      size += 8 + this.runtimeInvisibleAnnotations.computeAnnotationsSize();
      attributeCount++;
    }

    // Bootstrap methods
    if (this.symbolTable.getBootstrapMethodCount() > 0) {
      this.symbolTable.addConstantUtf8('BootstrapMethods');
      size += 8; // attribute header + num_bootstrap_methods
      // Size computed from SymbolTable
    }

    // Add constant pool size
    size += this.symbolTable.getConstantPoolLength();

    // Allocate output buffer
    const result = new ByteVector(size + 2 * this.symbolTable.getConstantPoolCount());

    // Write magic and version
    result.putInt(CLASS_FILE_MAGIC);
    result.putInt(this.version);

    // Write constant pool
    this.symbolTable.putConstantPool(result);

    // Write access flags and class/super/interfaces
    const accessMask = ACC_DEPRECATED | ACC_SYNTHETIC; // Flags handled as attributes
    result.putShort(this.accessFlags & ~accessMask);
    result.putShort(this.thisClass);
    result.putShort(this.superClass);
    result.putShort(this.interfaces.length);
    for (const iface of this.interfaces) {
      result.putShort(iface);
    }

    // Write fields
    result.putShort(fieldCount);
    fieldWriter = this.firstField;
    while (fieldWriter !== null) {
      fieldWriter.putFieldInfo(result);
      fieldWriter = fieldWriter.nextFieldWriter;
    }

    // Write methods
    result.putShort(methodCount);
    methodWriter = this.firstMethod;
    while (methodWriter !== null) {
      methodWriter.putMethodInfo(result);
      methodWriter = methodWriter.nextMethodWriter;
    }

    // Write attributes
    result.putShort(attributeCount);

    if (this.sourceFileIndex !== 0) {
      result.putShort(this.symbolTable.addConstantUtf8('SourceFile'));
      result.putInt(2);
      result.putShort(this.sourceFileIndex);
    }

    if (this.sourceDebugExtension !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('SourceDebugExtension'));
      result.putInt(this.sourceDebugExtension.length);
      result.putByteArray(this.sourceDebugExtension.data, 0, this.sourceDebugExtension.length);
    }

    if (this.signatureIndex !== 0) {
      result.putShort(this.symbolTable.addConstantUtf8('Signature'));
      result.putInt(2);
      result.putShort(this.signatureIndex);
    }

    if (this.enclosingClassIndex !== 0) {
      result.putShort(this.symbolTable.addConstantUtf8('EnclosingMethod'));
      result.putInt(4);
      result.putShort(this.enclosingClassIndex);
      result.putShort(this.enclosingMethodIndex);
    }

    if ((this.accessFlags & ACC_DEPRECATED) !== 0) {
      result.putShort(this.symbolTable.addConstantUtf8('Deprecated'));
      result.putInt(0);
    }

    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) {
      result.putShort(this.symbolTable.addConstantUtf8('Synthetic'));
      result.putInt(0);
    }

    if (this.innerClasses !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('InnerClasses'));
      result.putInt(2 + this.innerClasses.length);
      result.putShort(this.innerClassesCount);
      result.putByteArray(this.innerClasses.data, 0, this.innerClasses.length);
    }

    if (this.nestHostClassIndex !== 0) {
      result.putShort(this.symbolTable.addConstantUtf8('NestHost'));
      result.putInt(2);
      result.putShort(this.nestHostClassIndex);
    }

    if (this.nestMemberClasses !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('NestMembers'));
      result.putInt(2 + this.nestMemberClasses.length);
      result.putShort(this.nestMembersCount);
      result.putByteArray(this.nestMemberClasses.data, 0, this.nestMemberClasses.length);
    }

    if (this.permittedSubclasses !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('PermittedSubclasses'));
      result.putInt(2 + this.permittedSubclasses.length);
      result.putShort(this.permittedSubclassesCount);
      result.putByteArray(this.permittedSubclasses.data, 0, this.permittedSubclasses.length);
    }

    // Write module attributes
    if (this.moduleWriter !== null) {
      this.moduleWriter.putModule(result);

      if (this.moduleWriter.getPackagesCount() > 0) {
        this.moduleWriter.putPackages(result);
      }

      if (this.moduleWriter.getMainClassIndex() !== 0) {
        this.moduleWriter.putMainClass(result);
      }
    }

    // Write Record attribute
    if (this.firstRecordComponent !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('Record'));
      let recordSize = 2; // components_count
      let rc = this.firstRecordComponent;
      while (rc !== null) {
        recordSize += rc.computeRecordComponentInfoSize();
        rc = rc.nextRecordComponentWriter;
      }
      result.putInt(recordSize);
      result.putShort(this.recordComponentsCount);

      let recordComponent = this.firstRecordComponent;
      while (recordComponent !== null) {
        recordComponent.putRecordComponentInfo(result);
        recordComponent = recordComponent.nextRecordComponentWriter;
      }
    }

    if (this.runtimeVisibleAnnotations !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('RuntimeVisibleAnnotations'));
      this.runtimeVisibleAnnotations.putAnnotations(this.symbolTable, result);
    }

    if (this.runtimeInvisibleAnnotations !== null) {
      result.putShort(this.symbolTable.addConstantUtf8('RuntimeInvisibleAnnotations'));
      this.runtimeInvisibleAnnotations.putAnnotations(this.symbolTable, result);
    }

    return result.toByteArray();
  }

  /**
   * Returns a new label.
   */
  newLabel(): Label {
    return new Label();
  }
}
