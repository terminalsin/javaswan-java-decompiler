/**
 * A stable key for identifying a method across the analysis.
 * Uses internal class name format (e.g., "java/lang/Object").
 */
export class MethodKey {
  /**
   * The internal name of the declaring class.
   */
  public readonly declaringType: string;

  /**
   * The method name.
   */
  public readonly name: string;

  /**
   * The method descriptor.
   */
  public readonly descriptor: string;

  private readonly _hash: string;

  constructor(declaringType: string, name: string, descriptor: string) {
    this.declaringType = declaringType;
    this.name = name;
    this.descriptor = descriptor;
    this._hash = `${declaringType}.${name}${descriptor}`;
  }

  /**
   * Returns a unique string key for this method.
   */
  public toString(): string {
    return this._hash;
  }

  /**
   * Returns a name+descriptor key (without declaring type).
   * Useful for vtable lookups.
   */
  public getSignature(): string {
    return `${this.name}${this.descriptor}`;
  }

  /**
   * Checks equality with another MethodKey.
   */
  public equals(other: MethodKey): boolean {
    return this._hash === other._hash;
  }

  /**
   * Creates a MethodKey with a different declaring type.
   * Useful for finding overridden methods.
   */
  public withDeclaringType(newDeclaringType: string): MethodKey {
    return new MethodKey(newDeclaringType, this.name, this.descriptor);
  }
}

/**
 * A stable key for identifying a field across the analysis.
 */
export class FieldKey {
  /**
   * The internal name of the declaring class.
   */
  public readonly declaringType: string;

  /**
   * The field name.
   */
  public readonly name: string;

  /**
   * The field descriptor.
   */
  public readonly descriptor: string;

  private readonly _hash: string;

  constructor(declaringType: string, name: string, descriptor: string) {
    this.declaringType = declaringType;
    this.name = name;
    this.descriptor = descriptor;
    this._hash = `${declaringType}.${name}:${descriptor}`;
  }

  /**
   * Returns a unique string key for this field.
   */
  public toString(): string {
    return this._hash;
  }

  /**
   * Checks equality with another FieldKey.
   */
  public equals(other: FieldKey): boolean {
    return this._hash === other._hash;
  }

  /**
   * Creates a FieldKey with a different declaring type.
   */
  public withDeclaringType(newDeclaringType: string): FieldKey {
    return new FieldKey(newDeclaringType, this.name, this.descriptor);
  }
}
