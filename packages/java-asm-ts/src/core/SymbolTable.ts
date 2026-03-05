import { ByteVector } from './ByteVector';
import {
  Symbol,
  hashSymbol,
  hashSymbolWithData,
  CONSTANT_CLASS_TAG,
  CONSTANT_FIELDREF_TAG,
  CONSTANT_METHODREF_TAG,
  CONSTANT_INTERFACE_METHODREF_TAG,
  CONSTANT_STRING_TAG,
  CONSTANT_INTEGER_TAG,
  CONSTANT_FLOAT_TAG,
  CONSTANT_LONG_TAG,
  CONSTANT_DOUBLE_TAG,
  CONSTANT_NAME_AND_TYPE_TAG,
  CONSTANT_UTF8_TAG,
  CONSTANT_METHOD_HANDLE_TAG,
  CONSTANT_METHOD_TYPE_TAG,
  CONSTANT_DYNAMIC_TAG,
  CONSTANT_INVOKE_DYNAMIC_TAG,
  CONSTANT_MODULE_TAG,
  CONSTANT_PACKAGE_TAG,
  BOOTSTRAP_METHOD_TAG,
  TYPE_TAG,
  UNINITIALIZED_TYPE_TAG,
} from './Symbol';
import type { Handle } from './Handle';
import type { ConstantDynamic } from './ConstantDynamic';

/**
 * The constant pool and symbol table of a class.
 */
export class SymbolTable {
  /** The ClassWriter that owns this symbol table. */
  private readonly _classWriter: unknown;

  /** The major version of the class being built. */
  private _majorVersion: number = 0;

  /** The internal name of the class being built. */
  private _className: string = '';

  /** The constant pool of the class being built. */
  readonly constantPool: ByteVector;

  /** The number of entries in the constant pool. */
  private constantPoolCount: number = 1;

  /** Hash table for constant pool symbols. */
  private entries: Array<Symbol | null>;

  /** The number of entries in the bootstrap method table. */
  private bootstrapMethodCount: number = 0;

  /** The bootstrap method table. */
  private bootstrapMethods: ByteVector | null = null;

  /** The type table (for frames). */
  private typeTable: Symbol[] = [];

  /** The number of entries in the type table. */
  private typeCount: number = 0;

  /**
   * Constructs a new SymbolTable for a ClassWriter.
   */
  constructor(classWriter: unknown) {
    this._classWriter = classWriter;
    this.constantPool = new ByteVector();
    this.entries = new Array(256).fill(null);
  }

  /**
   * Constructs a SymbolTable from an existing constant pool.
   */
  static fromClassReader(classWriter: unknown, _classReader: { 
    getItem(index: number): number;
    classFileBuffer: Uint8Array;
    cpInfoOffsets: number[];
    constantPoolCount: number;
    readUTF8(offset: number, charBuffer: string[]): string;
  }): SymbolTable {
    const symbolTable = new SymbolTable(classWriter);
    // Copy constant pool from class reader
    // This is a simplified version - full implementation would copy all entries
    return symbolTable;
  }

  /**
   * Sets the major version of the class.
   */
  setMajorVersion(majorVersion: number): void {
    this._majorVersion = majorVersion;
  }

  /**
   * Sets the class name.
   */
  setClassName(className: string): void {
    this._className = className;
  }

  /**
   * Gets the class writer.
   */
  getClassWriter(): unknown {
    return this._classWriter;
  }

  /**
   * Gets the major version.
   */
  getMajorVersion(): number {
    return this._majorVersion;
  }

  /**
   * Gets the class name.
   */
  getClassName(): string {
    return this._className;
  }

  /**
   * Returns the constant pool count.
   */
  getConstantPoolCount(): number {
    return this.constantPoolCount;
  }

  /**
   * Returns the constant pool length.
   */
  getConstantPoolLength(): number {
    return this.constantPool.length;
  }

  /**
   * Writes the constant pool to the given output.
   */
  putConstantPool(output: ByteVector): void {
    output.putShort(this.constantPoolCount);
    output.putByteArray(this.constantPool.data, 0, this.constantPool.length);
  }

  /**
   * Returns the bootstrap methods count.
   */
  getBootstrapMethodCount(): number {
    return this.bootstrapMethodCount;
  }

  /**
   * Writes the bootstrap methods to the given output.
   */
  putBootstrapMethods(output: ByteVector): void {
    if (this.bootstrapMethods !== null) {
      output.putByteArray(this.bootstrapMethods.data, 0, this.bootstrapMethods.length);
    }
  }

  /**
   * Looks up a symbol in the hash table.
   */
  private get(hashCode: number, tag: number, owner: string | null, name: string | null, value: string | null): Symbol | null {
    const index = hashCode % this.entries.length;
    let entry: Symbol | null = this.entries[index] ?? null;
    while (entry !== null) {
      if (entry.matches(tag, owner, name, value)) {
        return entry;
      }
      entry = entry.next;
    }
    return null;
  }

  /**
   * Puts a symbol into the hash table.
   */
  private put(entry: Symbol, hashCode: number): Symbol {
    if (this.constantPoolCount > this.entries.length * 0.75) {
      // Resize hash table
      const newSize = this.entries.length * 2 + 1;
      const newEntries: Array<Symbol | null> = new Array(newSize).fill(null);
      for (let i = this.entries.length - 1; i >= 0; i--) {
        let current: Symbol | null = this.entries[i] ?? null;
        while (current !== null) {
          const next = current.next;
          const newIndex = hashSymbol(current.tag, current.owner, current.name, current.value) % newSize;
          current.next = newEntries[newIndex] ?? null;
          newEntries[newIndex] = current;
          current = next;
        }
      }
      this.entries = newEntries;
    }
    const index = hashCode % this.entries.length;
    entry.next = this.entries[index] ?? null;
    this.entries[index] = entry;
    return entry;
  }

  /**
   * Adds a UTF8 string to the constant pool.
   */
  addConstantUtf8(value: string): number {
    const hashCode = hashSymbol(CONSTANT_UTF8_TAG, null, value, null);
    let entry = this.get(hashCode, CONSTANT_UTF8_TAG, null, value, null);
    if (entry !== null) {
      return entry.index;
    }
    this.constantPool.putByte(CONSTANT_UTF8_TAG);
    this.constantPool.putUTF8(value);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_UTF8_TAG, null, value, null);
    return this.put(entry, hashCode).index;
  }

  /**
   * Adds a CONSTANT_Integer to the constant pool.
   */
  addConstantInteger(value: number): Symbol {
    const hashCode = hashSymbol(CONSTANT_INTEGER_TAG, null, null, null) + value;
    const entry = this.addConstantIntegerOrFloat(CONSTANT_INTEGER_TAG, value, hashCode);
    return entry;
  }

  /**
   * Adds a CONSTANT_Float to the constant pool.
   */
  addConstantFloat(value: number): Symbol {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value, false);
    const intBits = view.getInt32(0, false);
    const hashCode = hashSymbol(CONSTANT_FLOAT_TAG, null, null, null) + intBits;
    return this.addConstantIntegerOrFloat(CONSTANT_FLOAT_TAG, intBits, hashCode);
  }

  private addConstantIntegerOrFloat(tag: number, value: number, hashCode: number): Symbol {
    let entry: Symbol | null = this.entries[hashCode % this.entries.length] ?? null;
    while (entry !== null) {
      if (entry.tag === tag && entry.data === value) {
        return entry;
      }
      entry = entry.next;
    }
    this.constantPool.putByte(tag);
    this.constantPool.putInt(value);
    const index = this.constantPoolCount++;
    const newEntry = new Symbol(index, tag, null, null, null, value);
    return this.put(newEntry, hashCode);
  }

  /**
   * Adds a CONSTANT_Long to the constant pool.
   */
  addConstantLong(value: bigint): Symbol {
    const hashCode = hashSymbol(CONSTANT_LONG_TAG, null, null, null) + Number(value & 0xFFFFFFFFn);
    return this.addConstantLongOrDouble(CONSTANT_LONG_TAG, value, hashCode);
  }

  /**
   * Adds a CONSTANT_Double to the constant pool.
   */
  addConstantDouble(value: number): Symbol {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value, false);
    const longBits = view.getBigInt64(0, false);
    const hashCode = hashSymbol(CONSTANT_DOUBLE_TAG, null, null, null) + Number(longBits & 0xFFFFFFFFn);
    return this.addConstantLongOrDouble(CONSTANT_DOUBLE_TAG, longBits, hashCode);
  }

  private addConstantLongOrDouble(tag: number, value: bigint, hashCode: number): Symbol {
    let entry: Symbol | null = this.entries[hashCode % this.entries.length] ?? null;
    while (entry !== null) {
      if (entry.tag === tag && entry.info === Number(value >> 32n) && entry.data === Number(value & 0xFFFFFFFFn)) {
        return entry;
      }
      entry = entry.next;
    }
    this.constantPool.putByte(tag);
    this.constantPool.putLong(value);
    const index = this.constantPoolCount;
    this.constantPoolCount += 2; // Long and Double take two slots
    const newEntry = new Symbol(index, tag, null, null, null, Number(value & 0xFFFFFFFFn), Number(value >> 32n));
    return this.put(newEntry, hashCode);
  }

  /**
   * Adds a CONSTANT_String to the constant pool.
   */
  addConstantString(value: string): Symbol {
    const hashCode = hashSymbol(CONSTANT_STRING_TAG, null, value, null);
    let entry = this.get(hashCode, CONSTANT_STRING_TAG, null, value, null);
    if (entry !== null) {
      return entry;
    }
    const utf8Index = this.addConstantUtf8(value);
    this.constantPool.putByte(CONSTANT_STRING_TAG);
    this.constantPool.putShort(utf8Index);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_STRING_TAG, null, value, null);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a CONSTANT_Class to the constant pool.
   */
  addConstantClass(value: string): Symbol {
    const hashCode = hashSymbol(CONSTANT_CLASS_TAG, null, value, null);
    let entry = this.get(hashCode, CONSTANT_CLASS_TAG, null, value, null);
    if (entry !== null) {
      return entry;
    }
    const utf8Index = this.addConstantUtf8(value);
    this.constantPool.putByte(CONSTANT_CLASS_TAG);
    this.constantPool.putShort(utf8Index);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_CLASS_TAG, null, value, null);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a CONSTANT_NameAndType to the constant pool.
   */
  addConstantNameAndType(name: string, descriptor: string): number {
    const hashCode = hashSymbol(CONSTANT_NAME_AND_TYPE_TAG, null, name, descriptor);
    let entry = this.get(hashCode, CONSTANT_NAME_AND_TYPE_TAG, null, name, descriptor);
    if (entry !== null) {
      return entry.index;
    }
    const nameIndex = this.addConstantUtf8(name);
    const descriptorIndex = this.addConstantUtf8(descriptor);
    this.constantPool.putByte(CONSTANT_NAME_AND_TYPE_TAG);
    this.constantPool.putShort(nameIndex);
    this.constantPool.putShort(descriptorIndex);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_NAME_AND_TYPE_TAG, null, name, descriptor);
    return this.put(entry, hashCode).index;
  }

  /**
   * Adds a CONSTANT_Fieldref to the constant pool.
   */
  addConstantFieldref(owner: string, name: string, descriptor: string): Symbol {
    const hashCode = hashSymbol(CONSTANT_FIELDREF_TAG, owner, name, descriptor);
    let entry = this.get(hashCode, CONSTANT_FIELDREF_TAG, owner, name, descriptor);
    if (entry !== null) {
      return entry;
    }
    const classIndex = this.addConstantClass(owner).index;
    const nameAndTypeIndex = this.addConstantNameAndType(name, descriptor);
    this.constantPool.putByte(CONSTANT_FIELDREF_TAG);
    this.constantPool.putShort(classIndex);
    this.constantPool.putShort(nameAndTypeIndex);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_FIELDREF_TAG, owner, name, descriptor);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a CONSTANT_Methodref to the constant pool.
   */
  addConstantMethodref(owner: string, name: string, descriptor: string, isInterface: boolean): Symbol {
    const tag = isInterface ? CONSTANT_INTERFACE_METHODREF_TAG : CONSTANT_METHODREF_TAG;
    const hashCode = hashSymbol(tag, owner, name, descriptor);
    let entry = this.get(hashCode, tag, owner, name, descriptor);
    if (entry !== null) {
      return entry;
    }
    const classIndex = this.addConstantClass(owner).index;
    const nameAndTypeIndex = this.addConstantNameAndType(name, descriptor);
    this.constantPool.putByte(tag);
    this.constantPool.putShort(classIndex);
    this.constantPool.putShort(nameAndTypeIndex);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, tag, owner, name, descriptor);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a CONSTANT_MethodHandle to the constant pool.
   */
  addConstantMethodHandle(referenceKind: number, owner: string, name: string, descriptor: string, isInterface: boolean): Symbol {
    const hashCode = hashSymbolWithData(CONSTANT_METHOD_HANDLE_TAG, owner, name, descriptor, referenceKind);
    let entry: Symbol | null = this.entries[hashCode % this.entries.length] ?? null;
    while (entry !== null) {
      if (entry.matchesWithData(CONSTANT_METHOD_HANDLE_TAG, owner, name, descriptor, referenceKind)) {
        return entry;
      }
      entry = entry.next;
    }
    
    let refSymbol: Symbol;
    if (referenceKind <= 4) {
      // Field reference
      refSymbol = this.addConstantFieldref(owner, name, descriptor);
    } else {
      // Method reference
      refSymbol = this.addConstantMethodref(owner, name, descriptor, isInterface);
    }
    
    this.constantPool.putByte(CONSTANT_METHOD_HANDLE_TAG);
    this.constantPool.putByte(referenceKind);
    this.constantPool.putShort(refSymbol.index);
    const index = this.constantPoolCount++;
    const newEntry = new Symbol(index, CONSTANT_METHOD_HANDLE_TAG, owner, name, descriptor, referenceKind);
    return this.put(newEntry, hashCode);
  }

  /**
   * Adds a CONSTANT_MethodType to the constant pool.
   */
  addConstantMethodType(methodDescriptor: string): Symbol {
    const hashCode = hashSymbol(CONSTANT_METHOD_TYPE_TAG, null, methodDescriptor, null);
    let entry = this.get(hashCode, CONSTANT_METHOD_TYPE_TAG, null, methodDescriptor, null);
    if (entry !== null) {
      return entry;
    }
    const descriptorIndex = this.addConstantUtf8(methodDescriptor);
    this.constantPool.putByte(CONSTANT_METHOD_TYPE_TAG);
    this.constantPool.putShort(descriptorIndex);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_METHOD_TYPE_TAG, null, methodDescriptor, null);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a CONSTANT_Dynamic to the constant pool.
   */
  addConstantDynamic(name: string, descriptor: string, bootstrapMethodHandle: Handle, bootstrapMethodArguments: unknown[]): Symbol {
    const bootstrapMethodIndex = this.addBootstrapMethod(bootstrapMethodHandle, bootstrapMethodArguments);
    return this.addConstantDynamicOrInvokeDynamicReference(
      CONSTANT_DYNAMIC_TAG,
      name,
      descriptor,
      bootstrapMethodIndex
    );
  }

  /**
   * Adds a CONSTANT_InvokeDynamic to the constant pool.
   */
  addConstantInvokeDynamic(name: string, descriptor: string, bootstrapMethodHandle: Handle, bootstrapMethodArguments: unknown[]): Symbol {
    const bootstrapMethodIndex = this.addBootstrapMethod(bootstrapMethodHandle, bootstrapMethodArguments);
    return this.addConstantDynamicOrInvokeDynamicReference(
      CONSTANT_INVOKE_DYNAMIC_TAG,
      name,
      descriptor,
      bootstrapMethodIndex
    );
  }

  private addConstantDynamicOrInvokeDynamicReference(
    tag: number,
    name: string,
    descriptor: string,
    bootstrapMethodIndex: number
  ): Symbol {
    const hashCode = hashSymbolWithData(tag, null, name, descriptor, bootstrapMethodIndex);
    let entry: Symbol | null = this.entries[hashCode % this.entries.length] ?? null;
    while (entry !== null) {
      if (entry.matchesWithData(tag, null, name, descriptor, bootstrapMethodIndex)) {
        return entry;
      }
      entry = entry.next;
    }
    const nameAndTypeIndex = this.addConstantNameAndType(name, descriptor);
    this.constantPool.putByte(tag);
    this.constantPool.putShort(bootstrapMethodIndex);
    this.constantPool.putShort(nameAndTypeIndex);
    const index = this.constantPoolCount++;
    const newEntry = new Symbol(index, tag, null, name, descriptor, bootstrapMethodIndex);
    return this.put(newEntry, hashCode);
  }

  /**
   * Adds a bootstrap method to the bootstrap methods table.
   */
  addBootstrapMethod(bootstrapMethodHandle: Handle, bootstrapMethodArguments: unknown[]): number {
    // Create bootstrap method entry
    const bootstrapMethodContent = new ByteVector();
    
    // Add method handle
    const methodHandleSymbol = this.addConstantMethodHandle(
      bootstrapMethodHandle.getTag(),
      bootstrapMethodHandle.getOwner(),
      bootstrapMethodHandle.getName(),
      bootstrapMethodHandle.getDesc(),
      bootstrapMethodHandle.isInterface()
    );
    bootstrapMethodContent.putShort(methodHandleSymbol.index);
    
    // Add arguments count
    bootstrapMethodContent.putShort(bootstrapMethodArguments.length);
    
    // Add each argument
    for (const arg of bootstrapMethodArguments) {
      const argSymbol = this.addConstant(arg);
      bootstrapMethodContent.putShort(argSymbol.index);
    }

    // Look for existing bootstrap method
    const hashCode = this.hashBootstrapMethod(bootstrapMethodContent);
    let entry: Symbol | null = this.entries[hashCode % this.entries.length] ?? null;
    while (entry !== null) {
      if (entry.tag === BOOTSTRAP_METHOD_TAG) {
        // Compare content
        if (this.bootstrapMethods !== null) {
          const existingOffset = entry.data;
          const existingLength = entry.info;
          if (this.compareBytes(bootstrapMethodContent, existingOffset, existingLength)) {
            return entry.index;
          }
        }
      }
      entry = entry.next;
    }

    // Add new bootstrap method
    if (this.bootstrapMethods === null) {
      this.bootstrapMethods = new ByteVector();
    }
    const offset = this.bootstrapMethods.length;
    this.bootstrapMethods.putByteArray(bootstrapMethodContent.data, 0, bootstrapMethodContent.length);
    
    const index = this.bootstrapMethodCount++;
    const newEntry = new Symbol(index, BOOTSTRAP_METHOD_TAG, null, null, null, offset, bootstrapMethodContent.length);
    this.put(newEntry, hashCode);
    return index;
  }

  private hashBootstrapMethod(content: ByteVector): number {
    let hash = BOOTSTRAP_METHOD_TAG;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash * 31) + content.data[i]!) | 0;
    }
    return hash & 0x7FFFFFFF;
  }

  private compareBytes(content: ByteVector, offset: number, length: number): boolean {
    if (content.length !== length || this.bootstrapMethods === null) {
      return false;
    }
    for (let i = 0; i < length; i++) {
      if (content.data[i] !== this.bootstrapMethods.data[offset + i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Adds a constant to the constant pool.
   */
  addConstant(value: unknown): Symbol {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return this.addConstantInteger(value);
      }
      return this.addConstantFloat(value);
    }
    if (typeof value === 'bigint') {
      return this.addConstantLong(value);
    }
    if (typeof value === 'string') {
      return this.addConstantString(value);
    }
    if (value !== null && typeof value === 'object') {
      if ('getTag' in value && 'getOwner' in value) {
        // Handle
        const handle = value as Handle;
        return this.addConstantMethodHandle(
          handle.getTag(),
          handle.getOwner(),
          handle.getName(),
          handle.getDesc(),
          handle.isInterface()
        );
      }
      if ('getName' in value && 'getDescriptor' in value && 'getBootstrapMethod' in value) {
        // ConstantDynamic
        const cd = value as ConstantDynamic;
        return this.addConstantDynamic(
          cd.getName(),
          cd.getDescriptor(),
          cd.getBootstrapMethod(),
          cd.getBootstrapMethodArguments()
        );
      }
    }
    throw new Error('Unsupported constant type: ' + typeof value);
  }

  /**
   * Adds a CONSTANT_Module to the constant pool.
   */
  addConstantModule(moduleName: string): Symbol {
    const hashCode = hashSymbol(CONSTANT_MODULE_TAG, null, moduleName, null);
    let entry = this.get(hashCode, CONSTANT_MODULE_TAG, null, moduleName, null);
    if (entry !== null) {
      return entry;
    }
    const utf8Index = this.addConstantUtf8(moduleName);
    this.constantPool.putByte(CONSTANT_MODULE_TAG);
    this.constantPool.putShort(utf8Index);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_MODULE_TAG, null, moduleName, null);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a CONSTANT_Package to the constant pool.
   */
  addConstantPackage(packageName: string): Symbol {
    const hashCode = hashSymbol(CONSTANT_PACKAGE_TAG, null, packageName, null);
    let entry = this.get(hashCode, CONSTANT_PACKAGE_TAG, null, packageName, null);
    if (entry !== null) {
      return entry;
    }
    const utf8Index = this.addConstantUtf8(packageName);
    this.constantPool.putByte(CONSTANT_PACKAGE_TAG);
    this.constantPool.putShort(utf8Index);
    const index = this.constantPoolCount++;
    entry = new Symbol(index, CONSTANT_PACKAGE_TAG, null, packageName, null);
    return this.put(entry, hashCode);
  }

  /**
   * Adds a type to the type table (for frame computation).
   */
  addType(value: string): number {
    const hashCode = hashSymbol(TYPE_TAG, null, value, null);
    let entry = this.get(hashCode, TYPE_TAG, null, value, null);
    if (entry !== null) {
      return entry.index;
    }
    const index = this.typeCount++;
    entry = new Symbol(index, TYPE_TAG, null, value, null);
    this.typeTable.push(entry);
    return this.put(entry, hashCode).index;
  }

  /**
   * Adds an uninitialized type to the type table.
   */
  addUninitializedType(value: string, bytecodeOffset: number): number {
    const hashCode = hashSymbolWithData(UNINITIALIZED_TYPE_TAG, null, value, null, bytecodeOffset);
    let entry: Symbol | null = this.entries[hashCode % this.entries.length] ?? null;
    while (entry !== null) {
      if (entry.matchesWithData(UNINITIALIZED_TYPE_TAG, null, value, null, bytecodeOffset)) {
        return entry.index;
      }
      entry = entry.next;
    }
    const index = this.typeCount++;
    const newEntry = new Symbol(index, UNINITIALIZED_TYPE_TAG, null, value, null, bytecodeOffset);
    this.typeTable.push(newEntry);
    return this.put(newEntry, hashCode).index;
  }

  /**
   * Returns a type from the type table.
   */
  getType(typeIndex: number): Symbol {
    return this.typeTable[typeIndex]!;
  }
}
