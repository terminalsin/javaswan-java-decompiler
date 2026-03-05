import type { MethodIR, ControlFlowGraph } from '@blkswn/java-ir';
import type { Type } from '@blkswn/java-asm';
import { MethodKey } from './keys';
import type { AnalysisClass } from './AnalysisClass';

/**
 * Wrapper around MethodIR that provides analysis-specific functionality.
 */
export class AnalysisMethod {
  /**
   * The underlying MethodIR.
   */
  public readonly methodIR: MethodIR;

  /**
   * The class that declares this method.
   */
  public readonly declaringClass: AnalysisClass;

  /**
   * The stable key for this method.
   */
  public readonly key: MethodKey;

  constructor(methodIR: MethodIR, declaringClass: AnalysisClass) {
    this.methodIR = methodIR;
    this.declaringClass = declaringClass;
    this.key = new MethodKey(declaringClass.name, methodIR.name, methodIR.descriptor);
  }

  /**
   * Gets the method name.
   */
  public get name(): string {
    return this.methodIR.name;
  }

  /**
   * Gets the method descriptor.
   */
  public get descriptor(): string {
    return this.methodIR.descriptor;
  }

  /**
   * Gets the return type.
   */
  public get returnType(): Type {
    return this.methodIR.returnType;
  }

  /**
   * Gets the parameter types.
   */
  public get parameterTypes(): readonly Type[] {
    return this.methodIR.parameterTypes;
  }

  /**
   * Gets the access flags.
   */
  public get access(): number {
    return this.methodIR.access;
  }

  /**
   * Gets the control flow graph (null for abstract/native methods).
   */
  public get cfg(): ControlFlowGraph | null {
    return this.methodIR.cfg;
  }

  /**
   * Returns whether this method is static.
   */
  public isStatic(): boolean {
    return this.methodIR.isStatic();
  }

  /**
   * Returns whether this method is abstract.
   */
  public isAbstract(): boolean {
    return this.methodIR.isAbstract();
  }

  /**
   * Returns whether this method is native.
   */
  public isNative(): boolean {
    return this.methodIR.isNative();
  }

  /**
   * Returns whether this method is public.
   */
  public isPublic(): boolean {
    return this.methodIR.isPublic();
  }

  /**
   * Returns whether this method is private.
   */
  public isPrivate(): boolean {
    return this.methodIR.isPrivate();
  }

  /**
   * Returns whether this method is protected.
   */
  public isProtected(): boolean {
    return this.methodIR.isProtected();
  }

  /**
   * Returns whether this method is final.
   */
  public isFinal(): boolean {
    return (this.access & 0x0010) !== 0;
  }

  /**
   * Returns whether this method is a constructor.
   */
  public isConstructor(): boolean {
    return this.methodIR.isConstructor();
  }

  /**
   * Returns whether this method is a static initializer.
   */
  public isStaticInitializer(): boolean {
    return this.methodIR.isStaticInitializer();
  }

  /**
   * Returns whether this method has code (is not abstract/native).
   */
  public hasCode(): boolean {
    return this.methodIR.hasCode();
  }

  /**
   * Gets the signature (name + descriptor).
   */
  public getSignature(): string {
    return this.key.getSignature();
  }

  public toString(): string {
    return `AnalysisMethod(${this.declaringClass.name}.${this.name}${this.descriptor})`;
  }
}
