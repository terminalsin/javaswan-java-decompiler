import {
  StaticInvocationExpr,
  VirtualInvocationExpr,
  VirtualInvocationKind,
  type Expr,
  type ExprVisitor
} from '@blkswn/java-ir';
import type { Type } from '@blkswn/java-asm';
import type { ResolvedMethodRef } from '../model/externals';

/**
 * A static invocation expression with resolved method reference.
 */
export class ResolvedStaticInvocationExpr extends StaticInvocationExpr {
  /**
   * The resolved method declaration.
   */
  public readonly declaredMethod: ResolvedMethodRef;

  constructor(
    returnType: Type,
    owner: string,
    methodName: string,
    methodDescriptor: string,
    args: readonly Expr[],
    declaredMethod: ResolvedMethodRef
  ) {
    super(returnType, owner, methodName, methodDescriptor, args);
    this.declaredMethod = declaredMethod;
  }

  /**
   * Creates a resolved version from an existing StaticInvocationExpr.
   */
  public static from(
    expr: StaticInvocationExpr,
    declaredMethod: ResolvedMethodRef
  ): ResolvedStaticInvocationExpr {
    return new ResolvedStaticInvocationExpr(
      expr.type,
      expr.owner,
      expr.methodName,
      expr.methodDescriptor,
      expr.args,
      declaredMethod
    );
  }

  /**
   * Creates a copy with updated arguments.
   */
  public withArgs(newArgs: readonly Expr[]): ResolvedStaticInvocationExpr {
    return new ResolvedStaticInvocationExpr(
      this.type,
      this.owner,
      this.methodName,
      this.methodDescriptor,
      newArgs,
      this.declaredMethod
    );
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitStaticInvocationExpr(this);
  }
}

/**
 * A virtual/special/interface invocation expression with resolved method references.
 */
export class ResolvedVirtualInvocationExpr extends VirtualInvocationExpr {
  /**
   * The resolved method declaration (link-time resolution).
   */
  public readonly declaredMethod: ResolvedMethodRef;

  /**
   * Possible runtime targets for virtual/interface dispatch.
   * Empty for special invocations (constructors, super calls).
   */
  public readonly possibleTargets: readonly ResolvedMethodRef[];

  constructor(
    returnType: Type,
    owner: string,
    methodName: string,
    methodDescriptor: string,
    receiver: Expr,
    args: readonly Expr[],
    kind: VirtualInvocationKind,
    isInterface: boolean,
    declaredMethod: ResolvedMethodRef,
    possibleTargets: readonly ResolvedMethodRef[]
  ) {
    super(returnType, owner, methodName, methodDescriptor, receiver, args, kind, isInterface);
    this.declaredMethod = declaredMethod;
    this.possibleTargets = possibleTargets;
  }

  /**
   * Creates a resolved version from an existing VirtualInvocationExpr.
   */
  public static from(
    expr: VirtualInvocationExpr,
    declaredMethod: ResolvedMethodRef,
    possibleTargets: readonly ResolvedMethodRef[]
  ): ResolvedVirtualInvocationExpr {
    return new ResolvedVirtualInvocationExpr(
      expr.type,
      expr.owner,
      expr.methodName,
      expr.methodDescriptor,
      expr.receiver,
      expr.args,
      expr.kind,
      expr.isInterface,
      declaredMethod,
      possibleTargets
    );
  }

  /**
   * Creates a copy with updated receiver and arguments.
   */
  public withReceiverAndArgs(
    newReceiver: Expr,
    newArgs: readonly Expr[]
  ): ResolvedVirtualInvocationExpr {
    return new ResolvedVirtualInvocationExpr(
      this.type,
      this.owner,
      this.methodName,
      this.methodDescriptor,
      newReceiver,
      newArgs,
      this.kind,
      this.isInterface,
      this.declaredMethod,
      this.possibleTargets
    );
  }

  /**
   * Returns true if this is a monomorphic call site (only one possible target).
   */
  public isMonomorphic(): boolean {
    return this.possibleTargets.length === 1;
  }

  /**
   * Returns true if this is a polymorphic call site (multiple possible targets).
   */
  public isPolymorphic(): boolean {
    return this.possibleTargets.length > 1;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitVirtualInvocationExpr(this);
  }
}

/**
 * Type guard to check if an expression is a resolved static invocation.
 */
export function isResolvedStaticInvocation(expr: Expr): expr is ResolvedStaticInvocationExpr {
  return expr instanceof ResolvedStaticInvocationExpr;
}

/**
 * Type guard to check if an expression is a resolved virtual invocation.
 */
export function isResolvedVirtualInvocation(expr: Expr): expr is ResolvedVirtualInvocationExpr {
  return expr instanceof ResolvedVirtualInvocationExpr;
}
