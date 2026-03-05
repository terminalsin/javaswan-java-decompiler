/**
 * A Java field or method type. This class can be used to make it easier to manipulate type and
 * method descriptors.
 */

// Type sort values
export const VOID = 0;
export const BOOLEAN = 1;
export const CHAR = 2;
export const BYTE = 3;
export const SHORT = 4;
export const INT = 5;
export const FLOAT = 6;
export const LONG = 7;
export const DOUBLE = 8;
export const ARRAY = 9;
export const OBJECT = 10;
export const METHOD = 11;

export class Type {
  /** The sort of this type. */
  public readonly sort: number;

  /** The descriptor of this type. */
  private readonly valueBuffer: string;

  /** The offset of the value of this type in valueBuffer. */
  private readonly valueBegin: number;

  /** The end of the value of this type in valueBuffer. */
  private readonly valueEnd: number;

  /** Cached Type instances for primitive types. */
  public static readonly VOID_TYPE = new Type(VOID, 'V', 0, 1);
  public static readonly BOOLEAN_TYPE = new Type(BOOLEAN, 'Z', 0, 1);
  public static readonly CHAR_TYPE = new Type(CHAR, 'C', 0, 1);
  public static readonly BYTE_TYPE = new Type(BYTE, 'B', 0, 1);
  public static readonly SHORT_TYPE = new Type(SHORT, 'S', 0, 1);
  public static readonly INT_TYPE = new Type(INT, 'I', 0, 1);
  public static readonly FLOAT_TYPE = new Type(FLOAT, 'F', 0, 1);
  public static readonly LONG_TYPE = new Type(LONG, 'J', 0, 1);
  public static readonly DOUBLE_TYPE = new Type(DOUBLE, 'D', 0, 1);

  /**
   * Constructs a new Type.
   * @param sort the sort of this type
   * @param valueBuffer the descriptor of this type
   * @param valueBegin the start offset in valueBuffer
   * @param valueEnd the end offset in valueBuffer
   */
  private constructor(sort: number, valueBuffer: string, valueBegin: number, valueEnd: number) {
    this.sort = sort;
    this.valueBuffer = valueBuffer;
    this.valueBegin = valueBegin;
    this.valueEnd = valueEnd;
  }

  /**
   * Returns the Type corresponding to the given type descriptor.
   * @param typeDescriptor a field or method type descriptor
   * @returns the Type corresponding to the given type descriptor
   */
  static getType(typeDescriptor: string): Type {
    return Type.getTypeInternal(typeDescriptor, 0, typeDescriptor.length);
  }

  /**
   * Returns the Type corresponding to the given internal name.
   * @param internalName an internal name
   * @returns the Type corresponding to the given internal name
   */
  static getObjectType(internalName: string): Type {
    return new Type(OBJECT, 'L' + internalName + ';', 0, internalName.length + 2);
  }

  /**
   * Returns the Type corresponding to the given method descriptor.
   * @param methodDescriptor a method descriptor
   * @returns the Type corresponding to the given method descriptor
   */
  static getMethodType(methodDescriptor: string): Type {
    return new Type(METHOD, methodDescriptor, 0, methodDescriptor.length);
  }

  /**
   * Returns the Type corresponding to the return type of the given method descriptor.
   * @param methodDescriptor a method descriptor
   * @returns the return type
   */
  static getReturnType(methodDescriptor: string): Type {
    const returnTypeOffset = methodDescriptor.indexOf(')') + 1;
    return Type.getTypeInternal(methodDescriptor, returnTypeOffset, methodDescriptor.length);
  }

  /**
   * Returns the argument types of methods of this type.
   * @param methodDescriptor a method descriptor
   * @returns the argument types
   */
  static getArgumentTypes(methodDescriptor: string): Type[] {
    const argumentTypes: Type[] = [];
    let currentOffset = 1; // skip '('
    
    while (methodDescriptor.charAt(currentOffset) !== ')') {
      const typeBeginOffset = currentOffset;
      while (methodDescriptor.charAt(currentOffset) === '[') {
        currentOffset++;
      }
      if (methodDescriptor.charAt(currentOffset) === 'L') {
        currentOffset = methodDescriptor.indexOf(';', currentOffset) + 1;
      } else {
        currentOffset++;
      }
      argumentTypes.push(Type.getTypeInternal(methodDescriptor, typeBeginOffset, currentOffset));
    }
    
    return argumentTypes;
  }

  /**
   * Returns the size of the arguments and return value of methods of this type.
   * @param methodDescriptor a method descriptor
   * @returns the size (arguments size in bits 0-1, return size in bits 2-3)
   */
  static getArgumentsAndReturnSizes(methodDescriptor: string): number {
    let argumentsSize = 1; // receiver
    let currentOffset = 1; // skip '('
    
    while (methodDescriptor.charAt(currentOffset) !== ')') {
      while (methodDescriptor.charAt(currentOffset) === '[') {
        currentOffset++;
      }
      const char = methodDescriptor.charAt(currentOffset);
      if (char === 'L') {
        currentOffset = methodDescriptor.indexOf(';', currentOffset) + 1;
        argumentsSize += 1;
      } else if (char === 'J' || char === 'D') {
        currentOffset++;
        argumentsSize += 2;
      } else {
        currentOffset++;
        argumentsSize += 1;
      }
    }
    
    const returnChar = methodDescriptor.charAt(currentOffset + 1);
    let returnSize: number;
    if (returnChar === 'V') {
      returnSize = 0;
    } else if (returnChar === 'J' || returnChar === 'D') {
      returnSize = 2;
    } else {
      returnSize = 1;
    }
    
    return (argumentsSize << 2) | returnSize;
  }

  /**
   * Internal method to parse a type from a descriptor.
   */
  private static getTypeInternal(descriptorBuffer: string, descriptorBegin: number, descriptorEnd: number): Type {
    const char = descriptorBuffer.charAt(descriptorBegin);
    switch (char) {
      case 'V':
        return Type.VOID_TYPE;
      case 'Z':
        return Type.BOOLEAN_TYPE;
      case 'C':
        return Type.CHAR_TYPE;
      case 'B':
        return Type.BYTE_TYPE;
      case 'S':
        return Type.SHORT_TYPE;
      case 'I':
        return Type.INT_TYPE;
      case 'F':
        return Type.FLOAT_TYPE;
      case 'J':
        return Type.LONG_TYPE;
      case 'D':
        return Type.DOUBLE_TYPE;
      case '[':
        return new Type(ARRAY, descriptorBuffer, descriptorBegin, descriptorEnd);
      case 'L':
        return new Type(OBJECT, descriptorBuffer, descriptorBegin, descriptorEnd);
      case '(':
        return new Type(METHOD, descriptorBuffer, descriptorBegin, descriptorEnd);
      default:
        throw new Error('Invalid type descriptor: ' + char);
    }
  }

  /**
   * Returns the internal name of the class corresponding to this object or array type.
   * @returns the internal name of the class corresponding to this object or array type
   */
  getInternalName(): string {
    if (this.sort === OBJECT) {
      return this.valueBuffer.substring(this.valueBegin + 1, this.valueEnd - 1);
    }
    if (this.sort === ARRAY) {
      // For arrays, find the element type
      let index = this.valueBegin;
      while (this.valueBuffer.charAt(index) === '[') {
        index++;
      }
      if (this.valueBuffer.charAt(index) === 'L') {
        return this.valueBuffer.substring(index + 1, this.valueEnd - 1);
      }
      // Primitive array
      return this.valueBuffer.substring(this.valueBegin, this.valueEnd);
    }
    throw new Error('getInternalName is only valid for object or array types');
  }

  /**
   * Returns the descriptor corresponding to this type.
   * @returns the descriptor
   */
  getDescriptor(): string {
    return this.valueBuffer.substring(this.valueBegin, this.valueEnd);
  }

  /**
   * Returns the size of values of this type.
   * @returns the size of values of this type (1 or 2 for primitive, 1 for object/array)
   */
  getSize(): number {
    switch (this.sort) {
      case VOID:
        return 0;
      case LONG:
      case DOUBLE:
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Returns the opcode for this type.
   * @param opcode a JVM opcode
   * @returns the opcode adjusted for this type
   */
  getOpcode(opcode: number): number {
    if (opcode === 46 /* IALOAD */ || opcode === 79 /* IASTORE */) {
      switch (this.sort) {
        case BOOLEAN:
        case BYTE:
          return opcode + (51 - 46); // BALOAD or BASTORE
        case CHAR:
          return opcode + (52 - 46); // CALOAD or CASTORE
        case SHORT:
          return opcode + (53 - 46); // SALOAD or SASTORE
        case INT:
          return opcode;
        case FLOAT:
          return opcode + (48 - 46); // FALOAD or FASTORE
        case LONG:
          return opcode + (47 - 46); // LALOAD or LASTORE
        case DOUBLE:
          return opcode + (49 - 46); // DALOAD or DASTORE
        default:
          return opcode + (50 - 46); // AALOAD or AASTORE
      }
    }
    switch (this.sort) {
      case VOID:
        return opcode + (177 - 172); // RETURN
      case BOOLEAN:
      case BYTE:
      case CHAR:
      case SHORT:
      case INT:
        return opcode;
      case FLOAT:
        return opcode + 2;
      case LONG:
        return opcode + 1;
      case DOUBLE:
        return opcode + 3;
      default:
        return opcode + 4;
    }
  }

  /**
   * Returns the element type of an array type.
   * @returns the element type
   */
  getElementType(): Type {
    if (this.sort !== ARRAY) {
      throw new Error('getElementType is only valid for array types');
    }
    return Type.getTypeInternal(this.valueBuffer, this.valueBegin + 1, this.valueEnd);
  }

  /**
   * Returns the number of dimensions of this array type.
   * @returns the number of dimensions
   */
  getDimensions(): number {
    if (this.sort !== ARRAY) {
      throw new Error('getDimensions is only valid for array types');
    }
    let dimensions = 0;
    let index = this.valueBegin;
    while (this.valueBuffer.charAt(index) === '[') {
      dimensions++;
      index++;
    }
    return dimensions;
  }

  /**
   * Returns the binary name corresponding to this type.
   * @returns the binary name
   */
  getClassName(): string {
    switch (this.sort) {
      case VOID:
        return 'void';
      case BOOLEAN:
        return 'boolean';
      case CHAR:
        return 'char';
      case BYTE:
        return 'byte';
      case SHORT:
        return 'short';
      case INT:
        return 'int';
      case FLOAT:
        return 'float';
      case LONG:
        return 'long';
      case DOUBLE:
        return 'double';
      case ARRAY:
        return this.getDescriptor().replace(/\//g, '.');
      case OBJECT:
        return this.getInternalName().replace(/\//g, '.');
      default:
        throw new Error('Invalid type');
    }
  }

  /**
   * Returns a string representation of this type.
   * @returns the descriptor of this type
   */
  toString(): string {
    return this.getDescriptor();
  }

  /**
   * Tests if this type is equal to another type.
   * @param other another type
   * @returns true if types are equal
   */
  equals(other: Type): boolean {
    if (this === other) return true;
    if (this.sort !== other.sort) return false;
    return this.getDescriptor() === other.getDescriptor();
  }

  /**
   * Returns the sort of this type.
   */
  getSort(): number {
    return this.sort;
  }
}

/**
 * Namespace for Type constants
 */
export const TypeSort = {
  VOID,
  BOOLEAN,
  CHAR,
  BYTE,
  SHORT,
  INT,
  FLOAT,
  LONG,
  DOUBLE,
  ARRAY,
  OBJECT,
  METHOD,
} as const;
