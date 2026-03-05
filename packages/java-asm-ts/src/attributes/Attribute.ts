import { ByteVector } from '../core/ByteVector';

/**
 * A non standard class, field, method or Code attribute, as defined in the Java Virtual Machine
 * Specification (JVMS).
 */
export class Attribute {
  /** The type of this attribute. */
  public readonly type: string;

  /** The raw content of this attribute (may be null if the attribute is being written). */
  private content: Uint8Array | null;

  /** The next attribute in a linked list of attributes (null if this is the last one). */
  nextAttribute: Attribute | null = null;

  /**
   * Constructs a new Attribute.
   * @param type the type of this attribute
   */
  constructor(type: string) {
    this.type = type;
    this.content = null;
  }

  /**
   * Returns true if this type of attribute is unknown.
   * @returns true if unknown
   */
  isUnknown(): boolean {
    return true;
  }

  /**
   * Returns true if this type of attribute is a Code attribute.
   * @returns true if this is a Code attribute
   */
  isCodeAttribute(): boolean {
    return false;
  }

  /**
   * Returns the labels corresponding to this attribute.
   * @returns an array of labels or null
   */
  getLabels(): unknown[] | null {
    return null;
  }

  /**
   * Reads the content of this attribute.
   * @param classReader the class reader
   * @param _offset the offset of the attribute content
   * @param length the length of the attribute content
   * @param charBuffer a buffer for reading strings
   * @param codeOffset the offset of the Code attribute (or -1 if not in Code)
   * @param labels the labels of the Code attribute (or null if not in Code)
   * @returns a new Attribute with the read content
   */
  read(
    _classReader: unknown,
    _offset: number,
    length: number,
    _charBuffer: string[],
    _codeOffset: number,
    _labels: unknown[] | null
  ): Attribute {
    const attribute = new Attribute(this.type);
    // Store raw content - subclasses should override this
    attribute.content = new Uint8Array(length);
    return attribute;
  }

  /**
   * Writes the content of this attribute.
   * @param classWriter the class writer
   * @param code the bytecode of the method (or null if not in Code)
   * @param codeLength the length of the bytecode
   * @param maxStack the maximum stack size
   * @param maxLocals the maximum local variables
   * @returns the byte vector containing the attribute content
   */
  write(
    _classWriter: unknown,
    _code: Uint8Array | null,
    _codeLength: number,
    _maxStack: number,
    _maxLocals: number
  ): ByteVector {
    const content = new ByteVector();
    if (this.content !== null) {
      content.putByteArray(this.content, 0, this.content.length);
    }
    return content;
  }

  /**
   * Returns the number of attributes in this linked list.
   * @returns the count of attributes
   */
  getAttributeCount(): number {
    let count = 0;
    let current: Attribute | null = this;
    while (current !== null) {
      count++;
      current = current.nextAttribute;
    }
    return count;
  }

  /**
   * Computes the total size of all attributes in this linked list.
   * @param symbolTable the symbol table
   * @param code the bytecode (or null)
   * @param codeLength the bytecode length
   * @param maxStack the max stack
   * @param maxLocals the max locals
   * @returns the total size in bytes
   */
  computeAttributesSize(
    symbolTable: { addConstantUtf8(value: string): number },
    code: Uint8Array | null,
    codeLength: number,
    maxStack: number,
    maxLocals: number
  ): number {
    let size = 0;
    let current: Attribute | null = this;
    while (current !== null) {
      symbolTable.addConstantUtf8(current.type);
      size += 6 + current.write(null, code, codeLength, maxStack, maxLocals).length;
      current = current.nextAttribute;
    }
    return size;
  }

  /**
   * Puts all attributes in this linked list to the output.
   * @param symbolTable the symbol table
   * @param code the bytecode (or null)
   * @param codeLength the bytecode length
   * @param maxStack the max stack
   * @param maxLocals the max locals
   * @param output the output byte vector
   */
  putAttributes(
    symbolTable: { addConstantUtf8(value: string): number },
    code: Uint8Array | null,
    codeLength: number,
    maxStack: number,
    maxLocals: number,
    output: ByteVector
  ): void {
    let current: Attribute | null = this;
    while (current !== null) {
      const attributeContent = current.write(null, code, codeLength, maxStack, maxLocals);
      output.putShort(symbolTable.addConstantUtf8(current.type));
      output.putInt(attributeContent.length);
      output.putByteArray(attributeContent.data, 0, attributeContent.length);
      current = current.nextAttribute;
    }
  }

  /**
   * Sets the raw content of this attribute.
   * @param content the raw content
   */
  setContent(content: Uint8Array): void {
    this.content = content;
  }

  /**
   * Gets the raw content of this attribute.
   * @returns the raw content or null
   */
  getContent(): Uint8Array | null {
    return this.content;
  }
}

/**
 * Linked list operations for attributes.
 */
export function addAttribute(list: Attribute | null, attribute: Attribute): Attribute {
  attribute.nextAttribute = list;
  return attribute;
}
