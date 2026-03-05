import type { DynamicInvocationExpr, Expr, ClassIR, MethodIR } from '@blkswn/java-ir';
import type { Type } from '@blkswn/java-asm';
import type { JavaExpr } from '../../expr/JavaExpr';
import type { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import type { JavaTypeNameFormattingContext } from '../../../source/formatting/JavaTypeNameFormatter';
import type { JavaClassDecompilationContext } from '../../../source/context/JavaClassDecompilationContext';
import { JavaUnsupportedExpr } from '../../expr/JavaUnsupportedExpr';
import { StringConcatInvokedynamicRenderer } from './StringConcatInvokedynamicRenderer';
import { LambdaInvokedynamicRenderer } from './LambdaInvokedynamicRenderer';

export interface InvokedynamicRenderDeps {
  readonly convertArg: (arg: Expr) => JavaExpr;
  readonly formatLiteral: (value: unknown, typeHint: Type | null) => string;
  readonly formatTypeName: (internalName: string) => string;
  readonly classIR?: ClassIR;
  readonly typeContext?: JavaTypeNameFormattingContext;
  /** Callback to decompile a method body (avoids circular dependency on JavaMethodBodyAstBuilder). */
  readonly buildMethodBody?: (method: MethodIR, classCtx: JavaClassDecompilationContext) => JavaBlockStmt;
}

export class InvokedynamicExpressionRenderer {
  private readonly stringConcat = new StringConcatInvokedynamicRenderer();
  private readonly lambda = new LambdaInvokedynamicRenderer();

  public render(
    expr: DynamicInvocationExpr,
    deps: InvokedynamicRenderDeps
  ): JavaExpr {
    const concat = this.stringConcat.tryRender(expr, deps);
    if (concat) {
      return concat;
    }

    const lambda = this.lambda.tryRender(expr, deps);
    if (lambda) {
      return lambda;
    }

    const bsm = expr.bootstrapMethod.toString();
    const bsmArgs = expr.bootstrapArgs.length;
    const argCount = expr.args.length;
    return new JavaUnsupportedExpr(`invokedynamic ${expr.methodName}${expr.methodDescriptor} bsm=${bsm} bsmArgs=${bsmArgs} args=${argCount}`);
  }
}
