import { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents an instanceof check expression.
 * Corresponds to: INSTANCEOF
 */
export class InstanceOfExpr extends Expr {
  /**
   * instanceof always produces a boolean (int in JVM).
   */
  public readonly type: Type = Type.INT_TYPE;

  /**
   * The expression being checked.
   */
  public readonly operand: Expr;

  /**
   * The type to check against.
   */
  public readonly checkType: Type;

  constructor(operand: Expr, checkType: Type) {
    super();
    this.operand = operand;
    this.checkType = checkType;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitInstanceOfExpr(this);
  }

  public toString(): string {
    return `(${this.operand} instanceof ${this.checkType.getClassName()})`;
  }
}
