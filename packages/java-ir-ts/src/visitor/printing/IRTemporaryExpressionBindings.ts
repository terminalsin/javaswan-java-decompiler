import { CaughtExceptionExpr } from '../../expr/CaughtExceptionExpr';
import { ConstantExpr } from '../../expr/ConstantExpr';
import { Expr } from '../../expr/Expr';
import { PhiExpr } from '../../expr/PhiExpr';
import { VarExpr } from '../../expr/VarExpr';

/**
 * Assigns stable temporary names to shared Expr instances for printing.
 *
 * The IR intentionally reuses Expr object instances to model JVM stack reuse
 * (for example via DUP). Without a binding layer, `toString()` output can look
 * like the same side-effecting expression (like `new int[18]`) is executed
 * multiple times.
 */
export class IRTemporaryExpressionBindings {
  private readonly tempNameByExpr = new WeakMap<Expr, string>();
  private readonly declaredExprs = new WeakSet<Expr>();
  private nextTempIndex: number = 0;

  constructor(private readonly referenceCounts: ReadonlyMap<Expr, number>) {}

  /**
   * Returns true if this Expr should be printed via a temp binding.
   */
  public shouldBind(expr: Expr): boolean {
    const count = this.referenceCounts.get(expr) ?? 0;
    if (count <= 1) {
      return false;
    }

    // Don't bind trivially-readable atoms.
    if (
      expr instanceof VarExpr ||
      expr instanceof ConstantExpr ||
      expr instanceof PhiExpr ||
      expr instanceof CaughtExceptionExpr
    ) {
      return false;
    }

    return true;
  }

  /**
   * Gets (or creates) a stable temp name for a bind-worthy Expr.
   */
  public getBoundName(expr: Expr): string | null {
    if (!this.shouldBind(expr)) {
      return null;
    }

    const existing = this.tempNameByExpr.get(expr);
    if (existing) {
      return existing;
    }

    const created = `tmp${this.nextTempIndex++}`;
    this.tempNameByExpr.set(expr, created);
    return created;
  }

  public isDeclared(expr: Expr): boolean {
    return this.declaredExprs.has(expr);
  }

  public markDeclared(expr: Expr): void {
    this.declaredExprs.add(expr);
  }
}

