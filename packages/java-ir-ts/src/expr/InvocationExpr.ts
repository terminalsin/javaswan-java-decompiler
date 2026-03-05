import type { Type } from '@blkswn/java-asm';
import { Expr } from './Expr';

/**
 * Base class for all invocation expressions.
 */
export abstract class InvocationExpr extends Expr {
  public readonly type: Type;

  /**
   * The method name.
   */
  public readonly methodName: string;

  /**
   * The method descriptor.
   */
  public readonly methodDescriptor: string;

  /**
   * The argument expressions.
   */
  public readonly args: readonly Expr[];

  constructor(
    returnType: Type,
    methodName: string,
    methodDescriptor: string,
    args: readonly Expr[]
  ) {
    super();
    this.type = returnType;
    this.methodName = methodName;
    this.methodDescriptor = methodDescriptor;
    this.args = args;
  }

  protected formatArgs(): string {
    return this.args.map(arg => arg.toString()).join(', ');
  }
}
