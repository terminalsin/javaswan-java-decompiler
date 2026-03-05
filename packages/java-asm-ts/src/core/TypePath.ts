/**
 * The path to a type argument, wildcard bound, array element type, or static inner type within
 * an enclosing type.
 */
export class TypePath {
  /** A type path step that steps into the element type of an array type. */
  static readonly ARRAY_ELEMENT = 0;

  /** A type path step that steps into the nested type of a class type. */
  static readonly INNER_TYPE = 1;

  /** A type path step that steps into the bound of a wildcard type. */
  static readonly WILDCARD_BOUND = 2;

  /** A type path step that steps into a type argument of a generic type. */
  static readonly TYPE_ARGUMENT = 3;

  /** The byte array where the type path is stored. */
  private readonly typePathContainer: Uint8Array;

  /** The offset in typePathContainer of the first byte of the type path. */
  private readonly typePathOffset: number;

  /**
   * Constructs a TypePath.
   * @param typePathContainer the byte array containing the type path
   * @param typePathOffset the offset of the type path in the array
   */
  constructor(typePathContainer: Uint8Array, typePathOffset: number) {
    this.typePathContainer = typePathContainer;
    this.typePathOffset = typePathOffset;
  }

  /**
   * Returns the length of this path, i.e. the number of steps.
   * @returns the length of this path
   */
  getLength(): number {
    return this.typePathContainer[this.typePathOffset]!;
  }

  /**
   * Returns the kind of step at the given index.
   * @param index an index between 0 and getLength() (exclusive)
   * @returns ARRAY_ELEMENT, INNER_TYPE, WILDCARD_BOUND, or TYPE_ARGUMENT
   */
  getStep(index: number): number {
    return this.typePathContainer[this.typePathOffset + 2 * index + 1]!;
  }

  /**
   * Returns the type argument index for the step at the given index.
   * @param index an index between 0 and getLength() (exclusive)
   * @returns the type argument index, or 0 if the step is not TYPE_ARGUMENT
   */
  getStepArgument(index: number): number {
    return this.typePathContainer[this.typePathOffset + 2 * index + 2]!;
  }

  /**
   * Converts a type path in string form into a TypePath object.
   * @param typePath a type path in string form (or null for an empty path)
   * @returns the corresponding TypePath object, or null if the path is null or empty
   */
  static fromString(typePath: string | null): TypePath | null {
    if (typePath === null || typePath.length === 0) {
      return null;
    }
    const length = typePath.length;
    const output = new ByteVector();
    output.putByte(0); // placeholder for path length

    let typePathLength = 0;
    let offset = 0;
    while (offset < length) {
      const c = typePath.charAt(offset++);
      if (c === '[') {
        output.putByte(TypePath.ARRAY_ELEMENT);
        output.putByte(0);
      } else if (c === '.') {
        output.putByte(TypePath.INNER_TYPE);
        output.putByte(0);
      } else if (c === '*') {
        output.putByte(TypePath.WILDCARD_BOUND);
        output.putByte(0);
      } else if (c >= '0' && c <= '9') {
        let typeArg = c.charCodeAt(0) - '0'.charCodeAt(0);
        while (offset < length) {
          const next = typePath.charAt(offset);
          if (next >= '0' && next <= '9') {
            typeArg = typeArg * 10 + next.charCodeAt(0) - '0'.charCodeAt(0);
            offset++;
          } else if (next === ';') {
            offset++;
            break;
          } else {
            break;
          }
        }
        output.putByte(TypePath.TYPE_ARGUMENT);
        output.putByte(typeArg);
      }
      typePathLength++;
    }

    const result = output.toArray();
    result[0] = typePathLength;
    return new TypePath(result, 0);
  }

  /**
   * Returns a string representation of this type path.
   * @returns the string representation
   */
  toString(): string {
    const length = this.getLength();
    let result = '';
    for (let i = 0; i < length; i++) {
      switch (this.getStep(i)) {
        case TypePath.ARRAY_ELEMENT:
          result += '[';
          break;
        case TypePath.INNER_TYPE:
          result += '.';
          break;
        case TypePath.WILDCARD_BOUND:
          result += '*';
          break;
        case TypePath.TYPE_ARGUMENT:
          result += this.getStepArgument(i) + ';';
          break;
      }
    }
    return result;
  }

  /**
   * Returns the raw bytes of this type path.
   */
  getRawBytes(): Uint8Array {
    const length = 1 + 2 * this.getLength();
    return this.typePathContainer.slice(this.typePathOffset, this.typePathOffset + length);
  }
}

/**
 * Simple ByteVector for TypePath parsing.
 */
class ByteVector {
  private data: number[] = [];

  putByte(value: number): void {
    this.data.push(value & 0xFF);
  }

  toArray(): Uint8Array {
    return new Uint8Array(this.data);
  }
}
