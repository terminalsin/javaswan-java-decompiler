import type { Type } from '@blkswn/java-asm';
import { InvocationExpr } from './InvocationExpr';
import type { Expr, ExprVisitor } from './Expr';

/**
 * Represents a static method invocation.
 * Corresponds to: INVOKESTATIC
 */
export class StaticInvocationExpr extends InvocationExpr {
  /**
   * The internal name of the class that owns the method.
   */
  public readonly owner: string;

  constructor(
    returnType: Type,
    owner: string,
    methodName: string,
    methodDescriptor: string,
    args: readonly Expr[]
  ) {
    super(returnType, methodName, methodDescriptor, args);
    this.owner = owner;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitStaticInvocationExpr(this);
  }

  public toString(): string {
    const className = this.owner.replace(/\//g, '.');
    return `${className}.${this.methodName}(${this.formatArgs()})`;
  }
}
