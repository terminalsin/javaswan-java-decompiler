import { ASM9 } from '../core/Opcodes';

/**
 * A visitor to visit a generic signature. The methods of this interface must be called in one of
 * the following orders:
 *
 * ClassSignature: visitFormalTypeParameter (visitClassBound | visitInterfaceBound)* 
 *                 visitSuperclass visitInterface*
 * MethodSignature: visitFormalTypeParameter (visitClassBound | visitInterfaceBound)* 
 *                  visitParameterType* visitReturnType visitExceptionType*
 * TypeSignature: visitBaseType | visitTypeVariable | 
 *                visitArrayType | (visitClassType visitTypeArgument* (visitInnerClassType visitTypeArgument*)* visitEnd)
 */
export abstract class SignatureVisitor {
  /** Wildcard for an "extends" type argument. */
  static readonly EXTENDS = '+';

  /** Wildcard for a "super" type argument. */
  static readonly SUPER = '-';

  /** Wildcard for a "*" type argument (unbounded). */
  static readonly INSTANCEOF = '=';

  /** The ASM API version implemented by this visitor. */
  protected readonly api: number;

  /**
   * Constructs a new SignatureVisitor.
   * @param api the ASM API version (ASM4 to ASM9)
   */
  constructor(api: number = ASM9) {
    this.api = api;
  }

  /**
   * Visits a formal type parameter.
   * @param name the name of the formal type parameter
   */
  visitFormalTypeParameter(name: string): void {
    // Default implementation does nothing
    void name;
  }

  /**
   * Visits the class bound of the last visited formal type parameter.
   * @returns a non null visitor to visit the signature of the class bound
   */
  visitClassBound(): SignatureVisitor {
    return this;
  }

  /**
   * Visits an interface bound of the last visited formal type parameter.
   * @returns a non null visitor to visit the signature of the interface bound
   */
  visitInterfaceBound(): SignatureVisitor {
    return this;
  }

  /**
   * Visits the super class.
   * @returns a non null visitor to visit the signature of the super class type
   */
  visitSuperclass(): SignatureVisitor {
    return this;
  }

  /**
   * Visits an interface implemented or extended by the class.
   * @returns a non null visitor to visit the signature of the interface type
   */
  visitInterface(): SignatureVisitor {
    return this;
  }

  /**
   * Visits a parameter type of the method signature.
   * @returns a non null visitor to visit the signature of the parameter type
   */
  visitParameterType(): SignatureVisitor {
    return this;
  }

  /**
   * Visits the return type of the method signature.
   * @returns a non null visitor to visit the signature of the return type
   */
  visitReturnType(): SignatureVisitor {
    return this;
  }

  /**
   * Visits an exception type of the method signature.
   * @returns a non null visitor to visit the signature of the exception type
   */
  visitExceptionType(): SignatureVisitor {
    return this;
  }

  /**
   * Visits a signature corresponding to a primitive type.
   * @param descriptor the descriptor of the primitive type, one of 'B', 'C', 'D', 'F', 'I', 'J', 'S', 'Z', or 'V'
   */
  visitBaseType(descriptor: string): void {
    // Default implementation does nothing
    void descriptor;
  }

  /**
   * Visits a signature corresponding to a type variable.
   * @param name the name of the type variable
   */
  visitTypeVariable(name: string): void {
    // Default implementation does nothing
    void name;
  }

  /**
   * Visits a signature corresponding to an array type.
   * @returns a non null visitor to visit the signature of the array element type
   */
  visitArrayType(): SignatureVisitor {
    return this;
  }

  /**
   * Starts the visit of a signature corresponding to a class or interface type.
   * @param name the internal name of the class or interface
   */
  visitClassType(name: string): void {
    // Default implementation does nothing
    void name;
  }

  /**
   * Visits an inner class type.
   * @param name the local name of the inner class in its enclosing class
   */
  visitInnerClassType(name: string): void {
    // Default implementation does nothing
    void name;
  }

  /**
   * Visits an unbounded type argument of the last visited class or inner class type.
   */
  visitTypeArgument(): void {
    // Default implementation does nothing
  }

  /**
   * Visits a type argument of the last visited class or inner class type.
   * @param wildcard '+', '-' or '=' (unbounded, extends, super)
   * @returns a non null visitor to visit the signature of the type argument
   */
  visitTypeArgumentWildcard(wildcard: string): SignatureVisitor {
    void wildcard;
    return this;
  }

  /**
   * Ends the visit of a signature corresponding to a class or interface type.
   */
  visitEnd(): void {
    // Default implementation does nothing
  }
}
