import { SignatureVisitor } from '../visitors/SignatureVisitor';
import { ASM9 } from '../core/Opcodes';

/**
 * A SignatureVisitor that generates a signature from the visited elements.
 */
export class SignatureWriter extends SignatureVisitor {
  /** The builder to create the signature. */
  private readonly builder: string[] = [];

  /** Whether we're currently in a class bound context. */
  private hasFormals: boolean = false;

  /** Whether we're currently in a parameter context. */
  private hasParameters: boolean = false;

  /** The current argument stack (for nested type arguments). */
  private argumentStack: number = 0;

  /**
   * Constructs a new SignatureWriter.
   */
  constructor() {
    super(ASM9);
  }

  override visitFormalTypeParameter(name: string): void {
    if (!this.hasFormals) {
      this.hasFormals = true;
      this.builder.push('<');
    }
    this.builder.push(name);
    this.builder.push(':');
  }

  override visitClassBound(): SignatureVisitor {
    return this;
  }

  override visitInterfaceBound(): SignatureVisitor {
    this.builder.push(':');
    return this;
  }

  override visitSuperclass(): SignatureVisitor {
    this.endFormals();
    return this;
  }

  override visitInterface(): SignatureVisitor {
    return this;
  }

  override visitParameterType(): SignatureVisitor {
    this.endFormals();
    if (!this.hasParameters) {
      this.hasParameters = true;
      this.builder.push('(');
    }
    return this;
  }

  override visitReturnType(): SignatureVisitor {
    this.endFormals();
    if (!this.hasParameters) {
      this.builder.push('(');
    }
    this.builder.push(')');
    return this;
  }

  override visitExceptionType(): SignatureVisitor {
    this.builder.push('^');
    return this;
  }

  override visitBaseType(descriptor: string): void {
    this.builder.push(descriptor);
  }

  override visitTypeVariable(name: string): void {
    this.builder.push('T');
    this.builder.push(name);
    this.builder.push(';');
  }

  override visitArrayType(): SignatureVisitor {
    this.builder.push('[');
    return this;
  }

  override visitClassType(name: string): void {
    this.builder.push('L');
    this.builder.push(name);
    this.argumentStack *= 2; // Push context
  }

  override visitInnerClassType(name: string): void {
    this.endArguments();
    this.builder.push('.');
    this.builder.push(name);
    this.argumentStack *= 2; // Push context
  }

  override visitTypeArgument(): void {
    if ((this.argumentStack % 2) === 0) {
      this.argumentStack |= 1;
      this.builder.push('<');
    }
    this.builder.push('*');
  }

  override visitTypeArgumentWildcard(wildcard: string): SignatureVisitor {
    if ((this.argumentStack % 2) === 0) {
      this.argumentStack |= 1;
      this.builder.push('<');
    }
    if (wildcard !== SignatureVisitor.INSTANCEOF) {
      this.builder.push(wildcard);
    }
    return this;
  }

  override visitEnd(): void {
    this.endArguments();
    this.builder.push(';');
  }

  /**
   * Returns the signature that was built.
   * @returns the built signature
   */
  toString(): string {
    return this.builder.join('');
  }

  /**
   * Ends the formal type parameters section if needed.
   */
  private endFormals(): void {
    if (this.hasFormals) {
      this.hasFormals = false;
      this.builder.push('>');
    }
  }

  /**
   * Ends the current type arguments if needed.
   */
  private endArguments(): void {
    if ((this.argumentStack % 2) === 1) {
      this.builder.push('>');
    }
    this.argumentStack = Math.floor(this.argumentStack / 2);
  }
}
