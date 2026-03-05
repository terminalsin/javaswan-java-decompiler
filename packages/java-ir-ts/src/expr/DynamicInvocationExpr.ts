import type { Type, Handle } from '@blkswn/java-asm';
import { InvocationExpr } from './InvocationExpr';
import type { Expr, ExprVisitor } from './Expr';

/**
 * Represents an invokedynamic invocation.
 * Corresponds to: INVOKEDYNAMIC
 */
export class DynamicInvocationExpr extends InvocationExpr {
  /**
   * The bootstrap method handle.
   */
  public readonly bootstrapMethod: Handle;

  /**
   * The bootstrap method arguments.
   */
  public readonly bootstrapArgs: readonly unknown[];

  constructor(
    returnType: Type,
    methodName: string,
    methodDescriptor: string,
    args: readonly Expr[],
    bootstrapMethod: Handle,
    bootstrapArgs: readonly unknown[]
  ) {
    super(returnType, methodName, methodDescriptor, args);
    this.bootstrapMethod = bootstrapMethod;
    this.bootstrapArgs = bootstrapArgs;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitDynamicInvocationExpr(this);
  }

  public toString(): string {
    return `invokedynamic:${this.methodName}(${this.formatArgs()})`;
  }
}
