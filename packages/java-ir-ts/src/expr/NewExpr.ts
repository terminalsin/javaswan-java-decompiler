import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents an object allocation expression.
 * Corresponds to: NEW
 * 
 * Note: This represents just the allocation. The constructor call
 * is a separate VirtualInvocationExpr with methodName "<init>".
 */
export class NewExpr extends Expr {
  public readonly type: Type;

  constructor(objectType: Type) {
    super();
    this.type = objectType;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitNewExpr(this);
  }

  public toString(): string {
    return `new ${this.type.getClassName()}`;
  }
}
