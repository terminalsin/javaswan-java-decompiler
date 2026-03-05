import {
  type BasicBlock,
  type Stmt,
  type Expr,
  VirtualInvocationKind,
  PopStmt,
  VarStoreStmt,
  ArrayStoreStmt,
  FieldStoreStmt,
  ReturnStmt,
  ThrowStmt,
  ConditionalJumpStmt,
  SwitchStmt,
  MonitorStmt,
} from '@blkswn/java-ir';
import type { AnalysisMethod } from '../model/AnalysisMethod';
import { CallGraph, type CallSite } from './CallGraph';
import {
  ResolvedStaticInvocationExpr,
  ResolvedVirtualInvocationExpr,
  isResolvedStaticInvocation,
  isResolvedVirtualInvocation
} from '../ir/ResolvedInvocationExprs';

/**
 * Builds the call graph by walking resolved IR.
 */
export class CallGraphBuilder {
  private readonly callGraph: CallGraph;

  constructor() {
    this.callGraph = new CallGraph();
  }

  /**
   * Processes all methods and builds the call graph.
   */
  public build(methods: readonly AnalysisMethod[]): CallGraph {
    for (const method of methods) {
      this.processMethod(method);
    }
    return this.callGraph;
  }

  private processMethod(method: AnalysisMethod): void {
    const cfg = method.cfg;
    if (!cfg) {
      return; // Abstract/native method
    }

    for (const block of cfg.blocks) {
      this.processBlock(method, block);
    }
  }

  private processBlock(method: AnalysisMethod, block: BasicBlock): void {
    for (let stmtIndex = 0; stmtIndex < block.statements.length; stmtIndex++) {
      const stmt = block.statements[stmtIndex];
      if (stmt) {
        this.processStmt(method, block.index, stmtIndex, stmt);
      }
    }
  }

  private processStmt(
    method: AnalysisMethod,
    blockIndex: number,
    stmtIndex: number,
    stmt: Stmt
  ): void {
    // Check for invocations in expressions
    for (const expr of stmt.getExpressions()) {
      this.findAndRecordInvocations(method, blockIndex, stmtIndex, expr);
    }
  }

  private findAndRecordInvocations(
    method: AnalysisMethod,
    blockIndex: number,
    stmtIndex: number,
    expr: Expr
  ): void {
    // Check if this expression is an invocation
    if (isResolvedStaticInvocation(expr)) {
      this.recordStaticInvocation(method, blockIndex, stmtIndex, expr);
    } else if (isResolvedVirtualInvocation(expr)) {
      this.recordVirtualInvocation(method, blockIndex, stmtIndex, expr);
    }

    // Recursively check sub-expressions
    this.visitSubExpressions(expr, (subExpr) => {
      this.findAndRecordInvocations(method, blockIndex, stmtIndex, subExpr);
    });
  }

  private recordStaticInvocation(
    caller: AnalysisMethod,
    blockIndex: number,
    stmtIndex: number,
    expr: ResolvedStaticInvocationExpr
  ): void {
    const callSite: CallSite = {
      caller,
      blockIndex,
      stmtIndex,
      declaredCallee: expr.declaredMethod,
      possibleTargets: [expr.declaredMethod], // Static calls have exactly one target
      isStatic: true,
      isSpecial: false,
    };

    this.callGraph.addCallSite(callSite);
  }

  private recordVirtualInvocation(
    caller: AnalysisMethod,
    blockIndex: number,
    stmtIndex: number,
    expr: ResolvedVirtualInvocationExpr
  ): void {
    const isSpecial = expr.kind === VirtualInvocationKind.SPECIAL;

    const callSite: CallSite = {
      caller,
      blockIndex,
      stmtIndex,
      declaredCallee: expr.declaredMethod,
      possibleTargets: isSpecial ? [expr.declaredMethod] : expr.possibleTargets,
      isStatic: false,
      isSpecial,
    };

    this.callGraph.addCallSite(callSite);
  }

  private visitSubExpressions(expr: Expr, visitor: (expr: Expr) => void): void {
    // Use duck typing to handle different expression types
    const anyExpr = expr as unknown as Record<string, unknown>;

    if ('left' in anyExpr && this.isExpr(anyExpr.left)) {
      visitor(anyExpr.left as Expr);
    }
    if ('right' in anyExpr && this.isExpr(anyExpr.right)) {
      visitor(anyExpr.right as Expr);
    }
    if ('operand' in anyExpr && this.isExpr(anyExpr.operand)) {
      visitor(anyExpr.operand as Expr);
    }
    if ('receiver' in anyExpr && this.isExpr(anyExpr.receiver)) {
      visitor(anyExpr.receiver as Expr);
    }
    if ('instance' in anyExpr && this.isExpr(anyExpr.instance)) {
      visitor(anyExpr.instance as Expr);
    }
    if ('array' in anyExpr && this.isExpr(anyExpr.array)) {
      visitor(anyExpr.array as Expr);
    }
    if ('index' in anyExpr && this.isExpr(anyExpr.index)) {
      visitor(anyExpr.index as Expr);
    }
    if ('args' in anyExpr && Array.isArray(anyExpr.args)) {
      for (const arg of anyExpr.args) {
        if (this.isExpr(arg)) {
          visitor(arg as Expr);
        }
      }
    }
    if ('dimensions' in anyExpr && Array.isArray(anyExpr.dimensions)) {
      for (const dim of anyExpr.dimensions) {
        if (this.isExpr(dim)) {
          visitor(dim as Expr);
        }
      }
    }
  }

  private isExpr(value: unknown): boolean {
    return value !== null && typeof value === 'object' && 'type' in (value as object) && 'accept' in (value as object);
  }
}
