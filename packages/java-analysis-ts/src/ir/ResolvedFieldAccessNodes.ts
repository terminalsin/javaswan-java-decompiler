import {
  FieldLoadExpr,
  FieldStoreStmt,
  type Expr,
  type ExprVisitor,
  type StmtVisitor
} from '@blkswn/java-ir';
import type { Type } from '@blkswn/java-asm';
import type { ResolvedFieldRef } from '../model/externals';

/**
 * A field load expression with resolved field reference.
 */
export class ResolvedFieldLoadExpr extends FieldLoadExpr {
  /**
   * The resolved field.
   */
  public readonly resolvedField: ResolvedFieldRef;

  constructor(
    type: Type,
    owner: string,
    fieldName: string,
    fieldDescriptor: string,
    instance: Expr | null,
    isStatic: boolean,
    resolvedField: ResolvedFieldRef
  ) {
    super(type, owner, fieldName, fieldDescriptor, instance, isStatic);
    this.resolvedField = resolvedField;
  }

  /**
   * Creates a resolved version from an existing FieldLoadExpr.
   */
  public static from(
    expr: FieldLoadExpr,
    resolvedField: ResolvedFieldRef
  ): ResolvedFieldLoadExpr {
    return new ResolvedFieldLoadExpr(
      expr.type,
      expr.owner,
      expr.fieldName,
      expr.fieldDescriptor,
      expr.instance,
      expr.isStatic,
      resolvedField
    );
  }

  /**
   * Creates a copy with an updated instance expression.
   */
  public withInstance(newInstance: Expr | null): ResolvedFieldLoadExpr {
    return new ResolvedFieldLoadExpr(
      this.type,
      this.owner,
      this.fieldName,
      this.fieldDescriptor,
      newInstance,
      this.isStatic,
      this.resolvedField
    );
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitFieldLoadExpr(this);
  }
}

/**
 * A field store statement with resolved field reference.
 */
export class ResolvedFieldStoreStmt extends FieldStoreStmt {
  /**
   * The resolved field.
   */
  public readonly resolvedField: ResolvedFieldRef;

  constructor(
    owner: string,
    fieldName: string,
    fieldDescriptor: string,
    instance: Expr | null,
    value: Expr,
    isStatic: boolean,
    resolvedField: ResolvedFieldRef
  ) {
    super(owner, fieldName, fieldDescriptor, instance, value, isStatic);
    this.resolvedField = resolvedField;
  }

  /**
   * Creates a resolved version from an existing FieldStoreStmt.
   */
  public static from(
    stmt: FieldStoreStmt,
    resolvedField: ResolvedFieldRef
  ): ResolvedFieldStoreStmt {
    return new ResolvedFieldStoreStmt(
      stmt.owner,
      stmt.fieldName,
      stmt.fieldDescriptor,
      stmt.instance,
      stmt.value,
      stmt.isStatic,
      resolvedField
    );
  }

  /**
   * Creates a copy with updated instance and value expressions.
   */
  public withInstanceAndValue(
    newInstance: Expr | null,
    newValue: Expr
  ): ResolvedFieldStoreStmt {
    return new ResolvedFieldStoreStmt(
      this.owner,
      this.fieldName,
      this.fieldDescriptor,
      newInstance,
      newValue,
      this.isStatic,
      this.resolvedField
    );
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitFieldStoreStmt(this);
  }
}

/**
 * Type guard to check if an expression is a resolved field load.
 */
export function isResolvedFieldLoad(expr: Expr): expr is ResolvedFieldLoadExpr {
  return expr instanceof ResolvedFieldLoadExpr;
}

/**
 * Type guard to check if a statement is a resolved field store.
 */
export function isResolvedFieldStore(stmt: unknown): stmt is ResolvedFieldStoreStmt {
  return stmt instanceof ResolvedFieldStoreStmt;
}
