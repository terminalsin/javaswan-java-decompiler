import type { MethodIR } from '@blkswn/java-ir';
import { TypeSort } from '@blkswn/java-asm';
import type { JavaSourceWriter } from './printing/JavaSourceWriter';
import type { JavaClassDecompilationContext } from './context/JavaClassDecompilationContext';
import { JavaAstPrinter } from '../javaAst/printing/JavaAstPrinter';
import { JavaMethodBodyAstBuilder } from '../javaAst/cfg/decompile/JavaMethodBodyAstBuilder';
import { TrailingVoidReturnRemover } from '../javaAst/optimizations/TrailingVoidReturnRemover';
import { ForLoopRecovery } from '../javaAst/optimizations/ForLoopRecovery';
import { JavaConstructorCallStmt } from '../javaAst/stmt/JavaConstructorCallStmt';
import { JavaCommentStmt } from '../javaAst/stmt/JavaCommentStmt';
import type { JavaStmt } from '../javaAst/stmt/JavaStmt';

export class JavaMethodBodySourceEmitter {
  private readonly astBuilder = new JavaMethodBodyAstBuilder();
  private readonly trailingReturnRemover = new TrailingVoidReturnRemover();
  private readonly forLoopRecovery = new ForLoopRecovery();

  public emit(method: MethodIR, writer: JavaSourceWriter, classCtx: JavaClassDecompilationContext, includeDebugComments: boolean): void {
    const body = this.astBuilder.build(method, classCtx, includeDebugComments);

    // Inline optimizations
    const isVoid = method.returnType.getSort() === TypeSort.VOID;
    if (isVoid) {
      this.trailingReturnRemover.removeFromMethodBody(body);
    }

    // For enum constructors, strip the implicit super(name, ordinal) call
    if (classCtx.isEnum && method.isConstructor()) {
      this.stripEnumSuperCall(body.statements);
    }

    // For non-enum constructors, strip bare super() calls (implicit in Java source)
    if (!classCtx.isEnum && method.isConstructor()) {
      this.stripBareSuperCall(body.statements);
    }

    // Recover for-loops from while-loop + init + update patterns
    this.forLoopRecovery.recover(body.statements);

    const printer = new JavaAstPrinter(writer);
    printer.printBlock(body);
  }

  /**
   * Remove the `super(name, ordinal)` call from enum constructors.
   * The first 2 args (String name, int ordinal) are synthetic.
   */
  private stripEnumSuperCall(body: JavaStmt[]): void {
    for (let i = 0; i < body.length; i++) {
      const stmt = body[i]!;
      if (stmt instanceof JavaConstructorCallStmt && stmt.kind === 'super') {
        // Remove the statement entirely — the call is implicit
        body.splice(i, 1);
        return;
      }
      // Skip debug comments (line numbers)
      if (stmt instanceof JavaCommentStmt) continue;
      // Only check the first non-comment statement
      break;
    }
  }

  /**
   * Remove bare `super()` calls (no-arg) from regular constructors — they're implicit.
   */
  private stripBareSuperCall(body: JavaStmt[]): void {
    for (let i = 0; i < body.length; i++) {
      const stmt = body[i]!;
      if (stmt instanceof JavaConstructorCallStmt && stmt.kind === 'super' && stmt.args.length === 0) {
        body.splice(i, 1);
        return;
      }
      if (stmt instanceof JavaCommentStmt) continue;
      break;
    }
  }
}

