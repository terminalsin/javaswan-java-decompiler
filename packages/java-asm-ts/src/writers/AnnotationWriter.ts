import { ByteVector } from '../core/ByteVector';
import { AnnotationVisitor } from '../visitors/AnnotationVisitor';
import { SymbolTable } from '../core/SymbolTable';
import { TypePath } from '../core/TypePath';
import { Type } from '../core/Type';
import { ASM9 } from '../core/Opcodes';

/**
 * An AnnotationVisitor that generates the corresponding annotation structure.
 */
export class AnnotationWriter extends AnnotationVisitor {
  /** The symbol table. */
  private readonly symbolTable: SymbolTable;

  /** Whether this is a type annotation. */
  private readonly isTypeAnnotation: boolean;

  /** The annotation content. */
  private readonly annotation: ByteVector;

  /** Number of element-value pairs. */
  private numElementValuePairs: number = 0;

  /** Previous element-value pair offset (for updating count). */
  private readonly previousAnnotation: ByteVector | null;

  /** Next annotation in the list. */
  nextAnnotation: AnnotationWriter | null = null;

  /** Type annotation info (typeRef << 8 | typePath encoded length). */
  private readonly typeAnnotationInfo: ByteVector | null;

  /**
   * Constructs a new AnnotationWriter.
   * @internal Use static factory methods instead.
   */
  constructor(
    symbolTable: SymbolTable,
    isTypeAnnotation: boolean,
    annotation: ByteVector,
    previousAnnotation: ByteVector | null,
    typeAnnotationInfo: ByteVector | null
  ) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.isTypeAnnotation = isTypeAnnotation;
    this.annotation = annotation;
    this.previousAnnotation = previousAnnotation;
    this.typeAnnotationInfo = typeAnnotationInfo;
  }

  /**
   * Creates a new AnnotationWriter for a regular annotation.
   */
  static create(symbolTable: SymbolTable, descriptor: string): AnnotationWriter {
    const annotation = new ByteVector();
    annotation.putShort(symbolTable.addConstantUtf8(descriptor));
    annotation.putShort(0); // num_element_value_pairs placeholder
    return new AnnotationWriter(symbolTable, false, annotation, null, null);
  }

  /**
   * Creates a new AnnotationWriter for a type annotation.
   */
  static createTypeAnnotation(
    symbolTable: SymbolTable,
    typeRef: number,
    typePath: TypePath | null,
    descriptor: string
  ): AnnotationWriter {
    const typeAnnotationInfo = new ByteVector();
    
    // Write target_type and target_info
    const targetType = typeRef >>> 24;
    typeAnnotationInfo.putByte(targetType);
    
    switch (targetType) {
      case 0x00: // CLASS_TYPE_PARAMETER
      case 0x01: // METHOD_TYPE_PARAMETER
        typeAnnotationInfo.putByte(typeRef & 0xFF);
        break;
      case 0x10: // CLASS_EXTENDS
        typeAnnotationInfo.putShort((typeRef & 0xFFFF00) >> 8);
        break;
      case 0x11: // CLASS_TYPE_PARAMETER_BOUND
      case 0x12: // METHOD_TYPE_PARAMETER_BOUND
        typeAnnotationInfo.putByte((typeRef >> 8) & 0xFF);
        typeAnnotationInfo.putByte(typeRef & 0xFF);
        break;
      case 0x13: // FIELD
      case 0x14: // METHOD_RETURN
      case 0x15: // METHOD_RECEIVER
        // No target_info
        break;
      case 0x16: // METHOD_FORMAL_PARAMETER
        typeAnnotationInfo.putByte(typeRef & 0xFF);
        break;
      case 0x17: // THROWS
        typeAnnotationInfo.putShort((typeRef & 0xFFFF00) >> 8);
        break;
      // Other cases for local variable, etc.
      default:
        // For simplicity, write as 2-byte target_info
        typeAnnotationInfo.putShort((typeRef & 0xFFFF00) >> 8);
    }

    // Write type_path
    if (typePath === null) {
      typeAnnotationInfo.putByte(0);
    } else {
      const pathBytes = typePath.getRawBytes();
      typeAnnotationInfo.putByteArray(pathBytes, 0, pathBytes.length);
    }

    const annotation = new ByteVector();
    annotation.putShort(symbolTable.addConstantUtf8(descriptor));
    annotation.putShort(0); // num_element_value_pairs placeholder

    return new AnnotationWriter(symbolTable, true, annotation, null, typeAnnotationInfo);
  }

  override visit(name: string | null, value: unknown): void {
    this.numElementValuePairs++;
    if (name !== null) {
      this.annotation.putShort(this.symbolTable.addConstantUtf8(name));
    }
    this.writeElementValue(value);
  }

  override visitEnum(name: string | null, descriptor: string, value: string): void {
    this.numElementValuePairs++;
    if (name !== null) {
      this.annotation.putShort(this.symbolTable.addConstantUtf8(name));
    }
    this.annotation.putByte('e'.charCodeAt(0));
    this.annotation.putShort(this.symbolTable.addConstantUtf8(descriptor));
    this.annotation.putShort(this.symbolTable.addConstantUtf8(value));
  }

  override visitAnnotation(name: string | null, descriptor: string): AnnotationVisitor | null {
    this.numElementValuePairs++;
    if (name !== null) {
      this.annotation.putShort(this.symbolTable.addConstantUtf8(name));
    }
    this.annotation.putByte('@'.charCodeAt(0));
    
    const nestedAnnotation = new ByteVector();
    nestedAnnotation.putShort(this.symbolTable.addConstantUtf8(descriptor));
    nestedAnnotation.putShort(0); // placeholder
    
    return new AnnotationWriter(this.symbolTable, false, nestedAnnotation, this.annotation, null);
  }

  override visitArray(name: string | null): AnnotationVisitor | null {
    this.numElementValuePairs++;
    if (name !== null) {
      this.annotation.putShort(this.symbolTable.addConstantUtf8(name));
    }
    this.annotation.putByte('['.charCodeAt(0));
    this.annotation.putShort(0); // placeholder for array length
    
    return new ArrayAnnotationWriter(this.symbolTable, this.annotation);
  }

  override visitEnd(): void {
    // Update num_element_value_pairs
    this.annotation.setShort(2, this.numElementValuePairs);
    
    // Append to previous annotation if nested
    if (this.previousAnnotation !== null) {
      this.previousAnnotation.putByteArray(this.annotation.data, 0, this.annotation.length);
    }
  }

  private writeElementValue(value: unknown): void {
    if (typeof value === 'boolean') {
      this.annotation.putByte('Z'.charCodeAt(0));
      this.annotation.putShort(this.symbolTable.addConstantInteger(value ? 1 : 0).index);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        this.annotation.putByte('I'.charCodeAt(0));
        this.annotation.putShort(this.symbolTable.addConstantInteger(value).index);
      } else {
        this.annotation.putByte('D'.charCodeAt(0));
        this.annotation.putShort(this.symbolTable.addConstantDouble(value).index);
      }
    } else if (typeof value === 'bigint') {
      this.annotation.putByte('J'.charCodeAt(0));
      this.annotation.putShort(this.symbolTable.addConstantLong(value).index);
    } else if (typeof value === 'string') {
      this.annotation.putByte('s'.charCodeAt(0));
      this.annotation.putShort(this.symbolTable.addConstantUtf8(value));
    } else if (value instanceof Type) {
      this.annotation.putByte('c'.charCodeAt(0));
      this.annotation.putShort(this.symbolTable.addConstantUtf8(value.getDescriptor()));
    } else if (Array.isArray(value)) {
      // Primitive array
      this.annotation.putByte('['.charCodeAt(0));
      this.annotation.putShort(value.length);
      for (const element of value) {
        this.writeElementValue(element);
      }
    } else {
      throw new Error('Unsupported annotation value type: ' + typeof value);
    }
  }

  /**
   * Computes the size of all annotations in this list.
   */
  computeAnnotationsSize(): number {
    let size = 2; // num_annotations
    let writer: AnnotationWriter | null = this;
    while (writer !== null) {
      if (writer.isTypeAnnotation && writer.typeAnnotationInfo !== null) {
        size += writer.typeAnnotationInfo.length;
      }
      size += writer.annotation.length;
      writer = writer.nextAnnotation;
    }
    return size;
  }

  /**
   * Writes all annotations in this list.
   */
  putAnnotations(_symbolTable: SymbolTable, output: ByteVector): void {
    // Count annotations
    let count = 0;
    let writer: AnnotationWriter | null = this;
    while (writer !== null) {
      count++;
      writer = writer.nextAnnotation;
    }

    // Write size and annotations
    output.putInt(2 + this.computeAnnotationsSize() - 2);
    output.putShort(count);

    writer = this;
    while (writer !== null) {
      if (writer.isTypeAnnotation && writer.typeAnnotationInfo !== null) {
        output.putByteArray(writer.typeAnnotationInfo.data, 0, writer.typeAnnotationInfo.length);
      }
      output.putByteArray(writer.annotation.data, 0, writer.annotation.length);
      writer = writer.nextAnnotation;
    }
  }
}

/**
 * AnnotationVisitor for array values.
 */
class ArrayAnnotationWriter extends AnnotationVisitor {
  private readonly symbolTable: SymbolTable;
  private readonly parentAnnotation: ByteVector;
  private count: number = 0;
  private readonly startOffset: number;

  constructor(symbolTable: SymbolTable, parentAnnotation: ByteVector) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.parentAnnotation = parentAnnotation;
    this.startOffset = parentAnnotation.length - 2;
  }

  override visit(_name: string | null, value: unknown): void {
    this.count++;
    this.writeElementValue(value);
  }

  override visitEnum(_name: string | null, descriptor: string, value: string): void {
    this.count++;
    this.parentAnnotation.putByte('e'.charCodeAt(0));
    this.parentAnnotation.putShort(this.symbolTable.addConstantUtf8(descriptor));
    this.parentAnnotation.putShort(this.symbolTable.addConstantUtf8(value));
  }

  override visitAnnotation(_name: string | null, descriptor: string): AnnotationVisitor | null {
    this.count++;
    this.parentAnnotation.putByte('@'.charCodeAt(0));
    
    const nestedAnnotation = new ByteVector();
    nestedAnnotation.putShort(this.symbolTable.addConstantUtf8(descriptor));
    nestedAnnotation.putShort(0);
    
    return new AnnotationWriter(
      this.symbolTable,
      false,
      nestedAnnotation,
      this.parentAnnotation,
      null
    );
  }

  override visitArray(_name: string | null): AnnotationVisitor | null {
    this.count++;
    this.parentAnnotation.putByte('['.charCodeAt(0));
    this.parentAnnotation.putShort(0);
    return new ArrayAnnotationWriter(this.symbolTable, this.parentAnnotation);
  }

  override visitEnd(): void {
    this.parentAnnotation.setShort(this.startOffset, this.count);
  }

  private writeElementValue(value: unknown): void {
    if (typeof value === 'boolean') {
      this.parentAnnotation.putByte('Z'.charCodeAt(0));
      this.parentAnnotation.putShort(this.symbolTable.addConstantInteger(value ? 1 : 0).index);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        this.parentAnnotation.putByte('I'.charCodeAt(0));
        this.parentAnnotation.putShort(this.symbolTable.addConstantInteger(value).index);
      } else {
        this.parentAnnotation.putByte('D'.charCodeAt(0));
        this.parentAnnotation.putShort(this.symbolTable.addConstantDouble(value).index);
      }
    } else if (typeof value === 'bigint') {
      this.parentAnnotation.putByte('J'.charCodeAt(0));
      this.parentAnnotation.putShort(this.symbolTable.addConstantLong(value).index);
    } else if (typeof value === 'string') {
      this.parentAnnotation.putByte('s'.charCodeAt(0));
      this.parentAnnotation.putShort(this.symbolTable.addConstantUtf8(value));
    } else if (value instanceof Type) {
      this.parentAnnotation.putByte('c'.charCodeAt(0));
      this.parentAnnotation.putShort(this.symbolTable.addConstantUtf8(value.getDescriptor()));
    }
  }
}
