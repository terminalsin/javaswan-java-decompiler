import { Handle } from './Handle';

/**
 * A constant whose value is computed at runtime by a bootstrap method.
 */
export class ConstantDynamic {
  /** The name of this constant. */
  private readonly name: string;

  /** The descriptor of this constant. */
  private readonly descriptor: string;

  /** The bootstrap method that computes this constant. */
  private readonly bootstrapMethod: Handle;

  /** The arguments to pass to the bootstrap method. */
  private readonly bootstrapMethodArguments: unknown[];

  /**
   * Constructs a new ConstantDynamic.
   * @param name the name of the constant
   * @param descriptor the descriptor of the constant
   * @param bootstrapMethod the bootstrap method
   * @param bootstrapMethodArguments the bootstrap method arguments
   */
  constructor(
    name: string,
    descriptor: string,
    bootstrapMethod: Handle,
    ...bootstrapMethodArguments: unknown[]
  ) {
    this.name = name;
    this.descriptor = descriptor;
    this.bootstrapMethod = bootstrapMethod;
    this.bootstrapMethodArguments = bootstrapMethodArguments;
  }

  /**
   * Returns the name of this constant.
   * @returns the name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns the descriptor of this constant.
   * @returns the descriptor
   */
  getDescriptor(): string {
    return this.descriptor;
  }

  /**
   * Returns the bootstrap method used to compute the value of this constant.
   * @returns the bootstrap method
   */
  getBootstrapMethod(): Handle {
    return this.bootstrapMethod;
  }

  /**
   * Returns the number of arguments to the bootstrap method.
   * @returns the number of arguments
   */
  getBootstrapMethodArgumentCount(): number {
    return this.bootstrapMethodArguments.length;
  }

  /**
   * Returns an argument to the bootstrap method.
   * @param index the argument index
   * @returns the argument at the given index
   */
  getBootstrapMethodArgument(index: number): unknown {
    return this.bootstrapMethodArguments[index];
  }

  /**
   * Returns all arguments to the bootstrap method.
   * @returns the arguments array
   */
  getBootstrapMethodArguments(): unknown[] {
    return [...this.bootstrapMethodArguments];
  }

  /**
   * Returns the size of this constant (1 for most types, 2 for long/double).
   * @returns the size
   */
  getSize(): number {
    const firstChar = this.descriptor.charAt(0);
    return (firstChar === 'J' || firstChar === 'D') ? 2 : 1;
  }

  /**
   * Returns a string representation of this constant.
   * @returns a string representation
   */
  toString(): string {
    return `${this.name}:${this.descriptor}`;
  }

  /**
   * Tests if this constant is equal to another constant.
   * @param other another constant
   * @returns true if constants are equal
   */
  equals(other: ConstantDynamic): boolean {
    if (this === other) return true;
    if (
      this.name !== other.name ||
      this.descriptor !== other.descriptor ||
      !this.bootstrapMethod.equals(other.bootstrapMethod) ||
      this.bootstrapMethodArguments.length !== other.bootstrapMethodArguments.length
    ) {
      return false;
    }
    for (let i = 0; i < this.bootstrapMethodArguments.length; i++) {
      const thisArg = this.bootstrapMethodArguments[i];
      const otherArg = other.bootstrapMethodArguments[i];
      if (thisArg !== otherArg) {
        // Deep comparison for complex types
        if (thisArg instanceof Handle && otherArg instanceof Handle) {
          if (!thisArg.equals(otherArg)) return false;
        } else if (thisArg instanceof ConstantDynamic && otherArg instanceof ConstantDynamic) {
          if (!thisArg.equals(otherArg)) return false;
        } else {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Returns a hash code for this constant.
   * @returns a hash code
   */
  hashCode(): number {
    let hash = this.hashString(this.name);
    hash = ((hash * 31) + this.hashString(this.descriptor)) | 0;
    hash = ((hash * 31) + this.bootstrapMethod.hashCode()) | 0;
    for (const arg of this.bootstrapMethodArguments) {
      hash = ((hash * 31) + this.hashArg(arg)) | 0;
    }
    return hash;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * 31) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  private hashArg(arg: unknown): number {
    if (typeof arg === 'number') return arg | 0;
    if (typeof arg === 'bigint') return Number(arg & 0xFFFFFFFFn) | 0;
    if (typeof arg === 'string') return this.hashString(arg);
    if (arg instanceof Handle) return arg.hashCode();
    if (arg instanceof ConstantDynamic) return arg.hashCode();
    return 0;
  }
}
