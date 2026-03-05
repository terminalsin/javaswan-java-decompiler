import type { MethodIR } from '../ir/MethodIR';
import { Expr } from '../expr/Expr';

/**
 * Counts how many times each Expr instance is referenced within a method.
 *
 * The IR intentionally reuses Expr object instances to model JVM stack value reuse
 * (e.g., via DUP). Consumers like printers and bytecode compilers can use these
 * counts to decide when to introduce temporaries.
 */
export class IRExpressionReferenceCounter {
  public countInMethod(methodIR: MethodIR): Map<Expr, number> {
    const counts = new Map<Expr, number>();

    if (!methodIR.cfg) {
      return counts;
    }

    for (const block of methodIR.cfg) {
      for (const stmt of block.statements) {
        for (const expr of stmt.getExpressions()) {
          this.countExpr(expr, counts);
        }
      }
    }

    return counts;
  }

  private countExpr(expr: Expr, counts: Map<Expr, number>, path: Set<Expr> = new Set()): void {
    counts.set(expr, (counts.get(expr) ?? 0) + 1);

    // Defensive: avoid infinite recursion if a cycle ever appears.
    if (path.has(expr)) {
      return;
    }
    path.add(expr);

    for (const child of this.getSubExpressions(expr)) {
      this.countExpr(child, counts, path);
    }

    path.delete(expr);
  }

  private getSubExpressions(expr: Expr): readonly Expr[] {
    const anyExpr = expr as unknown as Record<string, unknown>;
    const children: Expr[] = [];

    const pushIfExpr = (value: unknown): void => {
      if (value instanceof Expr) {
        children.push(value);
      }
    };

    pushIfExpr(anyExpr.left);
    pushIfExpr(anyExpr.right);
    pushIfExpr(anyExpr.operand);
    pushIfExpr(anyExpr.receiver);
    pushIfExpr(anyExpr.instance);
    pushIfExpr(anyExpr.array);
    pushIfExpr(anyExpr.index);

    if (Array.isArray(anyExpr.args)) {
      for (const arg of anyExpr.args) {
        pushIfExpr(arg);
      }
    }

    if (Array.isArray(anyExpr.dimensions)) {
      for (const dim of anyExpr.dimensions) {
        pushIfExpr(dim);
      }
    }

    return children;
  }
}

