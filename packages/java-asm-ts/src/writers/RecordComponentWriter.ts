import { ByteVector } from '../core/ByteVector';
import { SymbolTable } from '../core/SymbolTable';
import { TypePath } from '../core/TypePath';
import { RecordComponentVisitor } from '../visitors/RecordComponentVisitor';
import { AnnotationVisitor } from '../visitors/AnnotationVisitor';
import { Attribute } from '../attributes/Attribute';
import { ASM9 } from '../core/Opcodes';
import { AnnotationWriter } from './AnnotationWriter';

/**
 * A RecordComponentVisitor that generates the corresponding record_component_info structure.
 */
export class RecordComponentWriter extends RecordComponentVisitor {
  /** The symbol table. */
  private readonly symbolTable: SymbolTable;

  /** The record component name index. */
  private readonly nameIndex: number;

  /** The record component descriptor index. */
  private readonly descriptorIndex: number;

  /** The record component signature index (or 0 if no signature). */
  private readonly signatureIndex: number;

  /** Runtime visible annotations. */
  private runtimeVisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible annotations. */
  private runtimeInvisibleAnnotations: AnnotationWriter | null = null;

  /** Runtime visible type annotations. */
  private runtimeVisibleTypeAnnotations: AnnotationWriter | null = null;

  /** Runtime invisible type annotations. */
  private runtimeInvisibleTypeAnnotations: AnnotationWriter | null = null;

  /** The first non-standard attribute. */
  private firstAttribute: Attribute | null = null;

  /** The next record component writer (linked list). */
  nextRecordComponentWriter: RecordComponentWriter | null = null;

  /**
   * Constructs a new RecordComponentWriter.
   * @param symbolTable the symbol table
   * @param name the record component name
   * @param descriptor the record component descriptor
   * @param signature the record component signature, or null
   */
  constructor(symbolTable: SymbolTable, name: string, descriptor: string, signature: string | null) {
    super(ASM9);
    this.symbolTable = symbolTable;
    this.nameIndex = symbolTable.addConstantUtf8(name);
    this.descriptorIndex = symbolTable.addConstantUtf8(descriptor);
    this.signatureIndex = signature === null ? 0 : symbolTable.addConstantUtf8(signature);
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
    const annotationWriter = AnnotationWriter.createTypeAnnotation(this.symbolTable, typeRef, typePath, descriptor);
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
   * Computes the size of the record_component_info structure.
   */
  computeRecordComponentInfoSize(): number {
    // name_index + descriptor_index + attributes_count
    let size = 6;

    // Signature
    if (this.signatureIndex !== 0) {
      this.symbolTable.addConstantUtf8('Signature');
      size += 8;
    }

    // Annotations
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

    // Custom attributes
    let attribute = this.firstAttribute;
    while (attribute !== null) {
      this.symbolTable.addConstantUtf8(attribute.type);
      const content = attribute.getContent();
      size += 6 + (content !== null ? content.length : 0);
      attribute = attribute.nextAttribute;
    }

    return size;
  }

  /**
   * Writes the record_component_info structure to the output.
   */
  putRecordComponentInfo(output: ByteVector): void {
    output.putShort(this.nameIndex);
    output.putShort(this.descriptorIndex);

    // Count attributes
    let attributeCount = 0;
    if (this.signatureIndex !== 0) attributeCount++;
    if (this.runtimeVisibleAnnotations !== null) attributeCount++;
    if (this.runtimeInvisibleAnnotations !== null) attributeCount++;
    if (this.runtimeVisibleTypeAnnotations !== null) attributeCount++;
    if (this.runtimeInvisibleTypeAnnotations !== null) attributeCount++;

    let attribute = this.firstAttribute;
    while (attribute !== null) {
      attributeCount++;
      attribute = attribute.nextAttribute;
    }

    output.putShort(attributeCount);

    // Write Signature attribute
    if (this.signatureIndex !== 0) {
      output.putShort(this.symbolTable.addConstantUtf8('Signature'));
      output.putInt(2);
      output.putShort(this.signatureIndex);
    }

    // Write annotations
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

    // Write custom attributes
    attribute = this.firstAttribute;
    while (attribute !== null) {
      const content = attribute.getContent();
      output.putShort(this.symbolTable.addConstantUtf8(attribute.type));
      const contentLength = content !== null ? content.length : 0;
      output.putInt(contentLength);
      output.putByteArray(content, 0, contentLength);
      attribute = attribute.nextAttribute;
    }
  }
}
