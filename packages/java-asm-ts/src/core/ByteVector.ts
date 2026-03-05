/**
 * A dynamically extensible vector of bytes.
 * Used for building class files, Code attributes, etc.
 */
export class ByteVector {
  /** The content of this vector. Only the first {@link #length} bytes contain real data. */
  public data: Uint8Array;
  
  /** The actual number of bytes in this vector. */
  public length: number;

  /**
   * Constructs a new ByteVector with a default initial capacity.
   * @param initialCapacity the initial capacity of the byte vector
   */
  constructor(initialCapacity: number = 64) {
    this.data = new Uint8Array(initialCapacity);
    this.length = 0;
  }

  /**
   * Constructs a new ByteVector from an existing byte array.
   * @param data the byte array to wrap
   */
  static wrap(data: Uint8Array): ByteVector {
    const vector = new ByteVector(0);
    vector.data = data;
    vector.length = data.length;
    return vector;
  }

  /**
   * Ensures that this vector has at least the given capacity.
   * @param minCapacity the minimum capacity to ensure
   */
  private ensureCapacity(minCapacity: number): void {
    if (minCapacity > this.data.length) {
      let newCapacity = this.data.length * 2;
      if (newCapacity < minCapacity) {
        newCapacity = minCapacity;
      }
      const newData = new Uint8Array(newCapacity);
      newData.set(this.data.subarray(0, this.length));
      this.data = newData;
    }
  }

  /**
   * Puts a byte into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param byteValue a byte
   * @returns this byte vector
   */
  putByte(byteValue: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 1);
    this.data[currentLength] = byteValue & 0xFF;
    this.length = currentLength + 1;
    return this;
  }

  /**
   * Puts two bytes into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param byte1 a byte
   * @param byte2 another byte
   * @returns this byte vector
   */
  put11(byte1: number, byte2: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 2);
    const data = this.data;
    data[currentLength] = byte1 & 0xFF;
    data[currentLength + 1] = byte2 & 0xFF;
    this.length = currentLength + 2;
    return this;
  }

  /**
   * Puts a byte and a short into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param byteValue a byte
   * @param shortValue a short
   * @returns this byte vector
   */
  put12(byteValue: number, shortValue: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 3);
    const data = this.data;
    data[currentLength] = byteValue & 0xFF;
    data[currentLength + 1] = (shortValue >>> 8) & 0xFF;
    data[currentLength + 2] = shortValue & 0xFF;
    this.length = currentLength + 3;
    return this;
  }

  /**
   * Puts a byte and an int into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param byteValue a byte
   * @param intValue an int
   * @returns this byte vector
   */
  put14(byteValue: number, intValue: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 5);
    const data = this.data;
    data[currentLength] = byteValue & 0xFF;
    data[currentLength + 1] = (intValue >>> 24) & 0xFF;
    data[currentLength + 2] = (intValue >>> 16) & 0xFF;
    data[currentLength + 3] = (intValue >>> 8) & 0xFF;
    data[currentLength + 4] = intValue & 0xFF;
    this.length = currentLength + 5;
    return this;
  }

  /**
   * Puts a short into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param shortValue a short
   * @returns this byte vector
   */
  putShort(shortValue: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 2);
    const data = this.data;
    data[currentLength] = (shortValue >>> 8) & 0xFF;
    data[currentLength + 1] = shortValue & 0xFF;
    this.length = currentLength + 2;
    return this;
  }

  /**
   * Puts an int into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param intValue an int
   * @returns this byte vector
   */
  putInt(intValue: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 4);
    const data = this.data;
    data[currentLength] = (intValue >>> 24) & 0xFF;
    data[currentLength + 1] = (intValue >>> 16) & 0xFF;
    data[currentLength + 2] = (intValue >>> 8) & 0xFF;
    data[currentLength + 3] = intValue & 0xFF;
    this.length = currentLength + 4;
    return this;
  }

  /**
   * Puts a long into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param longValue a long (as bigint)
   * @returns this byte vector
   */
  putLong(longValue: bigint): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 8);
    const data = this.data;
    const high = Number(longValue >> 32n);
    const low = Number(longValue & 0xFFFFFFFFn);
    data[currentLength] = (high >>> 24) & 0xFF;
    data[currentLength + 1] = (high >>> 16) & 0xFF;
    data[currentLength + 2] = (high >>> 8) & 0xFF;
    data[currentLength + 3] = high & 0xFF;
    data[currentLength + 4] = (low >>> 24) & 0xFF;
    data[currentLength + 5] = (low >>> 16) & 0xFF;
    data[currentLength + 6] = (low >>> 8) & 0xFF;
    data[currentLength + 7] = low & 0xFF;
    this.length = currentLength + 8;
    return this;
  }

  /**
   * Puts a float into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param floatValue a float
   * @returns this byte vector
   */
  putFloat(floatValue: number): ByteVector {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, floatValue, false); // big-endian
    const intBits = view.getInt32(0, false);
    return this.putInt(intBits);
  }

  /**
   * Puts a double into this byte vector. The byte vector is automatically enlarged if necessary.
   * @param doubleValue a double
   * @returns this byte vector
   */
  putDouble(doubleValue: number): ByteVector {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, doubleValue, false); // big-endian
    const highBits = view.getInt32(0, false);
    const lowBits = view.getInt32(4, false);
    return this.putInt(highBits).putInt(lowBits);
  }

  /**
   * Puts a String in UTF format into this byte vector. The byte vector is automatically
   * enlarged if necessary.
   * @param stringValue a String whose UTF-8 encoded length must be less than 65536.
   * @returns this byte vector
   */
  putUTF8(stringValue: string): ByteVector {
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(stringValue);
    const byteLength = utf8Bytes.length;
    
    if (byteLength > 65535) {
      throw new Error('UTF8 string too large');
    }
    
    const currentLength = this.length;
    this.ensureCapacity(currentLength + 2 + byteLength);
    const data = this.data;
    data[currentLength] = (byteLength >>> 8) & 0xFF;
    data[currentLength + 1] = byteLength & 0xFF;
    data.set(utf8Bytes, currentLength + 2);
    this.length = currentLength + 2 + byteLength;
    return this;
  }

  /**
   * Puts an array of bytes into this byte vector. The byte vector is automatically
   * enlarged if necessary.
   * @param byteArrayValue an array of bytes. May be null to put byteLength null bytes.
   * @param byteOffset index of the first byte of byteArrayValue that must be copied.
   * @param byteLength number of bytes of byteArrayValue that must be copied.
   * @returns this byte vector
   */
  putByteArray(byteArrayValue: Uint8Array | null, byteOffset: number, byteLength: number): ByteVector {
    const currentLength = this.length;
    this.ensureCapacity(currentLength + byteLength);
    if (byteArrayValue !== null) {
      this.data.set(byteArrayValue.subarray(byteOffset, byteOffset + byteLength), currentLength);
    }
    this.length = currentLength + byteLength;
    return this;
  }

  /**
   * Returns the byte at the given index.
   * @param index an index
   * @returns the byte at the given index
   */
  getByte(index: number): number {
    return this.data[index]!;
  }

  /**
   * Sets the byte at the given index.
   * @param index an index
   * @param value a byte value
   */
  setByte(index: number, value: number): void {
    this.data[index] = value & 0xFF;
  }

  /**
   * Returns the short at the given index.
   * @param index an index
   * @returns the short at the given index (big-endian)
   */
  getShort(index: number): number {
    return ((this.data[index]! << 8) | this.data[index + 1]!) & 0xFFFF;
  }

  /**
   * Sets the short at the given index.
   * @param index an index
   * @param value a short value
   */
  setShort(index: number, value: number): void {
    this.data[index] = (value >>> 8) & 0xFF;
    this.data[index + 1] = value & 0xFF;
  }

  /**
   * Returns the int at the given index.
   * @param index an index
   * @returns the int at the given index (big-endian)
   */
  getInt(index: number): number {
    return (
      (this.data[index]! << 24) |
      (this.data[index + 1]! << 16) |
      (this.data[index + 2]! << 8) |
      this.data[index + 3]!
    );
  }

  /**
   * Sets the int at the given index.
   * @param index an index
   * @param value an int value
   */
  setInt(index: number, value: number): void {
    this.data[index] = (value >>> 24) & 0xFF;
    this.data[index + 1] = (value >>> 16) & 0xFF;
    this.data[index + 2] = (value >>> 8) & 0xFF;
    this.data[index + 3] = value & 0xFF;
  }

  /**
   * Returns a copy of the content of this vector as a byte array.
   * @returns a copy of the content of this vector
   */
  toByteArray(): Uint8Array {
    return this.data.slice(0, this.length);
  }
}
