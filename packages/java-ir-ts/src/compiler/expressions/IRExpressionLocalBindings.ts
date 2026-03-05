import { CaughtExceptionExpr } from '../../expr/CaughtExceptionExpr';
import { ConstantExpr } from '../../expr/ConstantExpr';
import { Expr } from '../../expr/Expr';
import { PhiExpr } from '../../expr/PhiExpr';
import { VarExpr } from '../../expr/VarExpr';
import { IRLocalAllocator } from '../locals/IRLocalAllocator';

/**
 * Assigns local variable slots to shared Expr instances, so they are evaluated once
 * and reused (mirrors JVM stack DUP semantics).
 */
export class IRExpressionLocalBindings {
  private readonly localIndexByExpr = new WeakMap<Expr, number>();
  private readonly materialized = new WeakSet<Expr>();

  constructor(
    private readonly referenceCounts: ReadonlyMap<Expr, number>,
    private readonly localAllocator: IRLocalAllocator
  ) {}

  public shouldBind(expr: Expr): boolean {
    const count = this.referenceCounts.get(expr) ?? 0;
    if (count <= 1) {
      return false;
    }

    // Don't bind trivial atoms or non-emittable placeholders.
    if (
      expr instanceof VarExpr ||
      expr instanceof ConstantExpr ||
      expr instanceof PhiExpr ||
      expr instanceof CaughtExceptionExpr
    ) {
      return false;
    }

    // Void expressions don't produce a value we can store.
    if (expr.type.getSize() === 0) {
      return false;
    }

    return true;
  }

  public getOrAllocateLocal(expr: Expr): number | null {
    if (!this.shouldBind(expr)) {
      return null;
    }

    const existing = this.localIndexByExpr.get(expr);
    if (existing !== undefined) {
      return existing;
    }

    const allocated = this.localAllocator.allocate(expr.type);
    this.localIndexByExpr.set(expr, allocated);
    return allocated;
  }

  public isMaterialized(expr: Expr): boolean {
    return this.materialized.has(expr);
  }

  public markMaterialized(expr: Expr): void {
    this.materialized.add(expr);
  }
}

