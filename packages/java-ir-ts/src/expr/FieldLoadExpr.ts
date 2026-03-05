import type { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents a field read expression.
 * Corresponds to: GETFIELD, GETSTATIC
 */
export class FieldLoadExpr extends Expr {
  public readonly type: Type;

  /**
   * The internal name of the class that owns the field.
   */
  public readonly owner: string;

  /**
   * The field name.
   */
  public readonly fieldName: string;

  /**
   * The field descriptor.
   */
  public readonly fieldDescriptor: string;

  /**
   * The object instance expression (null for static fields).
   */
  public readonly instance: Expr | null;

  /**
   * Whether this is a static field access.
   */
  public readonly isStatic: boolean;

  constructor(
    type: Type,
    owner: string,
    fieldName: string,
    fieldDescriptor: string,
    instance: Expr | null,
    isStatic: boolean
  ) {
    super();
    this.type = type;
    this.owner = owner;
    this.fieldName = fieldName;
    this.fieldDescriptor = fieldDescriptor;
    this.instance = instance;
    this.isStatic = isStatic;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitFieldLoadExpr(this);
  }

  public toString(): string {
    if (this.isStatic) {
      const className = this.owner.replace(/\//g, '.');
      return `${className}.${this.fieldName}`;
    }
    return `${this.instance}.${this.fieldName}`;
  }
}
