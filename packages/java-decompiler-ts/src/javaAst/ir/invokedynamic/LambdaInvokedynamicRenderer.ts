import { Type, Handle } from '@blkswn/java-asm';
import type { DynamicInvocationExpr } from '@blkswn/java-ir';
import type { JavaExpr } from '../../expr/JavaExpr';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';
import { JavaIdentifierExpr } from '../../expr/JavaIdentifierExpr';
import { JavaTypeNameExpr } from '../../expr/JavaTypeNameExpr';
import { JavaThisExpr } from '../../expr/JavaThisExpr';
import { JavaReturnStmt } from '../../stmt/JavaReturnStmt';
import { JavaExprStmt } from '../../stmt/JavaExprStmt';
import { JavaCommentStmt } from '../../stmt/JavaCommentStmt';
import { JavaAstPrinter } from '../../printing/JavaAstPrinter';
import { JavaSourceWriter } from '../../../source/printing/JavaSourceWriter';
import type { InvokedynamicRenderDeps } from './InvokedynamicExpressionRenderer';

// Handle tag constants
const H_INVOKEVIRTUAL = 5;
const H_INVOKESTATIC = 6;
const H_INVOKESPECIAL = 7;
const H_NEWINVOKESPECIAL = 8;
const H_INVOKEINTERFACE = 9;

/**
 * Renders LambdaMetafactory invokedynamic calls as lambda expressions or method references.
 *
 * The bootstrap method `java/lang/invoke/LambdaMetafactory.metafactory` takes:
 * - bsmArg[0]: MethodType (SAM method type - erased)
 * - bsmArg[1]: Handle (implementation method handle)
 * - bsmArg[2]: MethodType (instantiated method type)
 *
 * The invokedynamic arguments are the captured variables.
 */
export class LambdaInvokedynamicRenderer {
    public tryRender(
        expr: DynamicInvocationExpr,
        deps: InvokedynamicRenderDeps
    ): JavaExpr | null {
        const bsm = expr.bootstrapMethod;
        if (bsm.getOwner() !== 'java/lang/invoke/LambdaMetafactory') {
            return null;
        }

        if (bsm.getName() !== 'metafactory' && bsm.getName() !== 'altMetafactory') {
            return null;
        }

        if (expr.bootstrapArgs.length < 3) {
            return null;
        }

        const implHandle = expr.bootstrapArgs[1];
        if (!(implHandle instanceof Handle)) {
            return null;
        }

        const capturedArgs = expr.args.map(a => deps.convertArg(a));

        // Try to render as a method reference first
        const methodRef = this.tryRenderAsMethodReference(expr, implHandle, capturedArgs, deps);
        if (methodRef) {
            return methodRef;
        }

        // Try to inline the lambda body
        const inlined = this.tryInlineLambdaBody(expr, implHandle, capturedArgs, deps);
        if (inlined) {
            return inlined;
        }

        // Fall back to lambda expression with call to synthetic method
        return this.renderAsLambda(expr, implHandle, capturedArgs, deps);
    }

    /**
     * Attempts to inline a synthetic lambda method's body into the lambda expression.
     *
     * For `() -> ClassName.lambda$run$0()`, this decompiles `lambda$run$0` and
     * produces `() -> actualBody` instead.
     */
    private tryInlineLambdaBody(
        expr: DynamicInvocationExpr,
        implHandle: Handle,
        capturedArgs: JavaExpr[],
        deps: InvokedynamicRenderDeps
    ): JavaExpr | null {
        if (!deps.classIR || !deps.typeContext || !deps.buildMethodBody) { return null; }

        const implName = implHandle.getName();
        const implOwner = implHandle.getOwner();

        // Only inline lambda$ methods on the current class
        if (!this.isLambdaSyntheticMethod(implName)) { return null; }
        if (implOwner !== deps.classIR.name) { return null; }

        // Look up the method IR
        const methodIR = deps.classIR.getMethod(implName, implHandle.getDesc());
        if (!methodIR) { return null; }
        if (!methodIR.cfg) { return null; }

        // Parse SAM parameter info
        const instantiatedMethodType = expr.bootstrapArgs[2];
        let samParamCount = 0;
        let samParamTypes: Type[] = [];
        if (this.isAsmType(instantiatedMethodType)) {
            samParamTypes = Type.getArgumentTypes(instantiatedMethodType.getDescriptor());
            samParamCount = samParamTypes.length;
        }

        // Generate lambda parameter names
        const paramNames: string[] = [];
        for (let i = 0; i < samParamCount; i++) {
            paramNames.push(this.generateLambdaParamName(i, samParamCount));
        }

        // Build variable name mapping:
        // For the lambda method's local variables, captured variables map to captured arg text,
        // and SAM params map to our generated param names.
        const slotNames = new Map<number, string>();
        const isStatic = methodIR.isStatic();
        let slot = isStatic ? 0 : 1;

        if (!isStatic) {
            // Instance lambda: slot 0 = this (captured receiver)
            slotNames.set(0, 'this');
        }

        // Map captured variable slots
        const capturedCount = isStatic ? capturedArgs.length : Math.max(0, capturedArgs.length - 1);
        const capturedOffset = isStatic ? 0 : 1;
        for (let i = 0; i < capturedCount; i++) {
            const argExpr = capturedArgs[i + capturedOffset];
            if (argExpr) {
                slotNames.set(slot, this.exprToString(argExpr));
            }
            // Assume single-width slots (safe for most cases)
            slot++;
        }

        // Map SAM parameter slots
        for (let i = 0; i < samParamCount; i++) {
            slotNames.set(slot, paramNames[i]!);
            // Check for wide types (long/double take 2 slots)
            if (samParamTypes[i]) {
                const sort = samParamTypes[i]!.getSort();
                slot += (sort === Type.LONG || sort === Type.DOUBLE) ? 2 : 1;
            } else {
                slot++;
            }
        }

        // Build the lambda body AST with custom variable resolution
        try {
            const classCtx = {
                currentClassInternalName: deps.classIR.name,
                currentSuperInternalName: deps.classIR.superName,
                currentPackageName: null as string | null,
                classIR: deps.classIR,
            };

            // Override the method's variable name resolution
            const originalGetVariableName = methodIR.getVariableName.bind(methodIR);
            const patchedMethod = Object.create(methodIR);
            patchedMethod.getVariableName = (index: number, _pc: number): string | null => {
                return slotNames.get(index) ?? originalGetVariableName(index, 0);
            };

            const bodyBlock = deps.buildMethodBody(patchedMethod, classCtx);

            // Filter out comment-only statements
            const meaningfulStmts = bodyBlock.statements.filter(s => !(s instanceof JavaCommentStmt));

            if (meaningfulStmts.length === 0) return null;

            const printer = new JavaAstPrinter(new JavaSourceWriter());

            // Single return statement → expression lambda
            if (meaningfulStmts.length === 1) {
                const single = meaningfulStmts[0]!;
                if (single instanceof JavaReturnStmt && single.expression) {
                    const bodyStr = printer.printExpression(single.expression);
                    return new JavaLiteralExpr(`${this.formatParams(paramNames, samParamCount)} -> ${bodyStr}`);
                }
                if (single instanceof JavaExprStmt) {
                    const bodyStr = printer.printExpression(single.expression);
                    return new JavaLiteralExpr(`${this.formatParams(paramNames, samParamCount)} -> ${bodyStr}`);
                }
            }

            // Strip trailing void return (implicit in void lambdas)
            const lastStmt = meaningfulStmts[meaningfulStmts.length - 1];
            if (lastStmt instanceof JavaReturnStmt && !lastStmt.expression) {
                meaningfulStmts.pop();
            }

            // After stripping, check if we now have a single expression
            if (meaningfulStmts.length === 1) {
                const single = meaningfulStmts[0]!;
                if (single instanceof JavaExprStmt) {
                    const bodyStr = printer.printExpression(single.expression);
                    return new JavaLiteralExpr(`${this.formatParams(paramNames, samParamCount)} -> ${bodyStr}`);
                }
            }

            if (meaningfulStmts.length === 0) return null;

            // Multi-statement: render as block lambda with proper indentation
            const writer = new JavaSourceWriter();
            const blockPrinter = new JavaAstPrinter(writer);
            for (const stmt of meaningfulStmts) {
                blockPrinter.printStatement(stmt);
            }
            const rawBody = writer.toString().trimEnd();
            if (rawBody) {
                // Indent each line of the body by 4 spaces
                const indentedBody = rawBody.split('\n').map(line => line ? `    ${line}` : line).join('\n');
                return new JavaLiteralExpr(`${this.formatParams(paramNames, samParamCount)} -> {\n${indentedBody}\n}`);
            }

            return null;
        } catch {
            // If decompilation fails, fall back to call-through
            return null;
        }
    }

    private tryRenderAsMethodReference(
        expr: DynamicInvocationExpr,
        implHandle: Handle,
        capturedArgs: JavaExpr[],
        deps: {
            readonly formatTypeName: (internalName: string) => string;
        }
    ): JavaExpr | null {
        const tag = implHandle.getTag();
        const implName = implHandle.getName();
        const implOwner = implHandle.getOwner();

        // Constructor reference: ClassName::new
        if (tag === H_NEWINVOKESPECIAL) {
            const typeName = deps.formatTypeName(implOwner);
            return new JavaLiteralExpr(`${typeName}::new`);
        }

        // Don't render synthetic lambda bridges as method refs
        if (this.isLambdaSyntheticMethod(implName)) {
            return null;
        }

        // Static method reference: ClassName::methodName
        if (tag === H_INVOKESTATIC && capturedArgs.length === 0) {
            const typeName = deps.formatTypeName(implOwner);
            return new JavaLiteralExpr(`${typeName}::${implName}`);
        }

        // Instance method reference on a captured receiver: obj::methodName
        if ((tag === H_INVOKEVIRTUAL || tag === H_INVOKEINTERFACE || tag === H_INVOKESPECIAL) &&
            capturedArgs.length === 1) {
            const receiver = this.exprToString(capturedArgs[0]!);
            return new JavaLiteralExpr(`${receiver}::${implName}`);
        }

        // Unbound instance method reference: ClassName::methodName
        if ((tag === H_INVOKEVIRTUAL || tag === H_INVOKEINTERFACE) &&
            capturedArgs.length === 0) {
            const typeName = deps.formatTypeName(implOwner);
            return new JavaLiteralExpr(`${typeName}::${implName}`);
        }

        return null;
    }

    private renderAsLambda(
        expr: DynamicInvocationExpr,
        implHandle: Handle,
        capturedArgs: JavaExpr[],
        deps: {
            readonly formatTypeName: (internalName: string) => string;
        }
    ): JavaExpr {
        // Parse the instantiated method type to get SAM parameter count
        const instantiatedMethodType = expr.bootstrapArgs[2];
        let samParamCount = 0;

        if (this.isAsmType(instantiatedMethodType)) {
            const argTypes = Type.getArgumentTypes(instantiatedMethodType.getDescriptor());
            samParamCount = argTypes.length;
        }

        // Generate lambda parameter names
        const paramNames: string[] = [];
        for (let i = 0; i < samParamCount; i++) {
            paramNames.push(this.generateLambdaParamName(i, samParamCount));
        }

        const tag = implHandle.getTag();
        const implName = implHandle.getName();
        const implOwner = implHandle.getOwner();

        // Build lambda body based on the implementation method
        let body: string;

        if (tag === H_INVOKESTATIC) {
            const typeName = deps.formatTypeName(implOwner);
            const argList = [...capturedArgs.map(a => this.exprToString(a)), ...paramNames];
            body = `${typeName}.${implName}(${argList.join(', ')})`;
        } else if (tag === H_INVOKEVIRTUAL || tag === H_INVOKEINTERFACE || tag === H_INVOKESPECIAL) {
            if (capturedArgs.length > 0) {
                const receiver = this.exprToString(capturedArgs[0]!);
                const remainingCaptured = capturedArgs.slice(1).map(a => this.exprToString(a));
                const argList = [...remainingCaptured, ...paramNames];
                body = `${receiver}.${implName}(${argList.join(', ')})`;
            } else if (paramNames.length > 0) {
                const receiver = paramNames[0]!;
                const restParams = paramNames.slice(1);
                body = `${receiver}.${implName}(${restParams.join(', ')})`;
            } else {
                body = `/* lambda body */`;
            }
        } else if (tag === H_NEWINVOKESPECIAL) {
            const typeName = deps.formatTypeName(implOwner);
            const argList = [...capturedArgs.map(a => this.exprToString(a)), ...paramNames];
            body = `new ${typeName}(${argList.join(', ')})`;
        } else {
            body = `/* lambda body */`;
        }

        return new JavaLiteralExpr(`${this.formatParams(paramNames, samParamCount)} -> ${body}`);
    }

    private formatParams(paramNames: string[], count: number): string {
        if (count === 0) return '()';
        if (count === 1) return paramNames[0]!;
        return `(${paramNames.join(', ')})`;
    }

    private isLambdaSyntheticMethod(name: string): boolean {
        return name.startsWith('lambda$');
    }

    private generateLambdaParamName(index: number, total: number): string {
        if (total === 1) return 'arg';
        return `arg${index}`;
    }

    private exprToString(expr: JavaExpr): string {
        if (expr instanceof JavaLiteralExpr) return expr.text;
        if (expr instanceof JavaIdentifierExpr) return expr.name;
        if (expr instanceof JavaTypeNameExpr) return expr.typeName;
        if (expr instanceof JavaThisExpr) return 'this';
        return String(expr);
    }

    private isAsmType(value: unknown): value is Type {
        return (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as { getDescriptor?: unknown }).getDescriptor === 'function'
        );
    }
}
