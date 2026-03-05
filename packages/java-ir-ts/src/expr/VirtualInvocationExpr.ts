import type { Type } from '@blkswn/java-asm';
import { InvocationExpr } from './InvocationExpr';
import type { Expr, ExprVisitor } from './Expr';

/**
 * The kind of virtual invocation.
 */
export enum VirtualInvocationKind {
  /** Regular virtual dispatch (invokevirtual) */
  VIRTUAL = 'virtual',
  /** Direct call to specific implementation (invokespecial) - constructors, super calls, private methods */
  SPECIAL = 'special',
  /** Interface method call (invokeinterface) */
  INTERFACE = 'interface',
}

/**
 * Represents a virtual/special/interface method invocation.
 * Corresponds to: INVOKEVIRTUAL, INVOKESPECIAL, INVOKEINTERFACE
 */
export class VirtualInvocationExpr extends InvocationExpr {
  /**
   * The internal name of the class that owns the method.
   */
  public readonly owner: string;

  /**
   * The receiver object expression.
   */
  public readonly receiver: Expr;

  /**
   * The kind of virtual invocation.
   */
  public readonly kind: VirtualInvocationKind;

  /**
   * Whether the owner is an interface.
   */
  public readonly isInterface: boolean;

  constructor(
    returnType: Type,
    owner: string,
    methodName: string,
    methodDescriptor: string,
    receiver: Expr,
    args: readonly Expr[],
    kind: VirtualInvocationKind,
    isInterface: boolean
  ) {
    super(returnType, methodName, methodDescriptor, args);
    this.owner = owner;
    this.receiver = receiver;
    this.kind = kind;
    this.isInterface = isInterface;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitVirtualInvocationExpr(this);
  }

  public toString(): string {
    const prefix = this.kind === VirtualInvocationKind.SPECIAL ? 'super.' : '';
    return `${this.receiver}.${prefix}${this.methodName}(${this.formatArgs()})`;
  }
}
