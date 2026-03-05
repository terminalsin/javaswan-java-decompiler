import { JavaReturnStmt } from '../stmt/JavaReturnStmt';
import type { JavaStmt } from '../stmt/JavaStmt';
import { JavaBlockStmt } from '../stmt/JavaBlockStmt';

/**
 * Removes a redundant `return;` when it is the last statement in a void method body.
 *
 * Important: this optimizer intentionally does NOT recurse into nested blocks, since
 * `return;` is not redundant in branches/loops.
 */
export class TrailingVoidReturnRemover {
    public removeFromMethodBody(body: JavaBlockStmt): boolean {
        const last = body.statements[body.statements.length - 1];
        if (!(last instanceof JavaReturnStmt)) {
            return false;
        }

        if (last.expression !== null) {
            return false;
        }

        body.statements.pop();
        return true;
    }

    public static isVoidReturn(stmt: JavaStmt | undefined): boolean {
        return stmt instanceof JavaReturnStmt && stmt.expression === null;
    }
}

