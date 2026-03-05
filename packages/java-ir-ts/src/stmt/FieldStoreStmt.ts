import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents a field store statement.
 * Corresponds to: PUTFIELD, PUTSTATIC
 */
export class FieldStoreStmt extends Stmt {
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
   * The value expression to store.
   */
  public readonly value: Expr;

  /**
   * Whether this is a static field access.
   */
  public readonly isStatic: boolean;

  constructor(
    owner: string,
    fieldName: string,
    fieldDescriptor: string,
    instance: Expr | null,
    value: Expr,
    isStatic: boolean
  ) {
    super();
    this.owner = owner;
    this.fieldName = fieldName;
    this.fieldDescriptor = fieldDescriptor;
    this.instance = instance;
    this.value = value;
    this.isStatic = isStatic;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitFieldStoreStmt(this);
  }

  public toString(): string {
    if (this.isStatic) {
      const className = this.owner.replace(/\//g, '.');
      return `${className}.${this.fieldName} = ${this.value}`;
    }
    return `${this.instance}.${this.fieldName} = ${this.value}`;
  }

  public getExpressions(): readonly Expr[] {
    if (this.instance !== null) {
      return [this.instance, this.value];
    }
    return [this.value];
  }
}
