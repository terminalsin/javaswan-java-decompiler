/**
 * An entry in the constant pool, bootstrap method table, or local variable table of a class.
 */

// Symbol type tags
export const CONSTANT_CLASS_TAG = 7;
export const CONSTANT_FIELDREF_TAG = 9;
export const CONSTANT_METHODREF_TAG = 10;
export const CONSTANT_INTERFACE_METHODREF_TAG = 11;
export const CONSTANT_STRING_TAG = 8;
export const CONSTANT_INTEGER_TAG = 3;
export const CONSTANT_FLOAT_TAG = 4;
export const CONSTANT_LONG_TAG = 5;
export const CONSTANT_DOUBLE_TAG = 6;
export const CONSTANT_NAME_AND_TYPE_TAG = 12;
export const CONSTANT_UTF8_TAG = 1;
export const CONSTANT_METHOD_HANDLE_TAG = 15;
export const CONSTANT_METHOD_TYPE_TAG = 16;
export const CONSTANT_DYNAMIC_TAG = 17;
export const CONSTANT_INVOKE_DYNAMIC_TAG = 18;
export const CONSTANT_MODULE_TAG = 19;
export const CONSTANT_PACKAGE_TAG = 20;

// Symbol table types (non-standard, used internally)
export const BOOTSTRAP_METHOD_TAG = 64;
export const TYPE_TAG = 128;
export const UNINITIALIZED_TYPE_TAG = 129;
export const MERGED_TYPE_TAG = 130;

/**
 * Represents a symbol in the constant pool or symbol table.
 */
export class Symbol {
  /** The index of this symbol in the constant pool or symbol table. */
  readonly index: number;

  /** The tag of this symbol (constant pool tag or internal type). */
  readonly tag: number;

  /** The internal name of the owner class (for field/method references). */
  readonly owner: string | null;

  /** The name of this symbol. */
  readonly name: string | null;

  /** The descriptor of this symbol (for field/method references). */
  readonly value: string | null;

  /** Additional data associated with this symbol. */
  readonly data: number;

  /** Additional info for dynamic constants or bootstrap methods. */
  readonly info: number;

  /** Next symbol in hash chain. */
  next: Symbol | null = null;

  /**
   * Constructs a new Symbol.
   * @param index the index of this symbol
   * @param tag the tag of this symbol
   * @param owner the owner class internal name (or null)
   * @param name the name of this symbol (or null)
   * @param value the value/descriptor (or null)
   * @param data additional data
   * @param info additional info
   */
  constructor(
    index: number,
    tag: number,
    owner: string | null,
    name: string | null,
    value: string | null,
    data: number = 0,
    info: number = 0
  ) {
    this.index = index;
    this.tag = tag;
    this.owner = owner;
    this.name = name;
    this.value = value;
    this.data = data;
    this.info = info;
  }

  /**
   * Returns whether this symbol matches the given key.
   * @param tag the tag to match
   * @param owner the owner to match
   * @param name the name to match
   * @param value the value to match
   */
  matches(tag: number, owner: string | null, name: string | null, value: string | null): boolean {
    return (
      this.tag === tag &&
      this.owner === owner &&
      this.name === name &&
      this.value === value
    );
  }

  /**
   * Returns whether this symbol matches the given key with data.
   */
  matchesWithData(tag: number, owner: string | null, name: string | null, value: string | null, data: number): boolean {
    return (
      this.tag === tag &&
      this.owner === owner &&
      this.name === name &&
      this.value === value &&
      this.data === data
    );
  }
}

/**
 * Computes a hash code for a symbol key.
 */
export function hashSymbol(tag: number, owner: string | null, name: string | null, value: string | null): number {
  let hash = tag;
  if (owner !== null) {
    hash = hashStr(hash, owner);
  }
  if (name !== null) {
    hash = hashStr(hash, name);
  }
  if (value !== null) {
    hash = hashStr(hash, value);
  }
  return hash & 0x7FFFFFFF;
}

/**
 * Computes a hash code for a symbol key with additional data.
 */
export function hashSymbolWithData(tag: number, owner: string | null, name: string | null, value: string | null, data: number): number {
  return (hashSymbol(tag, owner, name, value) + data) & 0x7FFFFFFF;
}

/**
 * Helper function to hash a string into an existing hash value.
 */
function hashStr(hash: number, str: string): number {
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 31) + str.charCodeAt(i)) | 0;
  }
  return hash;
}
