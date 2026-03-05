import type { ClassIR } from '../ir/ClassIR';
import type { MethodIR } from '../ir/MethodIR';
import type { FieldIR } from '../ir/FieldIR';
import type { BasicBlock } from '../ir/BasicBlock';
import type { Stmt } from '../stmt/Stmt';
import type { Expr } from '../expr/Expr';

/**
 * Visitor interface for IR traversal.
 * Provides hooks for visiting classes, methods, fields, blocks, statements, and expressions.
 */
export interface IRVisitor {
  /**
   * Called when visiting a class.
   */
  visitClass?(classIR: ClassIR): void;

  /**
   * Called after visiting a class.
   */
  visitClassEnd?(classIR: ClassIR): void;

  /**
   * Called when visiting a field.
   */
  visitField?(fieldIR: FieldIR): void;

  /**
   * Called when visiting a method.
   */
  visitMethod?(methodIR: MethodIR): void;

  /**
   * Called after visiting a method.
   */
  visitMethodEnd?(methodIR: MethodIR): void;

  /**
   * Called when visiting a basic block.
   */
  visitBlock?(block: BasicBlock): void;

  /**
   * Called after visiting a basic block.
   */
  visitBlockEnd?(block: BasicBlock): void;

  /**
   * Called when visiting a statement.
   */
  visitStatement?(stmt: Stmt): void;

  /**
   * Called when visiting an expression.
   */
  visitExpression?(expr: Expr): void;
}

/**
 * Walks an IR tree and calls visitor methods.
 */
export class IRWalker {
  private readonly visitor: IRVisitor;

  constructor(visitor: IRVisitor) {
    this.visitor = visitor;
  }

  /**
   * Visits a class and all its contents.
   */
  public visitClass(classIR: ClassIR): void {
    this.visitor.visitClass?.(classIR);

    // Visit fields
    for (const field of classIR.fields) {
      this.visitor.visitField?.(field);
    }

    // Visit methods
    for (const method of classIR.methods) {
      this.visitMethod(method);
    }

    this.visitor.visitClassEnd?.(classIR);
  }

  /**
   * Visits a method and all its contents.
   */
  public visitMethod(methodIR: MethodIR): void {
    this.visitor.visitMethod?.(methodIR);

    if (methodIR.cfg) {
      for (const block of methodIR.cfg) {
        this.visitBlock(block);
      }
    }

    this.visitor.visitMethodEnd?.(methodIR);
  }

  /**
   * Visits a basic block and all its statements.
   */
  public visitBlock(block: BasicBlock): void {
    this.visitor.visitBlock?.(block);

    for (const stmt of block.statements) {
      this.visitStatement(stmt);
    }

    this.visitor.visitBlockEnd?.(block);
  }

  /**
   * Visits a statement and all its expressions.
   */
  public visitStatement(stmt: Stmt): void {
    this.visitor.visitStatement?.(stmt);

    for (const expr of stmt.getExpressions()) {
      this.visitExpression(expr);
    }
  }

  /**
   * Visits an expression and all its sub-expressions.
   */
  public visitExpression(expr: Expr): void {
    this.visitor.visitExpression?.(expr);

    // Visit sub-expressions based on expression type
    this.visitSubExpressions(expr);
  }

  private visitSubExpressions(expr: Expr): void {
    // Use duck typing to handle different expression types
    const anyExpr = expr as unknown as Record<string, unknown>;

    // Common expression patterns
    if ('left' in anyExpr && anyExpr.left instanceof Object) {
      this.visitExpression(anyExpr.left as Expr);
    }
    if ('right' in anyExpr && anyExpr.right instanceof Object && anyExpr.right !== null) {
      this.visitExpression(anyExpr.right as Expr);
    }
    if ('operand' in anyExpr && anyExpr.operand instanceof Object) {
      this.visitExpression(anyExpr.operand as Expr);
    }
    if ('receiver' in anyExpr && anyExpr.receiver instanceof Object) {
      this.visitExpression(anyExpr.receiver as Expr);
    }
    if ('instance' in anyExpr && anyExpr.instance instanceof Object && anyExpr.instance !== null) {
      this.visitExpression(anyExpr.instance as Expr);
    }
    if ('array' in anyExpr && anyExpr.array instanceof Object) {
      this.visitExpression(anyExpr.array as Expr);
    }
    if ('index' in anyExpr && anyExpr.index instanceof Object) {
      this.visitExpression(anyExpr.index as Expr);
    }
    if ('args' in anyExpr && Array.isArray(anyExpr.args)) {
      for (const arg of anyExpr.args) {
        if (arg instanceof Object) {
          this.visitExpression(arg as Expr);
        }
      }
    }
    if ('dimensions' in anyExpr && Array.isArray(anyExpr.dimensions)) {
      for (const dim of anyExpr.dimensions) {
        if (dim instanceof Object) {
          this.visitExpression(dim as Expr);
        }
      }
    }
  }
}
