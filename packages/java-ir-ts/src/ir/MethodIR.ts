import type { Type } from '@blkswn/java-asm';
import type { AnnotationIR } from './AnnotationIR';
import { ControlFlowGraph } from './ControlFlowGraph';

/**
 * Represents a local variable entry.
 */
export interface LocalVariable {
  /**
   * The variable name.
   */
  readonly name: string;

  /**
   * The variable descriptor.
   */
  readonly descriptor: string;

  /**
   * The variable signature (for generics).
   */
  readonly signature: string | null;

  /**
   * The local variable index.
   */
  readonly index: number;

  /**
   * The start block index where the variable is in scope.
   */
  readonly startBlock: number;

  /**
   * The end block index where the variable is in scope (exclusive).
   */
  readonly endBlock: number;
}

/**
 * Represents a method in the IR.
 */
export class MethodIR {
  /**
   * The method access flags.
   */
  public readonly access: number;

  /**
   * The method name.
   */
  public readonly name: string;

  /**
   * The method descriptor.
   */
  public readonly descriptor: string;

  /**
   * The method signature (for generics).
   */
  public readonly signature: string | null;

  /**
   * The exception types that can be thrown.
   */
  public readonly exceptions: readonly string[];

  /**
   * The return type.
   */
  public readonly returnType: Type;

  /**
   * The parameter types.
   */
  public readonly parameterTypes: readonly Type[];

  /**
   * The control flow graph (null for abstract/native methods).
   */
  public cfg: ControlFlowGraph | null = null;

  /**
   * Local variable information.
   */
  public readonly localVariables: LocalVariable[] = [];

  /**
   * Annotations on this method.
   */
  public readonly annotations: AnnotationIR[] = [];

  /**
   * Maximum stack size.
   */
  public maxStack: number = 0;

  /**
   * Maximum local variables.
   */
  public maxLocals: number = 0;

  constructor(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: readonly string[],
    returnType: Type,
    parameterTypes: readonly Type[]
  ) {
    this.access = access;
    this.name = name;
    this.descriptor = descriptor;
    this.signature = signature;
    this.exceptions = exceptions;
    this.returnType = returnType;
    this.parameterTypes = parameterTypes;
  }

  /**
   * Returns whether this method is static.
   */
  public isStatic(): boolean {
    return (this.access & 0x0008) !== 0;
  }

  /**
   * Returns whether this method is abstract.
   */
  public isAbstract(): boolean {
    return (this.access & 0x0400) !== 0;
  }

  /**
   * Returns whether this method is native.
   */
  public isNative(): boolean {
    return (this.access & 0x0100) !== 0;
  }

  /**
   * Returns whether this method is public.
   */
  public isPublic(): boolean {
    return (this.access & 0x0001) !== 0;
  }

  /**
   * Returns whether this method is private.
   */
  public isPrivate(): boolean {
    return (this.access & 0x0002) !== 0;
  }

  /**
   * Returns whether this method is protected.
   */
  public isProtected(): boolean {
    return (this.access & 0x0004) !== 0;
  }

  /**
   * Returns whether this method is a constructor.
   */
  public isConstructor(): boolean {
    return this.name === '<init>';
  }

  /**
   * Returns whether this method is a static initializer.
   */
  public isStaticInitializer(): boolean {
    return this.name === '<clinit>';
  }

  /**
   * Returns whether this method has code (is not abstract/native).
   */
  public hasCode(): boolean {
    return this.cfg !== null;
  }

  /**
   * Adds a local variable entry.
   */
  public addLocalVariable(variable: LocalVariable): void {
    this.localVariables.push(variable);
  }

  /**
   * Gets the variable name for a local variable index.
   */
  public getVariableName(index: number, blockIndex: number): string | null {
    for (const lv of this.localVariables) {
      if (lv.index === index && blockIndex >= lv.startBlock && blockIndex < lv.endBlock) {
        return lv.name;
      }
    }
    // Fallback: if no range match, return any name for this index.
    // This handles cases where the block index isn't precisely tracked
    // (e.g., decompiler passes blockIndex=0 for all lookups).
    for (const lv of this.localVariables) {
      if (lv.index === index) {
        return lv.name;
      }
    }
    return null;
  }

  /**
   * Gets the variable descriptor for a local variable index.
   */
  public getVariableDescriptor(index: number, blockIndex: number): string | null {
    for (const lv of this.localVariables) {
      if (lv.index === index && blockIndex >= lv.startBlock && blockIndex < lv.endBlock) {
        return lv.descriptor;
      }
    }
    for (const lv of this.localVariables) {
      if (lv.index === index) {
        return lv.descriptor;
      }
    }
    return null;
  }

  /**
   * Gets the variable signature (for generics) for a local variable index.
   */
  public getVariableSignature(index: number, blockIndex: number): string | null {
    for (const lv of this.localVariables) {
      if (lv.index === index && blockIndex >= lv.startBlock && blockIndex < lv.endBlock) {
        return lv.signature;
      }
    }
    for (const lv of this.localVariables) {
      if (lv.index === index) {
        return lv.signature;
      }
    }
    return null;
  }

  /**
   * Returns the number of local variable slots used by method parameters
   * (including 'this' for instance methods).
   */
  public getParameterSlotCount(): number {
    let slot = this.isStatic() ? 0 : 1; // 'this' takes slot 0 for instance methods
    for (const t of this.parameterTypes) {
      slot += t.getSize();
    }
    return slot;
  }

  public toString(): string {
    const params = this.parameterTypes.map(t => t.getClassName()).join(', ');
    return `${this.name}(${params}): ${this.returnType.getClassName()}`;
  }
}
