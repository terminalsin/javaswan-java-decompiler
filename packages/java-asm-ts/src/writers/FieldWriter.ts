import { ByteVector } from '../core/ByteVector';
import { FieldVisitor } from '../visitors/FieldVisitor';
import { AnnotationVisitor } from '../visitors/AnnotationVisitor';
import { Attribute } from '../attributes/Attribute';
import { SymbolTable } from '../core/SymbolTable';
import { TypePath } from '../core/TypePath';
import { ASM9, ACC_DEPRECATED, ACC_SYNTHETIC } from '../core/Opcodes';
import { AnnotationWriter } from './AnnotationWriter';

/**
 * A FieldVisitor that generates the corresponding field_info structure.
 */
export class FieldWriter extends FieldVisitor {
  /** Next field writer in the chain. */
  nextFieldWriter: FieldWriter | null = null;

  /** The symbol table. */
  private readonly symbolTable: SymbolTable;

  /** Access flags. */
  private readonly accessFlags: number;

  /** Name index. */
  private readonly nameIndex: number;

  /** Descriptor index. */
  private readonly descriptorIndex: number;

  /** Signature index. */
  private signatureIndex: number = 0;

  /** Constant value index. */
  private constantValueIndex: number = 0;

  /** Runtime visible annotations. */
  private runtimeVisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible annotations. */
  private runtimeInvisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime visible type annotations. */
  private runtimeVisibleTypeAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible type annotations. */
  private runtimeInvisibleTypeAnnotations: AnnotationWriter | null = null;

  /** Other attributes. */
  private firstAttribute: Attribute | null = null;

  /**
   * Constructs a new FieldWriter.
   */
  constructor(
    symbolTable: SymbolTable,
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    constantValue: unknown
  ) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.accessFlags = access;
    this.nameIndex = symbolTable.addConstantUtf8(name);
    this.descriptorIndex = symbolTable.addConstantUtf8(descriptor);

    if (signature !== null) {
      this.signatureIndex = symbolTable.addConstantUtf8(signature);
    }

    if (constantValue !== null) {
      this.constantValueIndex = symbolTable.addConstant(constantValue).index;
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

  override visitEnd(): void {
    // Nothing to do
  }

  /**
   * Computes the size of the field_info structure.
   */
  computeFieldInfoSize(): number {
    // access_flags + name_index + descriptor_index + attributes_count
    let size = 8;
    
    if (this.constantValueIndex !== 0) {
      this.symbolTable.addConstantUtf8('ConstantValue');
      size += 8;
    }
    
    if (this.signatureIndex !== 0) {
      this.symbolTable.addConstantUtf8('Signature');
      size += 8;
    }
    
    if ((this.accessFlags & ACC_DEPRECATED) !== 0) {
      this.symbolTable.addConstantUtf8('Deprecated');
      size += 6;
    }
    
    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) {
      this.symbolTable.addConstantUtf8('Synthetic');
      size += 6;
    }

    if (this.runtimeVisibleAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeVisibleAnnotations');
      size += 8 + this.runtimeVisibleAnnotations.computeAnnotationsSize();
    }

    if (this.runtimeInvisibleAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeInvisibleAnnotations');
      size += 8 + this.runtimeInvisibleAnnotations.computeAnnotationsSize();
    }

    if (this.runtimeVisibleTypeAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeVisibleTypeAnnotations');
      size += 8 + this.runtimeVisibleTypeAnnotations.computeAnnotationsSize();
    }

    if (this.runtimeInvisibleTypeAnnotations !== null) {
      this.symbolTable.addConstantUtf8('RuntimeInvisibleTypeAnnotations');
      size += 8 + this.runtimeInvisibleTypeAnnotations.computeAnnotationsSize();
    }

    if (this.firstAttribute !== null) {
      size += this.firstAttribute.computeAttributesSize(
        this.symbolTable,
        null,
        0,
        0,
        0
      );
    }

    return size;
  }

  /**
   * Writes the field_info structure.
   */
  putFieldInfo(output: ByteVector): void {
    const accessMask = ACC_DEPRECATED | ACC_SYNTHETIC;
    output.putShort(this.accessFlags & ~accessMask);
    output.putShort(this.nameIndex);
    output.putShort(this.descriptorIndex);

    // Count attributes
    let attributeCount = 0;
    if (this.constantValueIndex !== 0) attributeCount++;
    if (this.signatureIndex !== 0) attributeCount++;
    if ((this.accessFlags & ACC_DEPRECATED) !== 0) attributeCount++;
    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) attributeCount++;
    if (this.runtimeVisibleAnnotations !== null) attributeCount++;
    if (this.runtimeInvisibleAnnotations !== null) attributeCount++;
    if (this.runtimeVisibleTypeAnnotations !== null) attributeCount++;
    if (this.runtimeInvisibleTypeAnnotations !== null) attributeCount++;
    if (this.firstAttribute !== null) {
      attributeCount += this.firstAttribute.getAttributeCount();
    }

    output.putShort(attributeCount);

    // Write attributes
    if (this.constantValueIndex !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('ConstantValue'));
      output.putInt(2);
      output.putShort(this.constantValueIndex);
    }

    if (this.signatureIndex !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Signature'));
      output.putInt(2);
      output.putShort(this.signatureIndex);
    }

    if ((this.accessFlags & ACC_DEPRECATED) !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Deprecated'));
      output.putInt(0);
    }

    if ((this.accessFlags & ACC_SYNTHETIC) !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Synthetic'));
      output.putInt(0);
    }

    if (this.runtimeVisibleAnnotations !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('RuntimeVisibleAnnotations'));
      this.runtimeVisibleAnnotations.putAnnotations(this.symbolTable, output);
    }

    if (this.runtimeInvisibleAnnotations !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('RuntimeInvisibleAnnotations'));
      this.runtimeInvisibleAnnotations.putAnnotations(this.symbolTable, output);
    }

    if (this.runtimeVisibleTypeAnnotations !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('RuntimeVisibleTypeAnnotations'));
      this.runtimeVisibleTypeAnnotations.putAnnotations(this.symbolTable, output);
    }

    if (this.runtimeInvisibleTypeAnnotations !== null) {
      output.putShort(this.symbolTable.addConstantUtf8('RuntimeInvisibleTypeAnnotations'));
      this.runtimeInvisibleTypeAnnotations.putAnnotations(this.symbolTable, output);
    }

    if (this.firstAttribute !== null) {
      this.firstAttribute.putAttributes(this.symbolTable, null, 0, 0, 0, output);
    }
  }
}
