import { ArrayLengthExpr } from '../../expr/ArrayLengthExpr';
import { ArrayLoadExpr } from '../../expr/ArrayLoadExpr';
import { ArithmeticExpr } from '../../expr/ArithmeticExpr';
import { CastExpr } from '../../expr/CastExpr';
import { ComparisonExpr } from '../../expr/ComparisonExpr';
import { ConstantExpr } from '../../expr/ConstantExpr';
import { CaughtExceptionExpr } from '../../expr/CaughtExceptionExpr';
import { DynamicInvocationExpr } from '../../expr/DynamicInvocationExpr';
import { Expr } from '../../expr/Expr';
import { FieldLoadExpr } from '../../expr/FieldLoadExpr';
import { InstanceOfExpr } from '../../expr/InstanceOfExpr';
import { NegationExpr } from '../../expr/NegationExpr';
import { NewArrayExpr } from '../../expr/NewArrayExpr';
import { NewExpr } from '../../expr/NewExpr';
import { PhiExpr } from '../../expr/PhiExpr';
import { StaticInvocationExpr } from '../../expr/StaticInvocationExpr';
import { VarExpr } from '../../expr/VarExpr';
import { VirtualInvocationExpr, VirtualInvocationKind } from '../../expr/VirtualInvocationExpr';
import { IRTemporaryExpressionBindings } from './IRTemporaryExpressionBindings';

export interface IRExpressionStringifyOptions {
  /**
   * When set, this specific Expr will be rendered in-line even if it has a temp binding.
   * Useful for emitting `tmp0 = <expr>` declarations.
   */
  readonly unboundRoot?: Expr;
}

/**
 * Stringifies expressions while honoring temporary bindings.
 *
 * We can't use per-Expr `toString()` because it doesn't know about shared Expr
 * instances (from DUP) and will recursively call `toString()` on subexpressions,
 * bypassing any temp-name substitution.
 */
export class IRExpressionStringifier {
  constructor(private readonly bindings: IRTemporaryExpressionBindings) {}

  public stringify(expr: Expr, options: IRExpressionStringifyOptions = {}): string {
    if (options.unboundRoot !== expr) {
      const bound = this.bindings.getBoundName(expr);
      if (bound) {
        return bound;
      }
    }

    // Atomic expressions.
    if (expr instanceof VarExpr || expr instanceof ConstantExpr || expr instanceof PhiExpr || expr instanceof CaughtExceptionExpr) {
      return expr.toString();
    }

    if (expr instanceof ArithmeticExpr) {
      return `(${this.stringify(expr.left, options)} ${expr.op} ${this.stringify(expr.right, options)})`;
    }

    if (expr instanceof NegationExpr) {
      return `(-${this.stringify(expr.operand, options)})`;
    }

    if (expr instanceof ComparisonExpr) {
      return `${expr.op}(${this.stringify(expr.left, options)}, ${this.stringify(expr.right, options)})`;
    }

    if (expr instanceof StaticInvocationExpr) {
      const className = expr.owner.replace(/\//g, '.');
      const args = expr.args.map(a => this.stringify(a, options)).join(', ');
      return `${className}.${expr.methodName}(${args})`;
    }

    if (expr instanceof VirtualInvocationExpr) {
      const prefix = expr.kind === VirtualInvocationKind.SPECIAL ? 'super.' : '';
      const args = expr.args.map(a => this.stringify(a, options)).join(', ');
      return `${this.stringify(expr.receiver, options)}.${prefix}${expr.methodName}(${args})`;
    }

    if (expr instanceof DynamicInvocationExpr) {
      const args = expr.args.map(a => this.stringify(a, options)).join(', ');
      return `invokedynamic:${expr.methodName}(${args})`;
    }

    if (expr instanceof FieldLoadExpr) {
      if (expr.isStatic) {
        const className = expr.owner.replace(/\//g, '.');
        return `${className}.${expr.fieldName}`;
      }
      return `${this.stringify(expr.instance!, options)}.${expr.fieldName}`;
    }

    if (expr instanceof ArrayLoadExpr) {
      return `${this.stringify(expr.array, options)}[${this.stringify(expr.index, options)}]`;
    }

    if (expr instanceof ArrayLengthExpr) {
      return `${this.stringify(expr.array, options)}.length`;
    }

    if (expr instanceof NewArrayExpr) {
      const dims = expr.dimensions.map(d => `[${this.stringify(d, options)}]`).join('');
      return `new ${expr.elementType.getClassName()}${dims}`;
    }

    if (expr instanceof CastExpr) {
      return `(${expr.type.getClassName()}) ${this.stringify(expr.operand, options)}`;
    }

    if (expr instanceof InstanceOfExpr) {
      return `(${this.stringify(expr.operand, options)} instanceof ${expr.checkType.getClassName()})`;
    }

    if (expr instanceof NewExpr) {
      return `new ${expr.type.getClassName()}`;
    }

    // Fallback (should be rare as long as we keep this in sync with Expr types).
    return expr.toString();
  }
}

