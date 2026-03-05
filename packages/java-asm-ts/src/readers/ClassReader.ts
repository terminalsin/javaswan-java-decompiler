import { Label } from '../core/Label';
import { Handle } from '../core/Handle';
import { Type } from '../core/Type';
import { ConstantDynamic } from '../core/ConstantDynamic';
import { TypePath } from '../core/TypePath';
import { TypeReference } from '../core/TypeReference';
import { Attribute } from '../attributes/Attribute';
import { ClassVisitor } from '../visitors/ClassVisitor';
import { MethodVisitor } from '../visitors/MethodVisitor';
import { FieldVisitor } from '../visitors/FieldVisitor';
import { AnnotationVisitor } from '../visitors/AnnotationVisitor';
import { RecordComponentVisitor } from '../visitors/RecordComponentVisitor';
import {
  CONSTANT_UTF8,
  CONSTANT_INTEGER,
  CONSTANT_FLOAT,
  CONSTANT_LONG,
  CONSTANT_DOUBLE,
  CONSTANT_CLASS,
  CONSTANT_STRING,
  CONSTANT_FIELDREF,
  CONSTANT_METHODREF,
  CONSTANT_INTERFACE_METHODREF,
  CONSTANT_NAME_AND_TYPE,
  CONSTANT_METHOD_HANDLE,
  CONSTANT_METHOD_TYPE,
  CONSTANT_DYNAMIC,
  CONSTANT_INVOKE_DYNAMIC,
  CONSTANT_MODULE,
  CONSTANT_PACKAGE,
  CLASS_FILE_MAGIC,
} from '../core/Constants';
import * as Opcodes from '../core/Opcodes';

/**
 * Flags for ClassReader.accept().
 */
export const SKIP_CODE = 1;
export const SKIP_DEBUG = 2;
export const SKIP_FRAMES = 4;
export const EXPAND_FRAMES = 8;

/**
 * A parser to make a ClassVisitor visit a class file structure.
 */
export class ClassReader {
  /** The class file buffer. */
  readonly classFileBuffer: Uint8Array;

  /** The offset of the constant pool in the class file. */
  private readonly cpInfoOffsets: number[];

  /** The constant pool count (number of entries). */
  readonly constantPoolCount: number;

  /** The offset of the first byte after the constant pool. */
  private readonly headerOffset: number;

  /** The offsets of each entry in the BootstrapMethods attribute (if present). */
  private bootstrapMethodOffsets: number[] | null = null;

  /**
   * Constructs a new ClassReader.
   * @param classFileBuffer the bytes of a class file
   */
  constructor(classFileBuffer: Uint8Array) {
    this.classFileBuffer = classFileBuffer;

    // Check magic number
    const magic = this.readUnsignedInt(0);
    if (magic !== CLASS_FILE_MAGIC) {
      throw new Error('Invalid class file magic: ' + magic.toString(16));
    }

    // Parse constant pool
    this.constantPoolCount = this.readUnsignedShort(8);
    this.cpInfoOffsets = new Array(this.constantPoolCount);

    let currentOffset = 10;
    for (let i = 1; i < this.constantPoolCount; i++) {
      this.cpInfoOffsets[i] = currentOffset + 1;
      const tag = classFileBuffer[currentOffset]!;
      let cpInfoSize: number;

      switch (tag) {
        case CONSTANT_UTF8:
          cpInfoSize = 3 + this.readUnsignedShort(currentOffset + 1);
          break;
        case CONSTANT_INTEGER:
        case CONSTANT_FLOAT:
        case CONSTANT_FIELDREF:
        case CONSTANT_METHODREF:
        case CONSTANT_INTERFACE_METHODREF:
        case CONSTANT_NAME_AND_TYPE:
        case CONSTANT_DYNAMIC:
        case CONSTANT_INVOKE_DYNAMIC:
          cpInfoSize = 5;
          break;
        case CONSTANT_LONG:
        case CONSTANT_DOUBLE:
          cpInfoSize = 9;
          i++; // Long/double take two slots
          break;
        case CONSTANT_CLASS:
        case CONSTANT_STRING:
        case CONSTANT_METHOD_TYPE:
        case CONSTANT_MODULE:
        case CONSTANT_PACKAGE:
          cpInfoSize = 3;
          break;
        case CONSTANT_METHOD_HANDLE:
          cpInfoSize = 4;
          break;
        default:
          throw new Error('Unknown constant pool tag: ' + tag);
      }
      currentOffset += cpInfoSize;
    }

    this.headerOffset = currentOffset;

    // Find and parse BootstrapMethods attribute
    this.findBootstrapMethods();
  }

  /**
   * Finds and parses the BootstrapMethods attribute in the class file.
   */
  private findBootstrapMethods(): void {
    // Skip to the end of interfaces
    // Layout: headerOffset+0=access_flags, +2=this_class, +4=super_class, +6=interfaces_count, +8=interfaces[0..]
    let currentOffset = this.headerOffset + 8;
    const interfacesCount = this.readUnsignedShort(currentOffset - 2);
    currentOffset += 2 * interfacesCount;

    // Skip fields
    let fieldsCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (fieldsCount-- > 0) {
      currentOffset += 6; // access, name, descriptor
      let attributesCount = this.readUnsignedShort(currentOffset);
      currentOffset += 2;
      while (attributesCount-- > 0) {
        currentOffset += 6 + this.readInt(currentOffset + 2);
      }
    }

    // Skip methods
    let methodsCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (methodsCount-- > 0) {
      currentOffset += 6; // access, name, descriptor
      let attributesCount = this.readUnsignedShort(currentOffset);
      currentOffset += 2;
      while (attributesCount-- > 0) {
        currentOffset += 6 + this.readInt(currentOffset + 2);
      }
    }

    // Read class attributes to find BootstrapMethods
    let attributesCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (attributesCount-- > 0) {
      const attributeName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      const attributeLength = this.readInt(currentOffset + 2);
      const attributeStart = currentOffset + 6;

      if (attributeName === 'BootstrapMethods') {
        this.parseBootstrapMethods(attributeStart);
        return;
      }

      currentOffset = attributeStart + attributeLength;
    }
  }

  /**
   * Parses the BootstrapMethods attribute.
   */
  private parseBootstrapMethods(offset: number): void {
    const numBootstrapMethods = this.readUnsignedShort(offset);
    this.bootstrapMethodOffsets = new Array(numBootstrapMethods);
    let currentOffset = offset + 2;

    for (let i = 0; i < numBootstrapMethods; i++) {
      this.bootstrapMethodOffsets[i] = currentOffset;
      // Skip bootstrap_method_ref (2 bytes) + num_bootstrap_arguments (2 bytes)
      const numBootstrapArguments = this.readUnsignedShort(currentOffset + 2);
      currentOffset += 4 + 2 * numBootstrapArguments;
    }
  }

  /**
   * Returns the class access flags.
   */
  getAccess(): number {
    return this.readUnsignedShort(this.headerOffset);
  }

  /**
   * Returns the internal name of the class.
   */
  getClassName(): string {
    const classIndex = this.readUnsignedShort(this.headerOffset + 2);
    return this.readClass(classIndex);
  }

  /**
   * Returns the internal name of the super class.
   */
  getSuperName(): string | null {
    const superIndex = this.readUnsignedShort(this.headerOffset + 4);
    return superIndex === 0 ? null : this.readClass(superIndex);
  }

  /**
   * Returns the internal name of the super class.
   * Alias for getSuperName() for compatibility.
   */
  getSuperClassName(): string | null {
    return this.getSuperName();
  }

  /**
   * Returns the internal names of the interfaces.
   */
  getInterfaces(): string[] {
    let currentOffset = this.headerOffset + 6;
    const interfaceCount = this.readUnsignedShort(currentOffset);
    const interfaces: string[] = [];
    currentOffset += 2;
    for (let i = 0; i < interfaceCount; i++) {
      interfaces.push(this.readClass(this.readUnsignedShort(currentOffset)));
      currentOffset += 2;
    }
    return interfaces;
  }

  /**
   * Makes the given visitor visit the class.
   * @param classVisitor the visitor
   * @param parsingOptions parsing flags (SKIP_CODE, SKIP_DEBUG, SKIP_FRAMES, EXPAND_FRAMES)
   */
  accept(classVisitor: ClassVisitor, parsingOptions: number): void {
    this.acceptWithAttributes(classVisitor, [], parsingOptions);
  }

  /**
   * Makes the given visitor visit the class with custom attribute prototypes.
   */
  acceptWithAttributes(
    classVisitor: ClassVisitor,
    _attributePrototypes: Attribute[],
    parsingOptions: number
  ): void {
    void parsingOptions; // Used in method reading

    // Read class header
    let currentOffset = this.headerOffset;
    const accessFlags = this.readUnsignedShort(currentOffset);
    const thisClass = this.readClass(this.readUnsignedShort(currentOffset + 2));
    const superClassIndex = this.readUnsignedShort(currentOffset + 4);
    const superClass = superClassIndex === 0 ? null : this.readClass(superClassIndex);

    currentOffset += 6;
    const interfaceCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    const interfaces: string[] = [];
    for (let i = 0; i < interfaceCount; i++) {
      interfaces.push(this.readClass(this.readUnsignedShort(currentOffset)));
      currentOffset += 2;
    }

    // Read fields
    const fieldsOffset = currentOffset;
    let fieldCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (fieldCount-- > 0) {
      const attributeCount = this.readUnsignedShort(currentOffset + 6);
      currentOffset += 8;
      for (let i = 0; i < attributeCount; i++) {
        currentOffset += 6 + this.readInt(currentOffset + 2);
      }
    }

    // Read methods
    const methodsOffset = currentOffset;
    let methodCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (methodCount-- > 0) {
      const attributeCount = this.readUnsignedShort(currentOffset + 6);
      currentOffset += 8;
      for (let i = 0; i < attributeCount; i++) {
        currentOffset += 6 + this.readInt(currentOffset + 2);
      }
    }

    // Read class attributes
    let sourceFile: string | null = null;
    let sourceDebugExtension: string | null = null;
    let signature: string | null = null;
    let innerClassesOffset = 0;
    let enclosingMethodOffset = 0;
    let runtimeVisibleAnnotationsOffset = 0;
    let runtimeInvisibleAnnotationsOffset = 0;
    let runtimeVisibleTypeAnnotationsOffset = 0;
    let runtimeInvisibleTypeAnnotationsOffset = 0;
    let nestHostClassOffset = 0;
    let nestMembersOffset = 0;
    let permittedSubclassesOffset = 0;
    let recordOffset = 0;
    let moduleOffset = 0;
    let moduleMainClassOffset = 0;
    let modulePackagesOffset = 0;

    const attributeCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    for (let i = 0; i < attributeCount; i++) {
      const attributeName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      const attributeLength = this.readInt(currentOffset + 2);
      const attributeStart = currentOffset + 6;
      currentOffset = attributeStart + attributeLength;

      switch (attributeName) {
        case 'SourceFile':
          sourceFile = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(attributeStart)]!);
          break;
        case 'InnerClasses':
          innerClassesOffset = attributeStart;
          break;
        case 'EnclosingMethod':
          enclosingMethodOffset = attributeStart;
          break;
        case 'Signature':
          signature = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(attributeStart)]!);
          break;
        case 'RuntimeVisibleAnnotations':
          runtimeVisibleAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleAnnotations':
          runtimeInvisibleAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeVisibleTypeAnnotations':
          runtimeVisibleTypeAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleTypeAnnotations':
          runtimeInvisibleTypeAnnotationsOffset = attributeStart;
          break;
        case 'Deprecated':
          // accessFlags |= Opcodes.ACC_DEPRECATED; // handled separately
          break;
        case 'SourceDebugExtension':
          sourceDebugExtension = this.readUTF8Extended(attributeStart, attributeLength);
          break;
        case 'NestHost':
          nestHostClassOffset = attributeStart;
          break;
        case 'NestMembers':
          nestMembersOffset = attributeStart;
          break;
        case 'PermittedSubclasses':
          permittedSubclassesOffset = attributeStart;
          break;
        case 'Record':
          recordOffset = attributeStart;
          break;
        case 'Module':
          moduleOffset = attributeStart;
          break;
        case 'ModuleMainClass':
          moduleMainClassOffset = attributeStart;
          break;
        case 'ModulePackages':
          modulePackagesOffset = attributeStart;
          break;
        // Custom attributes handled via prototypes
      }
    }


    // Read version from header
    const version = this.readInt(4);

    // Visit class
    classVisitor.visit(
      version,
      accessFlags,
      thisClass,
      signature,
      superClass,
      interfaces.length > 0 ? interfaces : null
    );

    // Visit source
    if (sourceFile !== null || sourceDebugExtension !== null) {
      classVisitor.visitSource(sourceFile, sourceDebugExtension);
    }

    // Visit module
    if (moduleOffset !== 0) {
      this.readModule(moduleOffset, modulePackagesOffset, moduleMainClassOffset, classVisitor);
    }

    // Visit record components
    if (recordOffset !== 0) {
      this.readRecord(recordOffset, classVisitor);
    }

    // Visit nest host
    if (nestHostClassOffset !== 0) {
      classVisitor.visitNestHost(this.readClass(this.readUnsignedShort(nestHostClassOffset)));
    }

    // Visit enclosing class/method
    if (enclosingMethodOffset !== 0) {
      const className = this.readClass(this.readUnsignedShort(enclosingMethodOffset));
      const methodIndex = this.readUnsignedShort(enclosingMethodOffset + 2);
      let methodName: string | null = null;
      let methodDescriptor: string | null = null;
      if (methodIndex !== 0) {
        const nameAndTypeOffset = this.cpInfoOffsets[methodIndex]!;
        methodName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameAndTypeOffset)]!);
        methodDescriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameAndTypeOffset + 2)]!);
      }
      classVisitor.visitOuterClass(className, methodName, methodDescriptor);
    }

    // Visit annotations
    if (runtimeVisibleAnnotationsOffset !== 0) {
      this.readAnnotations(runtimeVisibleAnnotationsOffset, true, classVisitor);
    }
    if (runtimeInvisibleAnnotationsOffset !== 0) {
      this.readAnnotations(runtimeInvisibleAnnotationsOffset, false, classVisitor);
    }

    // Visit type annotations
    if (runtimeVisibleTypeAnnotationsOffset !== 0) {
      this.readTypeAnnotations(runtimeVisibleTypeAnnotationsOffset, true, classVisitor);
    }
    if (runtimeInvisibleTypeAnnotationsOffset !== 0) {
      this.readTypeAnnotations(runtimeInvisibleTypeAnnotationsOffset, false, classVisitor);
    }

    // Visit nest members
    if (nestMembersOffset !== 0) {
      let count = this.readUnsignedShort(nestMembersOffset);
      let offset = nestMembersOffset + 2;
      while (count-- > 0) {
        classVisitor.visitNestMember(this.readClass(this.readUnsignedShort(offset)));
        offset += 2;
      }
    }

    // Visit permitted subclasses
    if (permittedSubclassesOffset !== 0) {
      let count = this.readUnsignedShort(permittedSubclassesOffset);
      let offset = permittedSubclassesOffset + 2;
      while (count-- > 0) {
        classVisitor.visitPermittedSubclass(this.readClass(this.readUnsignedShort(offset)));
        offset += 2;
      }
    }

    // Visit inner classes
    if (innerClassesOffset !== 0) {
      let count = this.readUnsignedShort(innerClassesOffset);
      let offset = innerClassesOffset + 2;
      while (count-- > 0) {
        classVisitor.visitInnerClass(
          this.readClass(this.readUnsignedShort(offset)),
          this.readClassOrNull(this.readUnsignedShort(offset + 2)),
          this.readUTF8OrNull(this.readUnsignedShort(offset + 4)),
          this.readUnsignedShort(offset + 6)
        );
        offset += 8;
      }
    }

    // Visit fields
    this.readFields(fieldsOffset, classVisitor, parsingOptions);

    // Visit methods
    this.readMethods(methodsOffset, classVisitor, parsingOptions);

    // Visit end
    classVisitor.visitEnd();
  }

  /**
   * Reads fields from the class file.
   */
  private readFields(fieldsOffset: number, classVisitor: ClassVisitor, _parsingOptions: number): void {
    let currentOffset = fieldsOffset;
    let fieldCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    while (fieldCount-- > 0) {
      currentOffset = this.readField(currentOffset, classVisitor);
    }
  }

  /**
   * Reads a single field.
   */
  private readField(fieldInfoOffset: number, classVisitor: ClassVisitor): number {
    let currentOffset = fieldInfoOffset;

    const accessFlags = this.readUnsignedShort(currentOffset);
    const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset + 2)]!);
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset + 4)]!);
    currentOffset += 6;

    let signature: string | null = null;
    let constantValue: unknown = null;
    let runtimeVisibleAnnotationsOffset = 0;
    let runtimeInvisibleAnnotationsOffset = 0;
    let runtimeVisibleTypeAnnotationsOffset = 0;
    let runtimeInvisibleTypeAnnotationsOffset = 0;

    const attributeCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    for (let i = 0; i < attributeCount; i++) {
      const attributeName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      const attributeLength = this.readInt(currentOffset + 2);
      const attributeStart = currentOffset + 6;
      currentOffset = attributeStart + attributeLength;

      switch (attributeName) {
        case 'ConstantValue':
          constantValue = this.readConstantPoolValue(this.readUnsignedShort(attributeStart));
          break;
        case 'Signature':
          signature = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(attributeStart)]!);
          break;
        case 'RuntimeVisibleAnnotations':
          runtimeVisibleAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleAnnotations':
          runtimeInvisibleAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeVisibleTypeAnnotations':
          runtimeVisibleTypeAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleTypeAnnotations':
          runtimeInvisibleTypeAnnotationsOffset = attributeStart;
          break;
      }
    }

    const fieldVisitor = classVisitor.visitField(accessFlags, name, descriptor, signature, constantValue);
    if (fieldVisitor === null) {
      return currentOffset;
    }

    // Visit annotations
    if (runtimeVisibleAnnotationsOffset !== 0) {
      this.readFieldAnnotations(runtimeVisibleAnnotationsOffset, true, fieldVisitor);
    }
    if (runtimeInvisibleAnnotationsOffset !== 0) {
      this.readFieldAnnotations(runtimeInvisibleAnnotationsOffset, false, fieldVisitor);
    }

    // Visit type annotations
    if (runtimeVisibleTypeAnnotationsOffset !== 0) {
      this.readFieldTypeAnnotations(runtimeVisibleTypeAnnotationsOffset, true, fieldVisitor);
    }
    if (runtimeInvisibleTypeAnnotationsOffset !== 0) {
      this.readFieldTypeAnnotations(runtimeInvisibleTypeAnnotationsOffset, false, fieldVisitor);
    }

    fieldVisitor.visitEnd();
    return currentOffset;
  }

  /**
   * Reads methods from the class file.
   */
  private readMethods(methodsOffset: number, classVisitor: ClassVisitor, parsingOptions: number): void {
    let currentOffset = methodsOffset;
    let methodCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    while (methodCount-- > 0) {
      currentOffset = this.readMethod(currentOffset, classVisitor, parsingOptions);
    }
  }

  /**
   * Reads a single method.
   */
  private readMethod(methodInfoOffset: number, classVisitor: ClassVisitor, parsingOptions: number): number {
    let currentOffset = methodInfoOffset;

    const accessFlags = this.readUnsignedShort(currentOffset);
    const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset + 2)]!);
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset + 4)]!);
    currentOffset += 6;

    let signature: string | null = null;
    let exceptionsOffset = 0;
    let codeOffset = 0;
    let runtimeVisibleAnnotationsOffset = 0;
    let runtimeInvisibleAnnotationsOffset = 0;
    let runtimeVisibleParameterAnnotationsOffset = 0;
    let runtimeInvisibleParameterAnnotationsOffset = 0;
    let runtimeVisibleTypeAnnotationsOffset = 0;
    let runtimeInvisibleTypeAnnotationsOffset = 0;
    let annotationDefaultOffset = 0;
    let methodParametersOffset = 0;

    const attributeCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    for (let i = 0; i < attributeCount; i++) {
      const attributeName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      const attributeLength = this.readInt(currentOffset + 2);
      const attributeStart = currentOffset + 6;
      currentOffset = attributeStart + attributeLength;

      switch (attributeName) {
        case 'Code':
          if ((parsingOptions & SKIP_CODE) === 0) {
            codeOffset = attributeStart;
          }
          break;
        case 'Exceptions':
          exceptionsOffset = attributeStart;
          break;
        case 'Signature':
          signature = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(attributeStart)]!);
          break;
        case 'RuntimeVisibleAnnotations':
          runtimeVisibleAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleAnnotations':
          runtimeInvisibleAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeVisibleParameterAnnotations':
          runtimeVisibleParameterAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleParameterAnnotations':
          runtimeInvisibleParameterAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeVisibleTypeAnnotations':
          runtimeVisibleTypeAnnotationsOffset = attributeStart;
          break;
        case 'RuntimeInvisibleTypeAnnotations':
          runtimeInvisibleTypeAnnotationsOffset = attributeStart;
          break;
        case 'AnnotationDefault':
          annotationDefaultOffset = attributeStart;
          break;
        case 'MethodParameters':
          methodParametersOffset = attributeStart;
          break;
      }
    }

    // Read exceptions
    let exceptions: string[] | null = null;
    if (exceptionsOffset !== 0) {
      const exceptionCount = this.readUnsignedShort(exceptionsOffset);
      exceptions = [];
      let offset = exceptionsOffset + 2;
      for (let i = 0; i < exceptionCount; i++) {
        exceptions.push(this.readClass(this.readUnsignedShort(offset)));
        offset += 2;
      }
    }

    const methodVisitor = classVisitor.visitMethod(accessFlags, name, descriptor, signature, exceptions);
    if (methodVisitor === null) {
      return currentOffset;
    }

    // Visit method parameters
    if (methodParametersOffset !== 0) {
      let count = this.classFileBuffer[methodParametersOffset]! & 0xFF;
      let offset = methodParametersOffset + 1;
      while (count-- > 0) {
        methodVisitor.visitParameter(
          this.readUTF8OrNull(this.readUnsignedShort(offset)),
          this.readUnsignedShort(offset + 2)
        );
        offset += 4;
      }
    }

    // Visit annotation default
    if (annotationDefaultOffset !== 0) {
      const annotationVisitor = methodVisitor.visitAnnotationDefault();
      if (annotationVisitor !== null) {
        this.readElementValue(annotationDefaultOffset, null, annotationVisitor);
        annotationVisitor.visitEnd();
      }
    }

    // Visit annotations
    if (runtimeVisibleAnnotationsOffset !== 0) {
      this.readMethodAnnotations(runtimeVisibleAnnotationsOffset, true, methodVisitor);
    }
    if (runtimeInvisibleAnnotationsOffset !== 0) {
      this.readMethodAnnotations(runtimeInvisibleAnnotationsOffset, false, methodVisitor);
    }

    // Visit parameter annotations
    if (runtimeVisibleParameterAnnotationsOffset !== 0) {
      this.readParameterAnnotations(runtimeVisibleParameterAnnotationsOffset, descriptor, true, methodVisitor);
    }
    if (runtimeInvisibleParameterAnnotationsOffset !== 0) {
      this.readParameterAnnotations(runtimeInvisibleParameterAnnotationsOffset, descriptor, false, methodVisitor);
    }

    // Visit type annotations
    if (runtimeVisibleTypeAnnotationsOffset !== 0) {
      this.readMethodTypeAnnotations(runtimeVisibleTypeAnnotationsOffset, true, methodVisitor);
    }
    if (runtimeInvisibleTypeAnnotationsOffset !== 0) {
      this.readMethodTypeAnnotations(runtimeInvisibleTypeAnnotationsOffset, false, methodVisitor);
    }

    // Visit code
    if (codeOffset !== 0) {
      methodVisitor.visitCode();
      this.readCode(codeOffset, methodVisitor, parsingOptions);
    }

    methodVisitor.visitEnd();
    return currentOffset;
  }

  /**
   * Reads the Code attribute.
   */
  private readCode(codeOffset: number, methodVisitor: MethodVisitor, parsingOptions: number): void {
    const buffer = this.classFileBuffer;
    let currentOffset = codeOffset;

    const maxStack = this.readUnsignedShort(currentOffset);
    const maxLocals = this.readUnsignedShort(currentOffset + 2);
    const codeLength = this.readInt(currentOffset + 4);
    currentOffset += 8;

    const codeStart = currentOffset;
    const codeEnd = currentOffset + codeLength;

    // Create labels for jump targets
    const labels: Array<Label | null> = new Array(codeLength + 1).fill(null);

    // First pass: find all jump targets and create labels
    currentOffset = codeStart;
    while (currentOffset < codeEnd) {
      const bytecodeOffset = currentOffset - codeStart;
      const opcode = buffer[currentOffset]! & 0xFF;

      switch (opcode) {
        case Opcodes.IFEQ:
        case Opcodes.IFNE:
        case Opcodes.IFLT:
        case Opcodes.IFGE:
        case Opcodes.IFGT:
        case Opcodes.IFLE:
        case Opcodes.IF_ICMPEQ:
        case Opcodes.IF_ICMPNE:
        case Opcodes.IF_ICMPLT:
        case Opcodes.IF_ICMPGE:
        case Opcodes.IF_ICMPGT:
        case Opcodes.IF_ICMPLE:
        case Opcodes.IF_ACMPEQ:
        case Opcodes.IF_ACMPNE:
        case Opcodes.GOTO:
        case Opcodes.JSR:
        case Opcodes.IFNULL:
        case Opcodes.IFNONNULL: {
          const target = bytecodeOffset + this.readSignedShort(currentOffset + 1);
          this.getOrCreateLabel(labels, target);
          currentOffset += 3;
          break;
        }
        case 200: // GOTO_W
        case 201: { // JSR_W
          const target = bytecodeOffset + this.readInt(currentOffset + 1);
          this.getOrCreateLabel(labels, target);
          currentOffset += 5;
          break;
        }
        case Opcodes.TABLESWITCH: {
          // Padding aligns to 4-byte boundary based on bytecode offset
          const padding = (4 - ((bytecodeOffset + 1) % 4)) % 4;
          let switchOffset = currentOffset + 1 + padding;
          const defaultTarget = bytecodeOffset + this.readInt(switchOffset);
          this.getOrCreateLabel(labels, defaultTarget);
          const low = this.readInt(switchOffset + 4);
          const high = this.readInt(switchOffset + 8);
          const numCases = high - low + 1;
          switchOffset += 12;
          // Sanity check: numCases should be reasonable (max ~64K for valid bytecode)
          if (numCases > 0 && numCases < 65536) {
            for (let i = 0; i < numCases; i++) {
              const target = bytecodeOffset + this.readInt(switchOffset);
              this.getOrCreateLabel(labels, target);
              switchOffset += 4;
            }
            currentOffset = switchOffset;
          } else {
            // Invalid switch table - skip opcode only
            currentOffset += 1;
          }
          break;
        }
        case Opcodes.LOOKUPSWITCH: {
          const padding = (4 - ((currentOffset - codeStart + 1) % 4)) % 4;
          let switchOffset = currentOffset + 1 + padding;
          const defaultTarget = bytecodeOffset + this.readInt(switchOffset);
          this.getOrCreateLabel(labels, defaultTarget);
          const npairs = this.readInt(switchOffset + 4);
          switchOffset += 8;
          for (let i = 0; i < npairs; i++) {
            const target = bytecodeOffset + this.readInt(switchOffset + 4);
            this.getOrCreateLabel(labels, target);
            switchOffset += 8;
          }
          currentOffset = switchOffset;
          break;
        }
        case 196: { // WIDE
          const wideOpcode = buffer[currentOffset + 1]! & 0xFF;
          if (wideOpcode === Opcodes.IINC) {
            currentOffset += 6;
          } else {
            currentOffset += 4;
          }
          break;
        }
        default:
          currentOffset += this.getOpcodeSize(opcode);
      }
    }
    // Skip exception table for now, read its size
    currentOffset = codeEnd;
    const exceptionTableLength = this.readUnsignedShort(currentOffset);
    currentOffset += 2 + exceptionTableLength * 8;

    // Read Code attributes (for StackMapTable and line numbers)
    const attributeCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    let lineNumberTableOffset = 0;
    let localVariableTableOffset = 0;

    for (let i = 0; i < attributeCount; i++) {
      const attributeName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      const attributeLength = this.readInt(currentOffset + 2);
      const attributeStart = currentOffset + 6;

      if (attributeName === 'StackMapTable') {
        // StackMapTable handled for frame support
      } else if (attributeName === 'LineNumberTable' && (parsingOptions & SKIP_DEBUG) === 0) {
        lineNumberTableOffset = attributeStart;
      } else if (attributeName === 'LocalVariableTable' && (parsingOptions & SKIP_DEBUG) === 0) {
        localVariableTableOffset = attributeStart;
      }

      currentOffset = attributeStart + attributeLength;
    }

    // Create labels at line number offsets and build line number map for O(1) lookup
    const lineNumberMap = new Map<number, number>(); // bytecodeOffset -> lineNumber
    if (lineNumberTableOffset !== 0) {
      let count = this.readUnsignedShort(lineNumberTableOffset);
      let offset = lineNumberTableOffset + 2;
      while (count-- > 0) {
        const startPc = this.readUnsignedShort(offset);
        const lineNumber = this.readUnsignedShort(offset + 2);
        this.getOrCreateLabel(labels, startPc);
        lineNumberMap.set(startPc, lineNumber);
        offset += 4;
      }
    }

    // Second pass: read and visit instructions
    currentOffset = codeStart;
    while (currentOffset < codeEnd) {
      const bytecodeOffset = currentOffset - codeStart;

      // Visit label if exists
      const label = labels[bytecodeOffset] ?? null;
      if (label !== null) {
        methodVisitor.visitLabel(label);

        // Visit line number (only at labels, using O(1) Map lookup)
        const lineNumber = lineNumberMap.get(bytecodeOffset);
        if (lineNumber !== undefined) {
          methodVisitor.visitLineNumber(lineNumber, label);
        }
      }

      const opcode = buffer[currentOffset]! & 0xFF;
      currentOffset = this.visitInstruction(opcode, currentOffset, codeStart, labels, methodVisitor);
    }

    // Visit exception table
    currentOffset = codeEnd;
    const exceptionCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    for (let i = 0; i < exceptionCount; i++) {
      const start = this.getOrCreateLabel(labels, this.readUnsignedShort(currentOffset));
      const end = this.getOrCreateLabel(labels, this.readUnsignedShort(currentOffset + 2));
      const handler = this.getOrCreateLabel(labels, this.readUnsignedShort(currentOffset + 4));
      const catchTypeIndex = this.readUnsignedShort(currentOffset + 6);
      const catchType = catchTypeIndex === 0 ? null : this.readClass(catchTypeIndex);
      methodVisitor.visitTryCatchBlock(start, end, handler, catchType);
      currentOffset += 8;
    }

    // Visit local variables
    if (localVariableTableOffset !== 0) {
      let count = this.readUnsignedShort(localVariableTableOffset);
      let offset = localVariableTableOffset + 2;
      while (count-- > 0) {
        const startPc = this.readUnsignedShort(offset);
        const length = this.readUnsignedShort(offset + 2);
        const varName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(offset + 4)]!);
        const varDescriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(offset + 6)]!);
        const varIndex = this.readUnsignedShort(offset + 8);
        methodVisitor.visitLocalVariable(
          varName,
          varDescriptor,
          null,
          this.getOrCreateLabel(labels, startPc),
          this.getOrCreateLabel(labels, startPc + length),
          varIndex
        );
        offset += 10;
      }
    }

    methodVisitor.visitMaxs(maxStack, maxLocals);
  }

  /**
   * Visits an instruction.
   */
  private visitInstruction(
    opcode: number,
    currentOffset: number,
    codeStart: number,
    labels: Array<Label | null>,
    methodVisitor: MethodVisitor
  ): number {
    const buffer = this.classFileBuffer;
    const bytecodeOffset = currentOffset - codeStart;

    switch (opcode) {
      // Zero-operand instructions
      case Opcodes.NOP:
      case Opcodes.ACONST_NULL:
      case Opcodes.ICONST_M1:
      case Opcodes.ICONST_0:
      case Opcodes.ICONST_1:
      case Opcodes.ICONST_2:
      case Opcodes.ICONST_3:
      case Opcodes.ICONST_4:
      case Opcodes.ICONST_5:
      case Opcodes.LCONST_0:
      case Opcodes.LCONST_1:
      case Opcodes.FCONST_0:
      case Opcodes.FCONST_1:
      case Opcodes.FCONST_2:
      case Opcodes.DCONST_0:
      case Opcodes.DCONST_1:
      case Opcodes.IALOAD:
      case Opcodes.LALOAD:
      case Opcodes.FALOAD:
      case Opcodes.DALOAD:
      case Opcodes.AALOAD:
      case Opcodes.BALOAD:
      case Opcodes.CALOAD:
      case Opcodes.SALOAD:
      case Opcodes.IASTORE:
      case Opcodes.LASTORE:
      case Opcodes.FASTORE:
      case Opcodes.DASTORE:
      case Opcodes.AASTORE:
      case Opcodes.BASTORE:
      case Opcodes.CASTORE:
      case Opcodes.SASTORE:
      case Opcodes.POP:
      case Opcodes.POP2:
      case Opcodes.DUP:
      case Opcodes.DUP_X1:
      case Opcodes.DUP_X2:
      case Opcodes.DUP2:
      case Opcodes.DUP2_X1:
      case Opcodes.DUP2_X2:
      case Opcodes.SWAP:
      case Opcodes.IADD:
      case Opcodes.LADD:
      case Opcodes.FADD:
      case Opcodes.DADD:
      case Opcodes.ISUB:
      case Opcodes.LSUB:
      case Opcodes.FSUB:
      case Opcodes.DSUB:
      case Opcodes.IMUL:
      case Opcodes.LMUL:
      case Opcodes.FMUL:
      case Opcodes.DMUL:
      case Opcodes.IDIV:
      case Opcodes.LDIV:
      case Opcodes.FDIV:
      case Opcodes.DDIV:
      case Opcodes.IREM:
      case Opcodes.LREM:
      case Opcodes.FREM:
      case Opcodes.DREM:
      case Opcodes.INEG:
      case Opcodes.LNEG:
      case Opcodes.FNEG:
      case Opcodes.DNEG:
      case Opcodes.ISHL:
      case Opcodes.LSHL:
      case Opcodes.ISHR:
      case Opcodes.LSHR:
      case Opcodes.IUSHR:
      case Opcodes.LUSHR:
      case Opcodes.IAND:
      case Opcodes.LAND:
      case Opcodes.IOR:
      case Opcodes.LOR:
      case Opcodes.IXOR:
      case Opcodes.LXOR:
      case Opcodes.I2L:
      case Opcodes.I2F:
      case Opcodes.I2D:
      case Opcodes.L2I:
      case Opcodes.L2F:
      case Opcodes.L2D:
      case Opcodes.F2I:
      case Opcodes.F2L:
      case Opcodes.F2D:
      case Opcodes.D2I:
      case Opcodes.D2L:
      case Opcodes.D2F:
      case Opcodes.I2B:
      case Opcodes.I2C:
      case Opcodes.I2S:
      case Opcodes.LCMP:
      case Opcodes.FCMPL:
      case Opcodes.FCMPG:
      case Opcodes.DCMPL:
      case Opcodes.DCMPG:
      case Opcodes.IRETURN:
      case Opcodes.LRETURN:
      case Opcodes.FRETURN:
      case Opcodes.DRETURN:
      case Opcodes.ARETURN:
      case Opcodes.RETURN:
      case Opcodes.ARRAYLENGTH:
      case Opcodes.ATHROW:
      case Opcodes.MONITORENTER:
      case Opcodes.MONITOREXIT:
        methodVisitor.visitInsn(opcode);
        return currentOffset + 1;

      // Optimized xLOAD_n
      case 26: case 27: case 28: case 29: // ILOAD_0-3
        methodVisitor.visitVarInsn(Opcodes.ILOAD, opcode - 26);
        return currentOffset + 1;
      case 30: case 31: case 32: case 33: // LLOAD_0-3
        methodVisitor.visitVarInsn(Opcodes.LLOAD, opcode - 30);
        return currentOffset + 1;
      case 34: case 35: case 36: case 37: // FLOAD_0-3
        methodVisitor.visitVarInsn(Opcodes.FLOAD, opcode - 34);
        return currentOffset + 1;
      case 38: case 39: case 40: case 41: // DLOAD_0-3
        methodVisitor.visitVarInsn(Opcodes.DLOAD, opcode - 38);
        return currentOffset + 1;
      case 42: case 43: case 44: case 45: // ALOAD_0-3
        methodVisitor.visitVarInsn(Opcodes.ALOAD, opcode - 42);
        return currentOffset + 1;

      // Optimized xSTORE_n
      case 59: case 60: case 61: case 62: // ISTORE_0-3
        methodVisitor.visitVarInsn(Opcodes.ISTORE, opcode - 59);
        return currentOffset + 1;
      case 63: case 64: case 65: case 66: // LSTORE_0-3
        methodVisitor.visitVarInsn(Opcodes.LSTORE, opcode - 63);
        return currentOffset + 1;
      case 67: case 68: case 69: case 70: // FSTORE_0-3
        methodVisitor.visitVarInsn(Opcodes.FSTORE, opcode - 67);
        return currentOffset + 1;
      case 71: case 72: case 73: case 74: // DSTORE_0-3
        methodVisitor.visitVarInsn(Opcodes.DSTORE, opcode - 71);
        return currentOffset + 1;
      case 75: case 76: case 77: case 78: // ASTORE_0-3
        methodVisitor.visitVarInsn(Opcodes.ASTORE, opcode - 75);
        return currentOffset + 1;

      // BIPUSH, SIPUSH
      case Opcodes.BIPUSH:
        methodVisitor.visitIntInsn(opcode, this.readSignedByte(currentOffset + 1));
        return currentOffset + 2;
      case Opcodes.SIPUSH:
        methodVisitor.visitIntInsn(opcode, this.readSignedShort(currentOffset + 1));
        return currentOffset + 3;

      // LDC
      case Opcodes.LDC:
        methodVisitor.visitLdcInsn(this.readConstantPoolValue(buffer[currentOffset + 1]! & 0xFF));
        return currentOffset + 2;
      case 19: // LDC_W
        methodVisitor.visitLdcInsn(this.readConstantPoolValue(this.readUnsignedShort(currentOffset + 1)));
        return currentOffset + 3;
      case 20: // LDC2_W
        methodVisitor.visitLdcInsn(this.readConstantPoolValue(this.readUnsignedShort(currentOffset + 1)));
        return currentOffset + 3;

      // xLOAD, xSTORE
      case Opcodes.ILOAD:
      case Opcodes.LLOAD:
      case Opcodes.FLOAD:
      case Opcodes.DLOAD:
      case Opcodes.ALOAD:
      case Opcodes.ISTORE:
      case Opcodes.LSTORE:
      case Opcodes.FSTORE:
      case Opcodes.DSTORE:
      case Opcodes.ASTORE:
      case Opcodes.RET:
        methodVisitor.visitVarInsn(opcode, buffer[currentOffset + 1]! & 0xFF);
        return currentOffset + 2;

      // IINC
      case Opcodes.IINC:
        methodVisitor.visitIincInsn(
          buffer[currentOffset + 1]! & 0xFF,
          this.readSignedByte(currentOffset + 2)
        );
        return currentOffset + 3;

      // Jump instructions
      case Opcodes.IFEQ:
      case Opcodes.IFNE:
      case Opcodes.IFLT:
      case Opcodes.IFGE:
      case Opcodes.IFGT:
      case Opcodes.IFLE:
      case Opcodes.IF_ICMPEQ:
      case Opcodes.IF_ICMPNE:
      case Opcodes.IF_ICMPLT:
      case Opcodes.IF_ICMPGE:
      case Opcodes.IF_ICMPGT:
      case Opcodes.IF_ICMPLE:
      case Opcodes.IF_ACMPEQ:
      case Opcodes.IF_ACMPNE:
      case Opcodes.GOTO:
      case Opcodes.JSR:
      case Opcodes.IFNULL:
      case Opcodes.IFNONNULL: {
        const target = bytecodeOffset + this.readSignedShort(currentOffset + 1);
        methodVisitor.visitJumpInsn(opcode, this.getOrCreateLabel(labels, target));
        return currentOffset + 3;
      }

      // GOTO_W, JSR_W
      case 200: // GOTO_W
      case 201: { // JSR_W
        const target = bytecodeOffset + this.readInt(currentOffset + 1);
        methodVisitor.visitJumpInsn(opcode === 200 ? Opcodes.GOTO : Opcodes.JSR, this.getOrCreateLabel(labels, target));
        return currentOffset + 5;
      }

      // TABLESWITCH
      case Opcodes.TABLESWITCH: {
        const padding = (4 - ((bytecodeOffset + 1) % 4)) % 4;
        let switchOffset = currentOffset + 1 + padding;
        const defaultTarget = this.getOrCreateLabel(labels, bytecodeOffset + this.readInt(switchOffset));
        const low = this.readInt(switchOffset + 4);
        const high = this.readInt(switchOffset + 8);
        switchOffset += 12;
        const caseLabels: Label[] = [];
        for (let i = low; i <= high; i++) {
          caseLabels.push(this.getOrCreateLabel(labels, bytecodeOffset + this.readInt(switchOffset)));
          switchOffset += 4;
        }
        methodVisitor.visitTableSwitchInsn(low, high, defaultTarget, ...caseLabels);
        return switchOffset;
      }

      // LOOKUPSWITCH
      case Opcodes.LOOKUPSWITCH: {
        const padding = (4 - ((bytecodeOffset + 1) % 4)) % 4;
        let switchOffset = currentOffset + 1 + padding;
        const defaultTarget = this.getOrCreateLabel(labels, bytecodeOffset + this.readInt(switchOffset));
        const npairs = this.readInt(switchOffset + 4);
        switchOffset += 8;
        const keys: number[] = [];
        const caseLabels: Label[] = [];
        for (let i = 0; i < npairs; i++) {
          keys.push(this.readInt(switchOffset));
          caseLabels.push(this.getOrCreateLabel(labels, bytecodeOffset + this.readInt(switchOffset + 4)));
          switchOffset += 8;
        }
        methodVisitor.visitLookupSwitchInsn(defaultTarget, keys, caseLabels);
        return switchOffset;
      }

      // Field and method instructions
      case Opcodes.GETSTATIC:
      case Opcodes.PUTSTATIC:
      case Opcodes.GETFIELD:
      case Opcodes.PUTFIELD: {
        const cpIndex = this.readUnsignedShort(currentOffset + 1);
        const [owner, name, descriptor] = this.readFieldref(cpIndex);
        methodVisitor.visitFieldInsn(opcode, owner, name, descriptor);
        return currentOffset + 3;
      }

      case Opcodes.INVOKEVIRTUAL:
      case Opcodes.INVOKESPECIAL:
      case Opcodes.INVOKESTATIC: {
        const cpIndex = this.readUnsignedShort(currentOffset + 1);
        const [owner, name, descriptor, isInterface] = this.readMethodref(cpIndex);
        methodVisitor.visitMethodInsn(opcode, owner, name, descriptor, isInterface);
        return currentOffset + 3;
      }

      case Opcodes.INVOKEINTERFACE: {
        const cpIndex = this.readUnsignedShort(currentOffset + 1);
        const [owner, name, descriptor] = this.readInterfaceMethodref(cpIndex);
        methodVisitor.visitMethodInsn(opcode, owner, name, descriptor, true);
        return currentOffset + 5;
      }

      case Opcodes.INVOKEDYNAMIC: {
        const cpIndex = this.readUnsignedShort(currentOffset + 1);
        const [name, descriptor, bsm, bsmArgs] = this.readInvokeDynamic(cpIndex);
        methodVisitor.visitInvokeDynamicInsn(name, descriptor, bsm, ...bsmArgs);
        return currentOffset + 5;
      }

      // Type instructions
      case Opcodes.NEW:
      case Opcodes.ANEWARRAY:
      case Opcodes.CHECKCAST:
      case Opcodes.INSTANCEOF: {
        const type = this.readClass(this.readUnsignedShort(currentOffset + 1));
        methodVisitor.visitTypeInsn(opcode, type);
        return currentOffset + 3;
      }

      // NEWARRAY
      case Opcodes.NEWARRAY:
        methodVisitor.visitIntInsn(opcode, buffer[currentOffset + 1]! & 0xFF);
        return currentOffset + 2;

      // MULTIANEWARRAY
      case Opcodes.MULTIANEWARRAY: {
        const type = this.readClass(this.readUnsignedShort(currentOffset + 1));
        const dimensions = buffer[currentOffset + 3]! & 0xFF;
        methodVisitor.visitMultiANewArrayInsn(type, dimensions);
        return currentOffset + 4;
      }

      // WIDE
      case 196: {
        const wideOpcode = buffer[currentOffset + 1]! & 0xFF;
        if (wideOpcode === Opcodes.IINC) {
          methodVisitor.visitIincInsn(
            this.readUnsignedShort(currentOffset + 2),
            this.readSignedShort(currentOffset + 4)
          );
          return currentOffset + 6;
        } else {
          methodVisitor.visitVarInsn(wideOpcode, this.readUnsignedShort(currentOffset + 2));
          return currentOffset + 4;
        }
      }

      default:
        throw new Error('Unknown opcode: ' + opcode);
    }
  }

  // Helper methods

  private getOrCreateLabel(labels: Array<Label | null>, bytecodeOffset: number): Label {
    if (labels[bytecodeOffset] === null) {
      labels[bytecodeOffset] = new Label();
    }
    return labels[bytecodeOffset]!;
  }

  private getOpcodeSize(opcode: number): number {
    // Return basic size (will be corrected in visitInstruction for complex ops)
    if (opcode <= 15) return 1; // NOP to DCONST_1
    if (opcode <= 17) return 2; // BIPUSH, SIPUSH are handled separately
    if (opcode === 18) return 2; // LDC
    if (opcode <= 20) return 3; // LDC_W, LDC2_W
    if (opcode <= 25) return 2; // xLOAD
    if (opcode <= 45) return 1; // xLOAD_n
    if (opcode <= 53) return 1; // xALOAD
    if (opcode <= 58) return 2; // xSTORE
    if (opcode <= 78) return 1; // xSTORE_n
    if (opcode <= 86) return 1; // xASTORE
    if (opcode <= 95) return 1; // Stack ops
    if (opcode <= 131) return 1; // Math ops
    if (opcode === 132) return 3; // IINC
    if (opcode <= 147) return 1; // Conversions
    if (opcode <= 152) return 1; // Comparisons
    if (opcode <= 168) return 3; // Jumps
    if (opcode === 169) return 2; // RET
    if (opcode === 170) return -1; // TABLESWITCH - variable
    if (opcode === 171) return -1; // LOOKUPSWITCH - variable
    if (opcode <= 177) return 1; // Returns
    if (opcode <= 181) return 3; // Field instructions
    if (opcode <= 184) return 3; // Method instructions
    if (opcode === 185) return 5; // INVOKEINTERFACE
    if (opcode === 186) return 5; // INVOKEDYNAMIC
    if (opcode === 187) return 3; // NEW
    if (opcode === 188) return 2; // NEWARRAY
    if (opcode === 189) return 3; // ANEWARRAY
    if (opcode <= 191) return 1; // ARRAYLENGTH, ATHROW
    if (opcode <= 193) return 3; // CHECKCAST, INSTANCEOF
    if (opcode <= 195) return 1; // MONITORENTER, MONITOREXIT
    if (opcode === 196) return -1; // WIDE - variable
    if (opcode === 197) return 4; // MULTIANEWARRAY
    if (opcode <= 199) return 3; // IFNULL, IFNONNULL
    if (opcode <= 201) return 5; // GOTO_W, JSR_W
    return 1;
  }

  readUnsignedShort(offset: number): number {
    const buffer = this.classFileBuffer;
    return ((buffer[offset]! << 8) | buffer[offset + 1]!) & 0xFFFF;
  }

  readSignedShort(offset: number): number {
    const value = this.readUnsignedShort(offset);
    return value > 32767 ? value - 65536 : value;
  }

  readSignedByte(offset: number): number {
    const value = this.classFileBuffer[offset]! & 0xFF;
    return value > 127 ? value - 256 : value;
  }

  readInt(offset: number): number {
    const buffer = this.classFileBuffer;
    return (
      (buffer[offset]! << 24) |
      (buffer[offset + 1]! << 16) |
      (buffer[offset + 2]! << 8) |
      buffer[offset + 3]!
    );
  }

  /**
   * Reads an unsigned 32-bit integer from the class file buffer.
   * @param offset the offset in the buffer
   * @returns the unsigned integer value
   */
  readUnsignedInt(offset: number): number {
    return this.readInt(offset) >>> 0;
  }

  readLong(offset: number): bigint {
    const high = this.readInt(offset);
    const low = this.readInt(offset + 4);
    return (BigInt(high) << 32n) | BigInt(low >>> 0);
  }

  readClass(cpIndex: number): string {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const nameIndex = this.readUnsignedShort(offset);
    return this.readUTF8(this.cpInfoOffsets[nameIndex]!);
  }

  readClassOrNull(cpIndex: number): string | null {
    return cpIndex === 0 ? null : this.readClass(cpIndex);
  }

  readUTF8(offset: number): string {
    const length = this.readUnsignedShort(offset);
    const buffer = this.classFileBuffer;
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer.subarray(offset + 2, offset + 2 + length));
  }

  readUTF8OrNull(cpIndex: number): string | null {
    if (cpIndex === 0) return null;
    return this.readUTF8(this.cpInfoOffsets[cpIndex]!);
  }

  readUTF8Extended(offset: number, length: number): string {
    const buffer = this.classFileBuffer;
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer.subarray(offset, offset + length));
  }

  readConstantPoolValue(cpIndex: number): unknown {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const tag = this.classFileBuffer[offset - 1]!;

    switch (tag) {
      case CONSTANT_INTEGER:
        return this.readInt(offset);
      case CONSTANT_FLOAT: {
        const bits = this.readInt(offset);
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setInt32(0, bits, false);
        return view.getFloat32(0, false);
      }
      case CONSTANT_LONG:
        return this.readLong(offset);
      case CONSTANT_DOUBLE: {
        const highBits = this.readInt(offset);
        const lowBits = this.readInt(offset + 4);
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setInt32(0, highBits, false);
        view.setInt32(4, lowBits, false);
        return view.getFloat64(0, false);
      }
      case CONSTANT_CLASS:
        return Type.getObjectType(this.readClass(cpIndex));
      case CONSTANT_STRING: {
        const stringIndex = this.readUnsignedShort(offset);
        return this.readUTF8(this.cpInfoOffsets[stringIndex]!);
      }
      case CONSTANT_METHOD_TYPE: {
        const descriptorIndex = this.readUnsignedShort(offset);
        return Type.getMethodType(this.readUTF8(this.cpInfoOffsets[descriptorIndex]!));
      }
      case CONSTANT_METHOD_HANDLE: {
        const referenceKind = this.classFileBuffer[offset]! & 0xFF;
        const referenceIndex = this.readUnsignedShort(offset + 1);
        const refOffset = this.cpInfoOffsets[referenceIndex]!;
        const refTag = this.classFileBuffer[refOffset - 1]!;

        const classIndex = this.readUnsignedShort(refOffset);
        const nameAndTypeIndex = this.readUnsignedShort(refOffset + 2);
        const owner = this.readClass(classIndex);
        const nameTypeOffset = this.cpInfoOffsets[nameAndTypeIndex]!;
        const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset)]!);
        const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset + 2)]!);
        const isInterface = refTag === CONSTANT_INTERFACE_METHODREF;

        return new Handle(referenceKind, owner, name, descriptor, isInterface);
      }
      case CONSTANT_DYNAMIC: {
        const bootstrapMethodIndex = this.readUnsignedShort(offset);
        const nameAndTypeIndex = this.readUnsignedShort(offset + 2);
        const nameTypeOffset = this.cpInfoOffsets[nameAndTypeIndex]!;
        const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset)]!);
        const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset + 2)]!);
        const [handle, bsmArgs] = this.readBootstrapMethod(bootstrapMethodIndex);
        return new ConstantDynamic(name, descriptor, handle, bsmArgs);
      }
      default:
        throw new Error('Unknown constant pool tag: ' + tag);
    }
  }

  private readFieldref(cpIndex: number): [string, string, string] {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const classIndex = this.readUnsignedShort(offset);
    const nameAndTypeIndex = this.readUnsignedShort(offset + 2);
    const owner = this.readClass(classIndex);
    const nameTypeOffset = this.cpInfoOffsets[nameAndTypeIndex]!;
    const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset)]!);
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset + 2)]!);
    return [owner, name, descriptor];
  }

  private readMethodref(cpIndex: number): [string, string, string, boolean] {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const tag = this.classFileBuffer[offset - 1]!;
    const classIndex = this.readUnsignedShort(offset);
    const nameAndTypeIndex = this.readUnsignedShort(offset + 2);
    const owner = this.readClass(classIndex);
    const nameTypeOffset = this.cpInfoOffsets[nameAndTypeIndex]!;
    const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset)]!);
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset + 2)]!);
    const isInterface = tag === CONSTANT_INTERFACE_METHODREF;
    return [owner, name, descriptor, isInterface];
  }

  private readInterfaceMethodref(cpIndex: number): [string, string, string] {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const classIndex = this.readUnsignedShort(offset);
    const nameAndTypeIndex = this.readUnsignedShort(offset + 2);
    const owner = this.readClass(classIndex);
    const nameTypeOffset = this.cpInfoOffsets[nameAndTypeIndex]!;
    const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset)]!);
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset + 2)]!);
    return [owner, name, descriptor];
  }

  private readInvokeDynamic(cpIndex: number): [string, string, Handle, unknown[]] {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const bootstrapMethodAttrIndex = this.readUnsignedShort(offset);
    const nameAndTypeIndex = this.readUnsignedShort(offset + 2);
    const nameTypeOffset = this.cpInfoOffsets[nameAndTypeIndex]!;
    const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset)]!);
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(nameTypeOffset + 2)]!);

    // Read bootstrap method
    const [handle, bsmArgs] = this.readBootstrapMethod(bootstrapMethodAttrIndex);
    return [name, descriptor, handle, bsmArgs];
  }

  /**
   * Reads a bootstrap method entry.
   */
  private readBootstrapMethod(bootstrapMethodIndex: number): [Handle, unknown[]] {
    if (this.bootstrapMethodOffsets === null || this.bootstrapMethodOffsets[bootstrapMethodIndex] === undefined) {
      // Fallback for classes without BootstrapMethods attribute
      return [new Handle(6, 'java/lang/invoke/LambdaMetafactory', 'metafactory',
        '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/CallSite;', false), []];
    }

    const bsmOffset = this.bootstrapMethodOffsets[bootstrapMethodIndex]!;
    const methodHandleIndex = this.readUnsignedShort(bsmOffset);
    const numBootstrapArguments = this.readUnsignedShort(bsmOffset + 2);

    // Read the method handle
    const handle = this.readConstantPoolValue(methodHandleIndex) as Handle;

    // Read the bootstrap arguments
    const bsmArgs: unknown[] = [];
    let currentOffset = bsmOffset + 4;
    for (let i = 0; i < numBootstrapArguments; i++) {
      const argIndex = this.readUnsignedShort(currentOffset);
      bsmArgs.push(this.readConstantPoolValue(argIndex));
      currentOffset += 2;
    }

    return [handle, bsmArgs];
  }

  private readAnnotations(offset: number, visible: boolean, classVisitor: ClassVisitor): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      currentOffset += 2;
      const annotationVisitor = classVisitor.visitAnnotation(descriptor, visible);
      currentOffset = this.readAnnotationValues(currentOffset, annotationVisitor);
    }
  }

  private readFieldAnnotations(offset: number, visible: boolean, fieldVisitor: FieldVisitor): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      currentOffset += 2;
      const annotationVisitor = fieldVisitor.visitAnnotation(descriptor, visible);
      currentOffset = this.readAnnotationValues(currentOffset, annotationVisitor);
    }
  }

  private readMethodAnnotations(offset: number, visible: boolean, methodVisitor: MethodVisitor): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      currentOffset += 2;
      const annotationVisitor = methodVisitor.visitAnnotation(descriptor, visible);
      currentOffset = this.readAnnotationValues(currentOffset, annotationVisitor);
    }
  }

  /**
   * Reads parameter annotations.
   */
  private readParameterAnnotations(
    offset: number,
    methodDescriptor: string,
    visible: boolean,
    methodVisitor: MethodVisitor
  ): void {
    const numParameters = this.classFileBuffer[offset]! & 0xFF;
    let currentOffset = offset + 1;

    // Notify the visitor about the annotable parameter count
    methodVisitor.visitAnnotableParameterCount(numParameters, visible);

    for (let i = 0; i < numParameters; i++) {
      let numAnnotations = this.readUnsignedShort(currentOffset);
      currentOffset += 2;
      while (numAnnotations-- > 0) {
        const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
        currentOffset += 2;
        const annotationVisitor = methodVisitor.visitParameterAnnotation(i, descriptor, visible);
        currentOffset = this.readAnnotationValues(currentOffset, annotationVisitor);
      }
    }
  }

  /**
   * Reads type annotations on a class.
   */
  private readTypeAnnotations(offset: number, visible: boolean, classVisitor: ClassVisitor): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      currentOffset = this.readTypeAnnotation(currentOffset, visible, {
        visitTypeAnnotation: (typeRef, typePath, descriptor, vis) =>
          classVisitor.visitTypeAnnotation(typeRef, typePath, descriptor, vis)
      });
    }
  }

  /**
   * Reads type annotations on a field.
   */
  private readFieldTypeAnnotations(offset: number, visible: boolean, fieldVisitor: FieldVisitor): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      currentOffset = this.readTypeAnnotation(currentOffset, visible, {
        visitTypeAnnotation: (typeRef, typePath, descriptor, vis) =>
          fieldVisitor.visitTypeAnnotation(typeRef, typePath, descriptor, vis)
      });
    }
  }

  /**
   * Reads type annotations on a method.
   */
  private readMethodTypeAnnotations(offset: number, visible: boolean, methodVisitor: MethodVisitor): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      currentOffset = this.readTypeAnnotation(currentOffset, visible, {
        visitTypeAnnotation: (typeRef, typePath, descriptor, vis) =>
          methodVisitor.visitTypeAnnotation(typeRef, typePath, descriptor, vis)
      });
    }
  }

  /**
   * Reads a single type annotation and calls the visitor.
   */
  private readTypeAnnotation(
    offset: number,
    visible: boolean,
    visitor: { visitTypeAnnotation: (typeRef: number, typePath: TypePath | null, descriptor: string, visible: boolean) => AnnotationVisitor | null }
  ): number {
    let currentOffset = offset;

    // Read target_type
    const targetType = this.classFileBuffer[currentOffset]! & 0xFF;
    currentOffset++;

    // Read target_info based on target_type
    let targetInfo: number;
    switch (targetType) {
      case TypeReference.CLASS_TYPE_PARAMETER:
      case TypeReference.METHOD_TYPE_PARAMETER:
        // type_parameter_index (u1)
        targetInfo = (targetType << 24) | ((this.classFileBuffer[currentOffset]! & 0xFF) << 16);
        currentOffset++;
        break;

      case TypeReference.CLASS_EXTENDS:
        // supertype_index (u2)
        targetInfo = (targetType << 24) | (this.readUnsignedShort(currentOffset) << 8);
        currentOffset += 2;
        break;

      case TypeReference.CLASS_TYPE_PARAMETER_BOUND:
      case TypeReference.METHOD_TYPE_PARAMETER_BOUND:
        // type_parameter_index (u1), bound_index (u1)
        targetInfo = (targetType << 24) |
          ((this.classFileBuffer[currentOffset]! & 0xFF) << 16) |
          ((this.classFileBuffer[currentOffset + 1]! & 0xFF) << 8);
        currentOffset += 2;
        break;

      case TypeReference.FIELD:
      case TypeReference.METHOD_RETURN:
      case TypeReference.METHOD_RECEIVER:
        // empty_target
        targetInfo = targetType << 24;
        break;

      case TypeReference.METHOD_FORMAL_PARAMETER:
        // formal_parameter_index (u1)
        targetInfo = (targetType << 24) | ((this.classFileBuffer[currentOffset]! & 0xFF) << 16);
        currentOffset++;
        break;

      case TypeReference.THROWS:
        // throws_type_index (u2)
        targetInfo = (targetType << 24) | (this.readUnsignedShort(currentOffset) << 8);
        currentOffset += 2;
        break;

      case TypeReference.LOCAL_VARIABLE:
      case TypeReference.RESOURCE_VARIABLE:
        // localvar_target: table_length (u2), then [start_pc, length, index] entries
        const tableLength = this.readUnsignedShort(currentOffset);
        currentOffset += 2 + tableLength * 6;
        targetInfo = targetType << 24;
        break;

      case TypeReference.EXCEPTION_PARAMETER:
        // catch_target: exception_table_index (u2)
        targetInfo = (targetType << 24) | (this.readUnsignedShort(currentOffset) << 8);
        currentOffset += 2;
        break;

      case TypeReference.INSTANCEOF:
      case TypeReference.NEW:
      case TypeReference.CONSTRUCTOR_REFERENCE:
      case TypeReference.METHOD_REFERENCE:
        // offset_target: offset (u2)
        currentOffset += 2; // Skip the offset
        targetInfo = targetType << 24;
        break;

      case TypeReference.CAST:
      case TypeReference.CONSTRUCTOR_INVOCATION_TYPE_ARGUMENT:
      case TypeReference.METHOD_INVOCATION_TYPE_ARGUMENT:
      case TypeReference.CONSTRUCTOR_REFERENCE_TYPE_ARGUMENT:
      case TypeReference.METHOD_REFERENCE_TYPE_ARGUMENT:
        // type_argument_target: offset (u2), type_argument_index (u1)
        currentOffset += 2; // Skip offset
        targetInfo = (targetType << 24) | (this.classFileBuffer[currentOffset]! & 0xFF);
        currentOffset++;
        break;

      default:
        throw new Error('Unknown type annotation target_type: 0x' + targetType.toString(16));
    }

    // Read type_path
    const pathLength = this.classFileBuffer[currentOffset]! & 0xFF;
    let typePath: TypePath | null = null;
    if (pathLength > 0) {
      typePath = new TypePath(this.classFileBuffer, currentOffset);
    }
    currentOffset += 1 + pathLength * 2;

    // Read annotation descriptor
    const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
    currentOffset += 2;

    // Visit the type annotation
    const annotationVisitor = visitor.visitTypeAnnotation(targetInfo, typePath, descriptor, visible);

    // Read annotation values
    return this.readAnnotationValues(currentOffset, annotationVisitor);
  }

  /**
   * Reads the Module, ModulePackages, and ModuleMainClass attributes.
   */
  private readModule(
    moduleOffset: number,
    modulePackagesOffset: number,
    moduleMainClassOffset: number,
    classVisitor: ClassVisitor
  ): void {
    let currentOffset = moduleOffset;

    // Read module name
    const moduleNameIndex = this.readUnsignedShort(currentOffset);
    const moduleName = this.readModule_name(moduleNameIndex);

    // Read module flags
    const moduleFlags = this.readUnsignedShort(currentOffset + 2);

    // Read module version
    const moduleVersionIndex = this.readUnsignedShort(currentOffset + 4);
    const moduleVersion = moduleVersionIndex === 0 ? null : this.readUTF8(this.cpInfoOffsets[moduleVersionIndex]!);
    currentOffset += 6;

    // Visit module
    const moduleVisitor = classVisitor.visitModule(moduleName, moduleFlags, moduleVersion);
    if (moduleVisitor === null) {
      return;
    }

    // Visit main class
    if (moduleMainClassOffset !== 0) {
      moduleVisitor.visitMainClass(this.readClass(this.readUnsignedShort(moduleMainClassOffset)));
    }

    // Visit packages
    if (modulePackagesOffset !== 0) {
      let packageCount = this.readUnsignedShort(modulePackagesOffset);
      let offset = modulePackagesOffset + 2;
      while (packageCount-- > 0) {
        moduleVisitor.visitPackage(this.readPackage(this.readUnsignedShort(offset)));
        offset += 2;
      }
    }

    // Read requires
    let requiresCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (requiresCount-- > 0) {
      const requiresModuleName = this.readModule_name(this.readUnsignedShort(currentOffset));
      const requiresFlags = this.readUnsignedShort(currentOffset + 2);
      const requiresVersionIndex = this.readUnsignedShort(currentOffset + 4);
      const requiresVersion = requiresVersionIndex === 0 ? null : this.readUTF8(this.cpInfoOffsets[requiresVersionIndex]!);
      moduleVisitor.visitRequire(requiresModuleName, requiresFlags, requiresVersion);
      currentOffset += 6;
    }

    // Read exports
    let exportsCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (exportsCount-- > 0) {
      const exportsPackage = this.readPackage(this.readUnsignedShort(currentOffset));
      const exportsFlags = this.readUnsignedShort(currentOffset + 2);
      const exportsToCount = this.readUnsignedShort(currentOffset + 4);
      currentOffset += 6;
      let exportsTo: string[] | null = null;
      if (exportsToCount > 0) {
        exportsTo = [];
        for (let i = 0; i < exportsToCount; i++) {
          exportsTo.push(this.readModule_name(this.readUnsignedShort(currentOffset)));
          currentOffset += 2;
        }
      }
      moduleVisitor.visitExport(exportsPackage, exportsFlags, exportsTo);
    }

    // Read opens
    let opensCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (opensCount-- > 0) {
      const opensPackage = this.readPackage(this.readUnsignedShort(currentOffset));
      const opensFlags = this.readUnsignedShort(currentOffset + 2);
      const opensToCount = this.readUnsignedShort(currentOffset + 4);
      currentOffset += 6;
      let opensTo: string[] | null = null;
      if (opensToCount > 0) {
        opensTo = [];
        for (let i = 0; i < opensToCount; i++) {
          opensTo.push(this.readModule_name(this.readUnsignedShort(currentOffset)));
          currentOffset += 2;
        }
      }
      moduleVisitor.visitOpen(opensPackage, opensFlags, opensTo);
    }

    // Read uses
    let usesCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (usesCount-- > 0) {
      moduleVisitor.visitUse(this.readClass(this.readUnsignedShort(currentOffset)));
      currentOffset += 2;
    }

    // Read provides
    let providesCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;
    while (providesCount-- > 0) {
      const providesService = this.readClass(this.readUnsignedShort(currentOffset));
      const providesWithCount = this.readUnsignedShort(currentOffset + 2);
      currentOffset += 4;
      const providesWith: string[] = [];
      for (let i = 0; i < providesWithCount; i++) {
        providesWith.push(this.readClass(this.readUnsignedShort(currentOffset)));
        currentOffset += 2;
      }
      moduleVisitor.visitProvide(providesService, providesWith);
    }

    moduleVisitor.visitEnd();
  }

  /**
   * Reads a CONSTANT_Module entry from the constant pool.
   */
  private readModule_name(cpIndex: number): string {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const nameIndex = this.readUnsignedShort(offset);
    return this.readUTF8(this.cpInfoOffsets[nameIndex]!);
  }

  /**
   * Reads a CONSTANT_Package entry from the constant pool.
   */
  private readPackage(cpIndex: number): string {
    const offset = this.cpInfoOffsets[cpIndex]!;
    const nameIndex = this.readUnsignedShort(offset);
    return this.readUTF8(this.cpInfoOffsets[nameIndex]!);
  }

  /**
   * Reads the Record attribute.
   */
  private readRecord(recordOffset: number, classVisitor: ClassVisitor): void {
    let currentOffset = recordOffset;
    const componentsCount = this.readUnsignedShort(currentOffset);
    currentOffset += 2;

    for (let i = 0; i < componentsCount; i++) {
      // Read component name and descriptor
      const componentName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      const componentDescriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset + 2)]!);
      currentOffset += 4;

      // Read component attributes
      let componentSignature: string | null = null;
      let runtimeVisibleAnnotationsOffset = 0;
      let runtimeInvisibleAnnotationsOffset = 0;
      let runtimeVisibleTypeAnnotationsOffset = 0;
      let runtimeInvisibleTypeAnnotationsOffset = 0;

      const componentAttributeCount = this.readUnsignedShort(currentOffset);
      currentOffset += 2;

      for (let j = 0; j < componentAttributeCount; j++) {
        const attributeName = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
        const attributeLength = this.readInt(currentOffset + 2);
        const attributeStart = currentOffset + 6;
        currentOffset = attributeStart + attributeLength;

        switch (attributeName) {
          case 'Signature':
            componentSignature = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(attributeStart)]!);
            break;
          case 'RuntimeVisibleAnnotations':
            runtimeVisibleAnnotationsOffset = attributeStart;
            break;
          case 'RuntimeInvisibleAnnotations':
            runtimeInvisibleAnnotationsOffset = attributeStart;
            break;
          case 'RuntimeVisibleTypeAnnotations':
            runtimeVisibleTypeAnnotationsOffset = attributeStart;
            break;
          case 'RuntimeInvisibleTypeAnnotations':
            runtimeInvisibleTypeAnnotationsOffset = attributeStart;
            break;
        }
      }

      // Visit the record component
      const recordComponentVisitor = classVisitor.visitRecordComponent(
        componentName,
        componentDescriptor,
        componentSignature
      );

      if (recordComponentVisitor !== null) {
        // Visit annotations
        if (runtimeVisibleAnnotationsOffset !== 0) {
          this.readRecordComponentAnnotations(runtimeVisibleAnnotationsOffset, true, recordComponentVisitor);
        }
        if (runtimeInvisibleAnnotationsOffset !== 0) {
          this.readRecordComponentAnnotations(runtimeInvisibleAnnotationsOffset, false, recordComponentVisitor);
        }

        // Visit type annotations
        if (runtimeVisibleTypeAnnotationsOffset !== 0) {
          this.readRecordComponentTypeAnnotations(runtimeVisibleTypeAnnotationsOffset, true, recordComponentVisitor);
        }
        if (runtimeInvisibleTypeAnnotationsOffset !== 0) {
          this.readRecordComponentTypeAnnotations(runtimeInvisibleTypeAnnotationsOffset, false, recordComponentVisitor);
        }

        recordComponentVisitor.visitEnd();
      }
    }
  }

  /**
   * Reads annotations on a record component.
   */
  private readRecordComponentAnnotations(
    offset: number,
    visible: boolean,
    recordComponentVisitor: RecordComponentVisitor
  ): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      const descriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      currentOffset += 2;
      const annotationVisitor = recordComponentVisitor.visitAnnotation(descriptor, visible);
      currentOffset = this.readAnnotationValues(currentOffset, annotationVisitor);
    }
  }

  /**
   * Reads type annotations on a record component.
   */
  private readRecordComponentTypeAnnotations(
    offset: number,
    visible: boolean,
    recordComponentVisitor: RecordComponentVisitor
  ): void {
    let count = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (count-- > 0) {
      currentOffset = this.readTypeAnnotation(currentOffset, visible, {
        visitTypeAnnotation: (typeRef, typePath, descriptor, vis) =>
          recordComponentVisitor.visitTypeAnnotation(typeRef, typePath, descriptor, vis)
      });
    }
  }

  private readAnnotationValues(offset: number, annotationVisitor: AnnotationVisitor | null): number {
    let numPairs = this.readUnsignedShort(offset);
    let currentOffset = offset + 2;
    while (numPairs-- > 0) {
      const name = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
      currentOffset = this.readElementValue(currentOffset + 2, name, annotationVisitor);
    }
    if (annotationVisitor !== null) {
      annotationVisitor.visitEnd();
    }
    return currentOffset;
  }

  private readElementValue(offset: number, name: string | null, annotationVisitor: AnnotationVisitor | null): number {
    const tag = this.classFileBuffer[offset]!;
    let currentOffset = offset + 1;

    if (annotationVisitor === null) {
      // Skip the value
      switch (tag) {
        case 'B'.charCodeAt(0):
        case 'C'.charCodeAt(0):
        case 'D'.charCodeAt(0):
        case 'F'.charCodeAt(0):
        case 'I'.charCodeAt(0):
        case 'J'.charCodeAt(0):
        case 'S'.charCodeAt(0):
        case 'Z'.charCodeAt(0):
        case 's'.charCodeAt(0):
        case 'c'.charCodeAt(0):
          return currentOffset + 2;
        case 'e'.charCodeAt(0):
          return currentOffset + 4;
        case '@'.charCodeAt(0):
          return this.readAnnotationValues(currentOffset + 2, null);
        case '['.charCodeAt(0): {
          let numValues = this.readUnsignedShort(currentOffset);
          currentOffset += 2;
          while (numValues-- > 0) {
            currentOffset = this.readElementValue(currentOffset, null, null);
          }
          return currentOffset;
        }
        default:
          throw new Error('Unknown annotation element tag: ' + String.fromCharCode(tag));
      }
    }

    switch (tag) {
      case 'B'.charCodeAt(0):
        annotationVisitor.visit(name, this.readInt(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!));
        return currentOffset + 2;
      case 'C'.charCodeAt(0):
        annotationVisitor.visit(name, String.fromCharCode(this.readInt(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!)));
        return currentOffset + 2;
      case 'D'.charCodeAt(0):
      case 'F'.charCodeAt(0):
      case 'I'.charCodeAt(0):
      case 'J'.charCodeAt(0):
        annotationVisitor.visit(name, this.readConstantPoolValue(this.readUnsignedShort(currentOffset)));
        return currentOffset + 2;
      case 'S'.charCodeAt(0):
        annotationVisitor.visit(name, this.readInt(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!) & 0xFFFF);
        return currentOffset + 2;
      case 'Z'.charCodeAt(0):
        annotationVisitor.visit(name, this.readInt(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!) !== 0);
        return currentOffset + 2;
      case 's'.charCodeAt(0):
        annotationVisitor.visit(name, this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!));
        return currentOffset + 2;
      case 'c'.charCodeAt(0):
        annotationVisitor.visit(name, Type.getType(this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!)));
        return currentOffset + 2;
      case 'e'.charCodeAt(0): {
        const enumDescriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
        const enumValue = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset + 2)]!);
        annotationVisitor.visitEnum(name, enumDescriptor, enumValue);
        return currentOffset + 4;
      }
      case '@'.charCodeAt(0): {
        const nestedDescriptor = this.readUTF8(this.cpInfoOffsets[this.readUnsignedShort(currentOffset)]!);
        const nestedVisitor = annotationVisitor.visitAnnotation(name, nestedDescriptor);
        return this.readAnnotationValues(currentOffset + 2, nestedVisitor);
      }
      case '['.charCodeAt(0): {
        let numValues = this.readUnsignedShort(currentOffset);
        currentOffset += 2;
        const arrayVisitor = annotationVisitor.visitArray(name);
        while (numValues-- > 0) {
          currentOffset = this.readElementValue(currentOffset, null, arrayVisitor);
        }
        if (arrayVisitor !== null) {
          arrayVisitor.visitEnd();
        }
        return currentOffset;
      }
      default:
        throw new Error('Unknown annotation element tag: ' + String.fromCharCode(tag));
    }
  }

}
