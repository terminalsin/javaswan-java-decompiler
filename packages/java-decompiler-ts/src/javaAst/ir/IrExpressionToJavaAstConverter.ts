import { Type, TypeSort } from '@blkswn/java-asm';
import {
  type Expr,
  ArithmeticExpr,
  NegationExpr,
  VarExpr,
  ConstantExpr,
  ComparisonExpr,
  CastExpr,
  InstanceOfExpr,
  NewExpr,
  NewArrayExpr,
  ArrayLoadExpr,
  ArrayLengthExpr,
  FieldLoadExpr,
  StaticInvocationExpr,
  VirtualInvocationExpr,
  VirtualInvocationKind,
  DynamicInvocationExpr,
  PhiExpr,
  CaughtExceptionExpr,
} from '@blkswn/java-ir';
import { JavaIdentifierSanitizer } from '../../source/naming/JavaIdentifierSanitizer';
import { JavaLiteralFormatter } from '../../source/formatting/JavaLiteralFormatter';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from '../../source/formatting/JavaTypeNameFormatter';
import type { JavaExpr } from '../expr/JavaExpr';
import { JavaArrayAccessExpr } from '../expr/JavaArrayAccessExpr';
import { JavaArrayLengthExpr } from '../expr/JavaArrayLengthExpr';
import { JavaBinaryExpr } from '../expr/JavaBinaryExpr';
import { JavaCastExpr } from '../expr/JavaCastExpr';
import { JavaFieldAccessExpr } from '../expr/JavaFieldAccessExpr';
import { JavaIdentifierExpr } from '../expr/JavaIdentifierExpr';
import { JavaInstanceOfExpr } from '../expr/JavaInstanceOfExpr';
import { JavaLiteralExpr } from '../expr/JavaLiteralExpr';
import { JavaMethodCallExpr } from '../expr/JavaMethodCallExpr';
import { JavaNewArrayExpr } from '../expr/JavaNewArrayExpr';
import { JavaNewClassExpr } from '../expr/JavaNewClassExpr';
import { JavaThisExpr } from '../expr/JavaThisExpr';
import { JavaTypeNameExpr } from '../expr/JavaTypeNameExpr';
import { JavaUnaryExpr } from '../expr/JavaUnaryExpr';
import { JavaUnsupportedExpr } from '../expr/JavaUnsupportedExpr';
import { InvokedynamicExpressionRenderer } from './invokedynamic/InvokedynamicExpressionRenderer';

export interface IrExpressionToJavaAstContext {
  readonly methodIsStatic: boolean;
  readonly currentClassInternalName: string;
  readonly currentSuperInternalName: string | null;
  readonly typeContext: JavaTypeNameFormattingContext;
  readonly resolveVariableName?: (index: number) => string | null;
  /** Maps hoisted NewArrayExpr instances to their assigned temp variable names. */
  readonly boundNewArrayNames?: ReadonlyMap<object, string>;
  /** Maps NewArrayExpr instances to their expanded varargs elements. */
  readonly varargsExpansions?: ReadonlyMap<object, readonly import('../expr/JavaExpr').JavaExpr[]>;
  /** The full ClassIR, needed for lambda body inlining. */
  readonly classIR?: import('@blkswn/java-ir').ClassIR;
  /** Callback to decompile a method body (avoids circular dependency). */
  readonly buildMethodBody?: (method: import('@blkswn/java-ir').MethodIR, classCtx: import('../../source/context/JavaClassDecompilationContext').JavaClassDecompilationContext) => import('../stmt/JavaBlockStmt').JavaBlockStmt;
}

export class IrExpressionToJavaAstConverter {
  private readonly sanitizer = new JavaIdentifierSanitizer();
  private readonly literalFormatter = new JavaLiteralFormatter();
  private readonly typeNameFormatter = new JavaTypeNameFormatter();
  private readonly invokedynamicRenderer = new InvokedynamicExpressionRenderer();

  public convert(expr: Expr, ctx: IrExpressionToJavaAstContext): JavaExpr {
    if (expr instanceof VarExpr) {
      if (!ctx.methodIsStatic && expr.index === 0) {
        return new JavaThisExpr();
      }
      const raw = ctx.resolveVariableName?.(expr.index) ?? expr.name ?? `var${expr.index}`;
      return new JavaIdentifierExpr(this.sanitizer.sanitize(raw));
    }

    if (expr instanceof ConstantExpr) {
      if (expr.value instanceof Type) {
        const typeName = this.typeNameFormatter.formatType(expr.value, ctx.typeContext);
        return new JavaLiteralExpr(`${typeName}.class`);
      }
      return new JavaLiteralExpr(this.literalFormatter.format(expr.value, expr.type));
    }

    if (expr instanceof ArithmeticExpr) {
      return new JavaBinaryExpr(
        this.convert(expr.left, ctx),
        expr.op,
        this.convert(expr.right, ctx)
      );
    }

    if (expr instanceof NegationExpr) {
      return new JavaUnaryExpr('-', this.convert(expr.operand, ctx));
    }

    if (expr instanceof ComparisonExpr) {
      const left = this.convert(expr.left, ctx);
      const right = this.convert(expr.right, ctx);
      switch (expr.op) {
        case 'lcmp':
          return new JavaMethodCallExpr(new JavaTypeNameExpr('Long'), 'compare', [left, right]);
        case 'fcmpl':
        case 'fcmpg':
          return new JavaMethodCallExpr(new JavaTypeNameExpr('Float'), 'compare', [left, right]);
        case 'dcmpl':
        case 'dcmpg':
          return new JavaMethodCallExpr(new JavaTypeNameExpr('Double'), 'compare', [left, right]);
        default:
          return new JavaUnsupportedExpr(`comparison ${expr.op}`);
      }
    }

    if (expr instanceof CastExpr) {
      // Suppress widening primitive casts on constants (e.g., (long) 5 → 5)
      if (expr.operand instanceof ConstantExpr && this.isWideningPrimitiveCast(expr.operand.type, expr.type)) {
        return this.convert(expr.operand, ctx);
      }
      const operand = this.convert(expr.operand, ctx);
      const typeName = this.typeNameFormatter.formatType(expr.type, ctx.typeContext);
      return new JavaCastExpr(typeName, operand);
    }

    if (expr instanceof InstanceOfExpr) {
      const operand = this.convert(expr.operand, ctx);
      const checkType = this.typeNameFormatter.formatType(expr.checkType, ctx.typeContext);
      return new JavaInstanceOfExpr(operand, checkType);
    }

    if (expr instanceof ArrayLoadExpr) {
      return new JavaArrayAccessExpr(this.convert(expr.array, ctx), this.convert(expr.index, ctx));
    }

    if (expr instanceof ArrayLengthExpr) {
      return new JavaArrayLengthExpr(this.convert(expr.array, ctx));
    }

    if (expr instanceof NewArrayExpr) {
      // If this array was hoisted to a temp variable, substitute the variable name
      const boundName = ctx.boundNewArrayNames?.get(expr);
      if (boundName) {
        return new JavaIdentifierExpr(boundName);
      }
      const elementType = this.typeNameFormatter.formatType(expr.elementType, ctx.typeContext);
      const dims = expr.dimensions.map(d => this.convert(d, ctx));
      return new JavaNewArrayExpr(elementType, dims);
    }

    if (expr instanceof NewExpr) {
      const typeName = this.typeNameFormatter.formatType(expr.type, ctx.typeContext);
      return new JavaNewClassExpr(typeName, []);
    }

    if (expr instanceof FieldLoadExpr) {
      const field = this.sanitizer.sanitize(expr.fieldName);
      if (expr.isStatic || !expr.instance) {
        // Omit class prefix for static fields on the current class
        if (expr.owner === ctx.currentClassInternalName) {
          return new JavaIdentifierExpr(field);
        }
        const owner = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
        return new JavaFieldAccessExpr(new JavaTypeNameExpr(owner), field);
      }
      return new JavaFieldAccessExpr(this.convert(expr.instance, ctx), field);
    }

    if (expr instanceof StaticInvocationExpr) {
      // Strip autoboxing wrappers: Integer.valueOf(x) → x
      if (expr.methodName === 'valueOf' && expr.args.length === 1 && this.isBoxingType(expr.owner)) {
        return this.convert(expr.args[0]!, ctx);
      }
      const owner = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
      const method = this.sanitizer.sanitize(expr.methodName);
      const args = this.convertArgsWithVarargs(expr.args, ctx);
      return new JavaMethodCallExpr(new JavaTypeNameExpr(owner), method, args);
    }

    if (expr instanceof VirtualInvocationExpr) {
      return this.convertVirtualInvocation(expr, ctx);
    }

    if (expr instanceof DynamicInvocationExpr) {
      return this.invokedynamicRenderer.render(expr, {
        convertArg: (a) => this.convert(a, ctx),
        formatLiteral: (value, typeHint) => this.literalFormatter.format(value, typeHint ?? undefined),
        formatTypeName: (internalName) => this.typeNameFormatter.formatInternalName(internalName, ctx.typeContext),
        classIR: ctx.classIR,
        typeContext: ctx.typeContext,
        buildMethodBody: ctx.buildMethodBody,
      });
    }

    if (expr instanceof PhiExpr) {
      return new JavaLiteralExpr(this.defaultValueForType(expr.type));
    }

    if (expr instanceof CaughtExceptionExpr) {
      // Exception handler entry points implicitly receive the caught exception on the stack.
      // When we render exception-handling CFGs (currently via a label dispatcher), we store the
      // thrown value into this synthetic variable in the catch clause.
      return new JavaIdentifierExpr('__caughtException');
    }

    return new JavaUnsupportedExpr('unsupported expr');
  }

  private convertVirtualInvocation(expr: VirtualInvocationExpr, ctx: IrExpressionToJavaAstContext): JavaExpr {
    // Detect StringBuilder.toString() pattern: new SB().append(x).append(y).toString() → "x" + y
    if (expr.methodName === 'toString' && expr.args.length === 0) {
      const concat = this.tryRecoverStringConcat(expr.receiver, ctx);
      if (concat) return concat;
    }

    const args = this.convertArgsWithVarargs(expr.args, ctx);

    // Constructor call on allocation: new T(args)
    if (expr.kind === VirtualInvocationKind.SPECIAL && expr.methodName === '<init>' && expr.receiver instanceof NewExpr) {
      const typeName = this.typeNameFormatter.formatInternalName(expr.owner, ctx.typeContext);
      return new JavaNewClassExpr(typeName, args);
    }

    // Non-constructor invokespecial (super/private)
    if (expr.kind === VirtualInvocationKind.SPECIAL && expr.methodName !== '<init>') {
      const receiver = this.convert(expr.receiver, ctx);
      if (receiver instanceof JavaThisExpr && ctx.currentSuperInternalName && expr.owner === ctx.currentSuperInternalName) {
        return new JavaMethodCallExpr(new JavaIdentifierExpr('super'), this.sanitizer.sanitize(expr.methodName), args);
      }
      return new JavaMethodCallExpr(receiver, this.sanitizer.sanitize(expr.methodName), args);
    }

    // Normal virtual/interface calls
    const receiver = this.convert(expr.receiver, ctx);
    const method = this.sanitizer.sanitize(expr.methodName);
    return new JavaMethodCallExpr(receiver, method, args);
  }

  /**
   * Converts method arguments, expanding varargs arrays inline when detected.
   * E.g., `printf("%s", new Object[]{a, b})` → `printf("%s", a, b)`
   */
  private convertArgsWithVarargs(args: readonly Expr[], ctx: IrExpressionToJavaAstContext): JavaExpr[] {
    const result: JavaExpr[] = [];
    for (const arg of args) {
      if (arg instanceof NewArrayExpr && ctx.varargsExpansions?.has(arg)) {
        result.push(...ctx.varargsExpansions.get(arg)!);
      } else {
        result.push(this.convert(arg, ctx));
      }
    }
    return result;
  }

  /**
   * Detects pre-Java 9 StringBuilder concat pattern and recovers string concatenation.
   * new StringBuilder().append(a).append(b).toString() → a + b
   */
  private tryRecoverStringConcat(receiver: Expr, ctx: IrExpressionToJavaAstContext): JavaExpr | null {
    const parts: Expr[] = [];
    let current: Expr = receiver;

    // Walk the chain of .append() calls backwards
    while (
      current instanceof VirtualInvocationExpr &&
      current.methodName === 'append' &&
      current.args.length === 1
    ) {
      parts.push(current.args[0]!);
      current = current.receiver;
    }

    // The chain should end at a StringBuilder construction:
    // VirtualInvocationExpr(SPECIAL, <init>, receiver=NewExpr(StringBuilder))
    if (
      current instanceof VirtualInvocationExpr &&
      current.kind === VirtualInvocationKind.SPECIAL &&
      current.methodName === '<init>' &&
      current.receiver instanceof NewExpr &&
      current.receiver.type.getInternalName() === 'java/lang/StringBuilder'
    ) {
      // new StringBuilder(initialArg) — initialArg is the first part
      if (current.args.length === 1) {
        parts.push(current.args[0]!);
      } else if (current.args.length !== 0) {
        return null;
      }
    } else if (
      current instanceof NewExpr &&
      current.type.getInternalName() === 'java/lang/StringBuilder'
    ) {
      // NewExpr without init merge — just the allocation
    } else {
      return null;
    }

    parts.reverse();
    if (parts.length < 2) return null;

    let result = this.convert(parts[0]!, ctx);
    for (let i = 1; i < parts.length; i++) {
      result = new JavaBinaryExpr(result, '+', this.convert(parts[i]!, ctx));
    }
    return result;
  }

  private static readonly BOXING_TYPES = new Set([
    'java/lang/Integer', 'java/lang/Long', 'java/lang/Float', 'java/lang/Double',
    'java/lang/Boolean', 'java/lang/Byte', 'java/lang/Short', 'java/lang/Character',
  ]);

  private isWideningPrimitiveCast(fromType: Type, toType: Type): boolean {
    const from = fromType.getSort();
    const to = toType.getSort();
    // int → long, int → float, int → double, long → float, long → double, float → double
    // byte → short/int/long/float/double, short → int/long/float/double, char → int/long/float/double
    const order = [TypeSort.BYTE, TypeSort.SHORT, TypeSort.CHAR, TypeSort.INT, TypeSort.LONG, TypeSort.FLOAT, TypeSort.DOUBLE];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    return fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx;
  }

  private isBoxingType(owner: string): boolean {
    return IrExpressionToJavaAstConverter.BOXING_TYPES.has(owner);
  }

  private defaultValueForType(type: Type): string {
    const sort = type.getSort();
    if (sort === TypeSort.VOID) return '/* void */';
    if (sort === TypeSort.BOOLEAN) return 'false';
    if (sort === TypeSort.CHAR) return "'\\0'";
    if (
      sort === TypeSort.BYTE ||
      sort === TypeSort.SHORT ||
      sort === TypeSort.INT ||
      sort === TypeSort.LONG
    ) {
      return '0';
    }
    if (sort === TypeSort.FLOAT) return '0.0f';
    if (sort === TypeSort.DOUBLE) return '0.0';
    return 'null';
  }
}

