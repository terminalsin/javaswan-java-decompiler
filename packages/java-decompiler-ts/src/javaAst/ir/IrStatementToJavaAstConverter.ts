import {
  type Stmt,
  type Expr,
  VarStoreStmt,
  ArrayStoreStmt,
  FieldStoreStmt,
  ReturnStmt,
  ThrowStmt,
  PopStmt,
  MonitorStmt,
  MonitorKind,
  NopStmt,
  LineNumberStmt,
  FrameStmt,
  VirtualInvocationExpr,
  VirtualInvocationKind,
  VarExpr,
  ConstantExpr,
} from '@blkswn/java-ir';
import { Type, TypeSort } from '@blkswn/java-asm';
import type { JavaStmt } from '../stmt/JavaStmt';
import { JavaAssignStmt } from '../stmt/JavaAssignStmt';
import { JavaReturnStmt } from '../stmt/JavaReturnStmt';
import { JavaThrowStmt } from '../stmt/JavaThrowStmt';
import { JavaExprStmt } from '../stmt/JavaExprStmt';
import { JavaCommentStmt } from '../stmt/JavaCommentStmt';
import { JavaConstructorCallStmt } from '../stmt/JavaConstructorCallStmt';
import { JavaIdentifierExpr } from '../expr/JavaIdentifierExpr';
import { JavaArrayAccessExpr } from '../expr/JavaArrayAccessExpr';
import { JavaFieldAccessExpr } from '../expr/JavaFieldAccessExpr';
import { JavaTypeNameExpr } from '../expr/JavaTypeNameExpr';
import { JavaLiteralExpr } from '../expr/JavaLiteralExpr';
import { JavaUnsupportedExpr } from '../expr/JavaUnsupportedExpr';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from '../../source/formatting/JavaTypeNameFormatter';
import { JavaIdentifierSanitizer } from '../../source/naming/JavaIdentifierSanitizer';
import { IrExpressionToJavaAstConverter, type IrExpressionToJavaAstContext } from './IrExpressionToJavaAstConverter';

export interface IrStatementToJavaAstContext {
  readonly exprContext: IrExpressionToJavaAstContext;
  readonly includeDebugComments: boolean;
  /** Mutable set tracking which variable indices have been declared. */
  readonly declaredVariables?: Set<number>;
  /** Resolves a formatted Java type name for a local variable by index. */
  readonly resolveVariableTypeName?: (index: number) => string | null;
  /** The return type of the current method (for boolean literal coercion). */
  readonly methodReturnType?: Type;
}

export class IrStatementToJavaAstConverter {
  private readonly exprConverter = new IrExpressionToJavaAstConverter();
  private readonly sanitizer = new JavaIdentifierSanitizer();
  private readonly typeNameFormatter = new JavaTypeNameFormatter();

  public convert(stmt: Stmt, ctx: IrStatementToJavaAstContext): JavaStmt[] {
    if (stmt instanceof VarStoreStmt) {
      const raw = ctx.exprContext.resolveVariableName?.(stmt.index) ?? stmt.name ?? `var${stmt.index}`;
      const name = this.sanitizer.sanitize(raw);
      let value = this.exprConverter.convert(stmt.value, ctx.exprContext);

      // Emit type declaration on first assignment to a local variable
      let typeName: string | null = null;
      if (ctx.declaredVariables && !ctx.declaredVariables.has(stmt.index)) {
        ctx.declaredVariables.add(stmt.index);
        typeName = ctx.resolveVariableTypeName?.(stmt.index) ?? null;
        // Fallback: infer type from the RHS expression
        if (!typeName) {
          typeName = this.inferTypeFromExpr(stmt.value, ctx.exprContext.typeContext);
        }
      }

      // Coerce 0/1 to false/true for boolean variables
      if (typeName === 'boolean') {
        value = this.coerceBooleanLiteral(value);
      }

      return [new JavaAssignStmt(new JavaIdentifierExpr(name), value, typeName)];
    }

    if (stmt instanceof ArrayStoreStmt) {
      const array = this.exprConverter.convert(stmt.array, ctx.exprContext);
      const index = this.exprConverter.convert(stmt.index, ctx.exprContext);
      const value = this.exprConverter.convert(stmt.value, ctx.exprContext);
      return [new JavaAssignStmt(new JavaArrayAccessExpr(array, index), value)];
    }

    if (stmt instanceof FieldStoreStmt) {
      const field = this.sanitizer.sanitize(stmt.fieldName);
      let value = this.exprConverter.convert(stmt.value, ctx.exprContext);
      // Coerce 0/1 to false/true for boolean fields (descriptor "Z")
      if (stmt.fieldDescriptor === 'Z') {
        value = this.coerceBooleanLiteral(value);
      }
      if (stmt.isStatic || !stmt.instance) {
        // Omit class prefix for static fields on the current class
        if (stmt.owner === ctx.exprContext.currentClassInternalName) {
          const target = new JavaIdentifierExpr(field);
          return [new JavaAssignStmt(target, value)];
        }
        const owner = this.typeNameFormatter.formatInternalName(stmt.owner, ctx.exprContext.typeContext);
        const target = new JavaFieldAccessExpr(new JavaTypeNameExpr(owner), field);
        return [new JavaAssignStmt(target, value)];
      }
      const instance = this.exprConverter.convert(stmt.instance, ctx.exprContext);
      const target = new JavaFieldAccessExpr(instance, field);
      return [new JavaAssignStmt(target, value)];
    }

    if (stmt instanceof ReturnStmt) {
      if (!stmt.value) return [new JavaReturnStmt(null)];
      let value = this.exprConverter.convert(stmt.value, ctx.exprContext);
      // Coerce 0/1 to false/true for boolean return types
      if (ctx.methodReturnType && ctx.methodReturnType.getSort() === TypeSort.BOOLEAN) {
        value = this.coerceBooleanLiteral(value);
      }
      return [new JavaReturnStmt(value)];
    }

    if (stmt instanceof ThrowStmt) {
      return [new JavaThrowStmt(this.exprConverter.convert(stmt.exception, ctx.exprContext))];
    }

    if (stmt instanceof PopStmt) {
      // Special-case: constructor calls on `this` become `super(...)` / `this(...)` statements in constructors.
      const ctor = this.tryConvertConstructorCall(stmt, ctx);
      if (ctor) return [ctor];

      const expr = this.exprConverter.convert(stmt.value, ctx.exprContext);
      if (expr instanceof JavaUnsupportedExpr) {
        return ctx.includeDebugComments ? [new JavaCommentStmt(expr.comment)] : [];
      }
      return [new JavaExprStmt(expr)];
    }

    if (stmt instanceof MonitorStmt) {
      if (!ctx.includeDebugComments) return [];
      const kind = stmt.kind === MonitorKind.ENTER ? 'enter' : 'exit';
      return [new JavaCommentStmt(`monitor${kind} omitted`)];
    }

    if (stmt instanceof LineNumberStmt) {
      if (!ctx.includeDebugComments) return [];
      return [new JavaCommentStmt(`line ${stmt.line}`)];
    }

    if (stmt instanceof FrameStmt) {
      if (!ctx.includeDebugComments) return [];
      return [new JavaCommentStmt(`frame ${stmt.frameType}`)];
    }

    if (stmt instanceof NopStmt) {
      return [];
    }

    // Control-flow terminators are handled at the CFG-structuring layer.
    return ctx.includeDebugComments ? [new JavaCommentStmt(`unsupported stmt: ${stmt.toString()}`)] : [];
  }

  private coerceBooleanLiteral(expr: import('../expr/JavaExpr').JavaExpr): import('../expr/JavaExpr').JavaExpr {
    if (expr instanceof JavaLiteralExpr) {
      if (expr.text === '0') return new JavaLiteralExpr('false');
      if (expr.text === '1') return new JavaLiteralExpr('true');
    }
    return expr;
  }

  private inferTypeFromExpr(expr: Expr, typeContext: JavaTypeNameFormattingContext): string | null {
    try {
      const type = expr.type;
      const sort = type.getSort();
      // Skip void and unknown types
      if (sort === TypeSort.VOID) return null;
      return this.typeNameFormatter.formatType(type, typeContext);
    } catch {
      return null;
    }
  }

  private tryConvertConstructorCall(stmt: PopStmt, ctx: IrStatementToJavaAstContext): JavaConstructorCallStmt | null {
    const v = stmt.value;
    if (!(v instanceof VirtualInvocationExpr)) return null;
    if (v.kind !== VirtualInvocationKind.SPECIAL) return null;
    if (v.methodName !== '<init>') return null;
    if (!(v.receiver instanceof VarExpr)) return null;

    // receiver must be `this`
    if (ctx.exprContext.methodIsStatic) return null;
    if (v.receiver.index !== 0) return null;

    const args = v.args.map(a => this.exprConverter.convert(a, ctx.exprContext));

    if (ctx.exprContext.currentSuperInternalName && v.owner === ctx.exprContext.currentSuperInternalName) {
      return new JavaConstructorCallStmt('super', args);
    }

    if (v.owner === ctx.exprContext.currentClassInternalName) {
      return new JavaConstructorCallStmt('this', args);
    }

    return null;
  }
}

