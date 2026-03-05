import type { JavaStmt } from '../stmt/JavaStmt';
import { JavaAssignStmt } from '../stmt/JavaAssignStmt';
import { JavaBlockStmt } from '../stmt/JavaBlockStmt';
import { JavaCommentStmt } from '../stmt/JavaCommentStmt';
import { JavaForStmt } from '../stmt/JavaForStmt';
import { JavaWhileStmt } from '../stmt/JavaWhileStmt';
import { JavaIdentifierExpr } from '../expr/JavaIdentifierExpr';
import { JavaBinaryExpr } from '../expr/JavaBinaryExpr';
import { JavaLiteralExpr } from '../expr/JavaLiteralExpr';
import { JavaAstPrinter } from '../printing/JavaAstPrinter';

/**
 * Recovers `for` loops from `while` loops that follow the pattern:
 *
 *     T var = init;              // init statement (preceding the while)
 *     while (condition) {
 *       ...body...
 *       var = var OP step;       // update statement (last non-comment in body)
 *     }
 *
 * Converts to:
 *
 *     for (T var = init; condition; var OP= step) { ...body... }
 */
export class ForLoopRecovery {
    private readonly printer = new JavaAstPrinter(new StringWriter());

    /**
     * Transforms a flat list of statements in-place, converting eligible
     * while-loops to for-loops.
     */
    public recover(body: JavaStmt[]): void {
        for (let i = 0; i < body.length; i++) {
            const stmt = body[i]!;

            // Recurse into nested structures
            if (stmt instanceof JavaBlockStmt) {
                this.recover(stmt.statements);
                continue;
            }
            if (stmt instanceof JavaForStmt) {
                this.recover(stmt.body.statements);
                continue;
            }
            if (stmt instanceof JavaWhileStmt) {
                this.recover(stmt.body.statements);
            }

            // Check: is this a while-loop preceded by an init assignment?
            if (!(stmt instanceof JavaWhileStmt)) continue;
            if (stmt.condition instanceof JavaLiteralExpr && stmt.condition.text === 'true') continue; // skip while(true)

            const whileStmt = stmt;
            const initStmt = this.findPrecedingInit(body, i);
            if (!initStmt) continue;

            const { stmt: init, index: initIndex, varName } = initStmt;
            const update = this.findLoopUpdate(whileStmt.body.statements, varName);
            if (!update) continue;

            // If the init has a type declaration but the variable is used after the
            // loop, we can't safely move the declaration into the for-loop's scope.
            // Skip this for-loop conversion to avoid scoping issues.
            if (init.typeName && this.isVarUsedAfter(body, i, varName)) {
                continue;
            }

            // Build the for-loop
            const initStr = this.formatInit(init);
            const updateStr = this.formatUpdate(update.stmt, varName);
            const newBody = [...whileStmt.body.statements];
            // Remove the update statement from the body
            newBody.splice(update.index, 1);
            // Also remove any trailing comment right before the update (often a line number)
            if (update.index > 0 && newBody[update.index - 1] instanceof JavaCommentStmt) {
                newBody.splice(update.index - 1, 1);
            }

            const forStmt = new JavaForStmt(initStr, whileStmt.condition, updateStr, new JavaBlockStmt(newBody));

            // Replace: remove init and while, insert for
            // If there's a comment between init and while (like a line number), remove it too
            const stmtsToRemove = [initIndex, i];
            // Check for comment between init and while
            for (let j = initIndex + 1; j < i; j++) {
                if (body[j] instanceof JavaCommentStmt) {
                    stmtsToRemove.push(j);
                }
            }
            stmtsToRemove.sort((a, b) => b - a); // remove from end to preserve indices
            for (const idx of stmtsToRemove) {
                body.splice(idx, 1);
            }
            // Insert for-loop at the position of the first removed element
            body.splice(initIndex, 0, forStmt);
            // Adjust loop counter since we may have removed elements
            i = initIndex;
        }
    }

    /**
     * Finds the assignment statement immediately preceding a while-loop (skipping comments).
     */
    private findPrecedingInit(
        body: JavaStmt[],
        whileIndex: number
    ): { stmt: JavaAssignStmt; index: number; varName: string } | null {
        for (let j = whileIndex - 1; j >= 0; j--) {
            const s = body[j]!;
            if (s instanceof JavaCommentStmt) continue;
            if (!(s instanceof JavaAssignStmt)) return null;
            if (!(s.target instanceof JavaIdentifierExpr)) return null;
            return { stmt: s, index: j, varName: s.target.name };
        }
        return null;
    }

    /**
     * Finds the update statement at the end of a while-loop body.
     * Must be an assignment to the same variable as the init.
     */
    private findLoopUpdate(
        body: JavaStmt[],
        varName: string
    ): { stmt: JavaAssignStmt; index: number } | null {
        // Walk backwards from end, skipping comments
        for (let j = body.length - 1; j >= 0; j--) {
            const s = body[j]!;
            if (s instanceof JavaCommentStmt) continue;
            if (!(s instanceof JavaAssignStmt)) return null;
            if (!(s.target instanceof JavaIdentifierExpr)) return null;
            if (s.target.name !== varName) return null;
            return { stmt: s, index: j };
        }
        return null;
    }

    /**
     * Checks if a variable name is referenced in any statement after a given index.
     */
    private isVarUsedAfter(body: JavaStmt[], afterIndex: number, varName: string): boolean {
        for (let j = afterIndex + 1; j < body.length; j++) {
            if (this.stmtReferencesVar(body[j]!, varName)) return true;
        }
        return false;
    }

    /**
     * Conservatively checks if a statement references a variable by name.
     * Prints the statement to text and checks for the identifier as a word.
     */
    private stmtReferencesVar(stmt: JavaStmt, varName: string): boolean {
        if (stmt instanceof JavaCommentStmt) return false;
        const lines: string[] = [];
        const collector = {
            writeLine: (line: string) => lines.push(line),
            indent: () => {},
            dedent: () => {},
        };
        const tempPrinter = new JavaAstPrinter(collector as any);
        tempPrinter.printStatement(stmt);
        const text = lines.join('\n');
        const regex = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        return regex.test(text);
    }

    /**
     * Formats the init part of the for-loop (e.g., `int i = 0`).
     */
    private formatInit(stmt: JavaAssignStmt): string {
        const target = this.exprToString(stmt.target);
        const value = this.exprToString(stmt.value);
        const prefix = stmt.typeName ? `${stmt.typeName} ` : '';
        return `${prefix}${target} = ${value}`;
    }

    /**
     * Formats the update part of the for-loop.
     * Tries to produce `i++` / `i--` for simple increments, otherwise `i = expr`.
     */
    private formatUpdate(stmt: JavaAssignStmt, varName: string): string {
        // Check for i = i + 1 → i++
        if (stmt.value instanceof JavaBinaryExpr) {
            const bin = stmt.value;
            if (bin.left instanceof JavaIdentifierExpr && bin.left.name === varName) {
                if (bin.right instanceof JavaLiteralExpr && bin.right.text === '1') {
                    if (bin.operator === '+') return `${varName}++`;
                    if (bin.operator === '-') return `${varName}--`;
                }
                // i = i + step → i += step
                return `${varName} ${bin.operator}= ${this.exprToString(bin.right)}`;
            }
        }
        // Fallback: i = expr
        return `${varName} = ${this.exprToString(stmt.value)}`;
    }

    private exprToString(expr: import('../expr/JavaExpr').JavaExpr): string {
        // Use a minimal printer to stringify expressions
        return this.printer.printExpression(expr);
    }
}

/**
 * Minimal writer that collects nothing - we only use printExpression() which returns a string.
 */
class StringWriter {
    writeLine(_line: string): void {}
    indent(): void {}
    dedent(): void {}
}
