import { Expr } from '../../expr/Expr';
import { ArrayStoreStmt } from '../../stmt/ArrayStoreStmt';
import { ConditionalJumpStmt } from '../../stmt/ConditionalJumpStmt';
import { FieldStoreStmt } from '../../stmt/FieldStoreStmt';
import { FrameStmt } from '../../stmt/FrameStmt';
import { LineNumberStmt } from '../../stmt/LineNumberStmt';
import { MonitorStmt } from '../../stmt/MonitorStmt';
import { NopStmt } from '../../stmt/NopStmt';
import { PopStmt } from '../../stmt/PopStmt';
import { ReturnStmt } from '../../stmt/ReturnStmt';
import { Stmt } from '../../stmt/Stmt';
import { SwitchStmt } from '../../stmt/SwitchStmt';
import { ThrowStmt } from '../../stmt/ThrowStmt';
import { UnconditionalJumpStmt } from '../../stmt/UnconditionalJumpStmt';
import { VarStoreStmt } from '../../stmt/VarStoreStmt';
import { IRExpressionStringifier } from './IRExpressionStringifier';
import { IRTemporaryExpressionBindings } from './IRTemporaryExpressionBindings';

/**
 * Stringifies statements and emits temp declarations for shared expressions.
 */
export class IRStatementStringifier {
  constructor(
    private readonly bindings: IRTemporaryExpressionBindings,
    private readonly exprStringifier: IRExpressionStringifier
  ) {}

  /**
   * Returns the statement's printed lines, including any required temp declarations
   * that must appear immediately before the statement.
   */
  public stringifyWithDeclarations(stmt: Stmt): readonly string[] {
    const lines: string[] = [];

    const bindableExprs: Expr[] = [];
    const visited = new Set<Expr>();

    for (const root of stmt.getExpressions()) {
      this.collectBindableExprsPostOrder(root, bindableExprs, visited);
    }

    for (const expr of bindableExprs) {
      const name = this.bindings.getBoundName(expr);
      if (!name) {
        continue;
      }

      if (this.bindings.isDeclared(expr)) {
        continue;
      }

      const rhs = this.exprStringifier.stringify(expr, { unboundRoot: expr });
      lines.push(`${name} = ${rhs}`);
      this.bindings.markDeclared(expr);
    }

    lines.push(this.stringify(stmt));
    return lines;
  }

  public stringify(stmt: Stmt): string {
    if (stmt instanceof VarStoreStmt) {
      const varName = stmt.name ?? `var${stmt.index}`;
      return `${varName} = ${this.exprStringifier.stringify(stmt.value)}`;
    }

    if (stmt instanceof ArrayStoreStmt) {
      return `${this.exprStringifier.stringify(stmt.array)}[${this.exprStringifier.stringify(stmt.index)}] = ${this.exprStringifier.stringify(stmt.value)}`;
    }

    if (stmt instanceof FieldStoreStmt) {
      if (stmt.isStatic) {
        const className = stmt.owner.replace(/\//g, '.');
        return `${className}.${stmt.fieldName} = ${this.exprStringifier.stringify(stmt.value)}`;
      }
      return `${this.exprStringifier.stringify(stmt.instance!)}.${stmt.fieldName} = ${this.exprStringifier.stringify(stmt.value)}`;
    }

    if (stmt instanceof ConditionalJumpStmt) {
      if (stmt.right === null) {
        return `if (${this.exprStringifier.stringify(stmt.left)} ${stmt.op} 0) goto block${stmt.trueTarget} else block${stmt.falseTarget}`;
      }
      return `if (${this.exprStringifier.stringify(stmt.left)} ${stmt.op} ${this.exprStringifier.stringify(stmt.right)}) goto block${stmt.trueTarget} else block${stmt.falseTarget}`;
    }

    if (stmt instanceof UnconditionalJumpStmt) {
      return `goto block${stmt.target}`;
    }

    if (stmt instanceof SwitchStmt) {
      const caseStrs = stmt.cases.map(c => `${c.key}: block${c.target}`).join(', ');
      return `switch(${this.exprStringifier.stringify(stmt.key)}) { ${caseStrs}, default: block${stmt.defaultTarget} }`;
    }

    if (stmt instanceof ReturnStmt) {
      if (stmt.value === null) {
        return 'return';
      }
      return `return ${this.exprStringifier.stringify(stmt.value)}`;
    }

    if (stmt instanceof ThrowStmt) {
      return `throw ${this.exprStringifier.stringify(stmt.exception)}`;
    }

    if (stmt instanceof PopStmt) {
      return `pop ${this.exprStringifier.stringify(stmt.value)}`;
    }

    if (stmt instanceof MonitorStmt) {
      return `monitor${stmt.kind}(${this.exprStringifier.stringify(stmt.object)})`;
    }

    if (stmt instanceof NopStmt || stmt instanceof FrameStmt || stmt instanceof LineNumberStmt) {
      return stmt.toString();
    }

    // Fallback for any new statement types.
    return stmt.toString();
  }

  private collectBindableExprsPostOrder(expr: Expr, out: Expr[], visited: Set<Expr>): void {
    if (visited.has(expr)) {
      return;
    }
    visited.add(expr);

    for (const child of this.getSubExpressions(expr)) {
      this.collectBindableExprsPostOrder(child, out, visited);
    }

    if (this.bindings.shouldBind(expr)) {
      out.push(expr);
    }
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

