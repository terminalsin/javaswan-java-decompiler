import type { ConditionalJumpStmt } from '@blkswn/java-ir';
import { TypeSort } from '@blkswn/java-asm';
import { JavaBinaryExpr } from '../../expr/JavaBinaryExpr';
import type { JavaExpr } from '../../expr/JavaExpr';
import { JavaLiteralExpr } from '../../expr/JavaLiteralExpr';
import { JavaUnaryExpr } from '../../expr/JavaUnaryExpr';
import { IrExpressionToJavaAstConverter, type IrExpressionToJavaAstContext } from '../IrExpressionToJavaAstConverter';

export class IrConditionalJumpConditionConverter {
  private readonly exprConverter = new IrExpressionToJavaAstConverter();

  public convert(stmt: ConditionalJumpStmt, ctx: IrExpressionToJavaAstContext): JavaExpr {
    const left = this.exprConverter.convert(stmt.left, ctx);

    if (stmt.right) {
      const right = this.exprConverter.convert(stmt.right, ctx);
      return new JavaBinaryExpr(left, stmt.op, right);
    }

    const sort = stmt.left.type.getSort();
    if (sort === TypeSort.BOOLEAN) {
      // Booleans are represented as ints in JVM; prefer source-like boolean conditions.
      // - `x != 0`  -> `x`
      // - `x == 0`  -> `!x`
      if (stmt.op === '!=') {
        return left;
      }
      if (stmt.op === '==') {
        return new JavaUnaryExpr('!', left);
      }
    }

    const rhs = (sort === TypeSort.OBJECT || sort === TypeSort.ARRAY) ? 'null' : '0';
    return new JavaBinaryExpr(left, stmt.op, new JavaLiteralExpr(rhs));
  }
}

