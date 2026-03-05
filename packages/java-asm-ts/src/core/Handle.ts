import {
  H_GETFIELD,
  H_GETSTATIC,
  H_PUTFIELD,
  H_PUTSTATIC,
  H_INVOKEVIRTUAL,
  H_INVOKESTATIC,
  H_INVOKESPECIAL,
  H_NEWINVOKESPECIAL,
  H_INVOKEINTERFACE,
} from './Opcodes';

/**
 * A reference to a field or a method.
 */
export class Handle {
  /**
   * The kind of field or method designated by this Handle.
   * Should be one of H_GETFIELD, H_GETSTATIC, H_PUTFIELD, H_PUTSTATIC,
   * H_INVOKEVIRTUAL, H_INVOKESTATIC, H_INVOKESPECIAL, H_NEWINVOKESPECIAL,
   * or H_INVOKEINTERFACE.
   */
  private readonly tag: number;

  /** The internal name of the class that owns the field or method designated by this handle. */
  private readonly owner: string;

  /** The name of the field or method designated by this handle. */
  private readonly name: string;

  /** The descriptor of the field or method designated by this handle. */
  private readonly descriptor: string;

  /** Whether the owner is an interface. */
  private readonly isInterfaceFlag: boolean;

  /**
   * Constructs a new field or method handle.
   * @param tag the kind of field or method designated by this Handle
   * @param owner the internal name of the class that owns the field or method
   * @param name the name of the field or method
   * @param descriptor the descriptor of the field or method
   * @param isInterface whether the owner is an interface
   */
  constructor(tag: number, owner: string, name: string, descriptor: string, isInterface: boolean = false) {
    this.tag = tag;
    this.owner = owner;
    this.name = name;
    this.descriptor = descriptor;
    // For method handles, interface flag is relevant only for certain tags
    if (tag === H_INVOKEINTERFACE) {
      this.isInterfaceFlag = true;
    } else if (tag >= H_INVOKEVIRTUAL && tag <= H_INVOKESPECIAL) {
      this.isInterfaceFlag = isInterface;
    } else {
      this.isInterfaceFlag = false;
    }
  }

  /**
   * Returns the kind of field or method designated by this handle.
   * @returns one of the H_* constants
   */
  getTag(): number {
    return this.tag;
  }

  /**
   * Returns the internal name of the class that owns the field or method designated by this handle.
   * @returns the owner's internal name
   */
  getOwner(): string {
    return this.owner;
  }

  /**
   * Returns the name of the field or method designated by this handle.
   * @returns the name of the field or method
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns the descriptor of the field or method designated by this handle.
   * @returns the descriptor of the field or method
   */
  getDesc(): string {
    return this.descriptor;
  }

  /**
   * Returns true if the owner of the field or method designated by this handle is an interface.
   * @returns true if the owner is an interface
   */
  isInterface(): boolean {
    return this.isInterfaceFlag;
  }

  /**
   * Returns true if this handle designates a field.
   * @returns true if this handle designates a field
   */
  isField(): boolean {
    return this.tag <= H_PUTSTATIC;
  }

  /**
   * Returns true if this handle designates a method.
   * @returns true if this handle designates a method
   */
  isMethod(): boolean {
    return this.tag >= H_INVOKEVIRTUAL;
  }

  /**
   * Returns a string representation of this handle.
   * @returns a string representation
   */
  toString(): string {
    return `${this.owner}.${this.name}${this.descriptor} (${this.tag})`;
  }

  /**
   * Tests if this handle is equal to another handle.
   * @param other another handle
   * @returns true if handles are equal
   */
  equals(other: Handle): boolean {
    if (this === other) return true;
    return (
      this.tag === other.tag &&
      this.owner === other.owner &&
      this.name === other.name &&
      this.descriptor === other.descriptor &&
      this.isInterfaceFlag === other.isInterfaceFlag
    );
  }

  /**
   * Returns a hash code for this handle.
   * @returns a hash code
   */
  hashCode(): number {
    let hash = this.tag;
    hash = ((hash * 31) + this.hashString(this.owner)) | 0;
    hash = ((hash * 31) + this.hashString(this.name)) | 0;
    hash = ((hash * 31) + this.hashString(this.descriptor)) | 0;
    return hash;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * 31) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }
}

/**
 * Handle tag constants for convenience
 */
export const HandleTag = {
  H_GETFIELD,
  H_GETSTATIC,
  H_PUTFIELD,
  H_PUTSTATIC,
  H_INVOKEVIRTUAL,
  H_INVOKESTATIC,
  H_INVOKESPECIAL,
  H_NEWINVOKESPECIAL,
  H_INVOKEINTERFACE,
} as const;
