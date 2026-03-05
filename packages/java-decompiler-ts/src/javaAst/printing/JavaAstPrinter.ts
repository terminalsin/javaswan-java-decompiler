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
import { JavaArrayInitExpr } from '../expr/JavaArrayInitExpr';
import { JavaNewArrayExpr } from '../expr/JavaNewArrayExpr';
import { JavaNewClassExpr } from '../expr/JavaNewClassExpr';
import { JavaThisExpr } from '../expr/JavaThisExpr';
import { JavaTypeNameExpr } from '../expr/JavaTypeNameExpr';
import { JavaUnaryExpr } from '../expr/JavaUnaryExpr';
import { JavaUnsupportedExpr } from '../expr/JavaUnsupportedExpr';
import type { JavaStmt } from '../stmt/JavaStmt';
import { JavaAssignStmt } from '../stmt/JavaAssignStmt';
import { JavaBlockStmt } from '../stmt/JavaBlockStmt';
import { JavaBreakStmt } from '../stmt/JavaBreakStmt';
import { JavaCommentStmt } from '../stmt/JavaCommentStmt';
import { JavaContinueStmt } from '../stmt/JavaContinueStmt';
import { JavaConstructorCallStmt } from '../stmt/JavaConstructorCallStmt';
import { JavaDoWhileStmt } from '../stmt/JavaDoWhileStmt';
import { JavaExprStmt } from '../stmt/JavaExprStmt';
import { JavaForEachStmt } from '../stmt/JavaForEachStmt';
import { JavaIfStmt } from '../stmt/JavaIfStmt';
import { JavaReturnStmt } from '../stmt/JavaReturnStmt';
import { JavaSwitchStmt } from '../stmt/JavaSwitchStmt';
import type { JavaSwitchCaseLabel } from '../stmt/JavaSwitchCase';
import { JavaThrowStmt } from '../stmt/JavaThrowStmt';
import { JavaTryCatchStmt } from '../stmt/JavaTryCatchStmt';
import { JavaCatchClause } from '../stmt/JavaCatchClause';
import { JavaWhileStmt } from '../stmt/JavaWhileStmt';
import { JavaForStmt } from '../stmt/JavaForStmt';
import { JavaSynchronizedStmt } from '../stmt/JavaSynchronizedStmt';
import type { JavaSourceWriter } from '../../source/printing/JavaSourceWriter';

export class JavaAstPrinter {
    private readonly writer: JavaSourceWriter;

    constructor(writer: JavaSourceWriter) {
        this.writer = writer;
    }

    public printBlock(block: JavaBlockStmt): void {
        for (const stmt of block.statements) {
            this.printStatement(stmt);
        }
    }

    public printStatement(stmt: JavaStmt): void {
        if (stmt instanceof JavaBlockStmt) {
            this.printBlock(stmt);
            return;
        }

        if (stmt instanceof JavaCommentStmt) {
            const lines = stmt.text.split('\n');
            for (const line of lines) {
                this.writer.writeLine(`// ${line}`);
            }
            return;
        }

        if (stmt instanceof JavaExprStmt) {
            this.writer.writeLine(`${this.printExpression(stmt.expression)};`);
            return;
        }

        if (stmt instanceof JavaAssignStmt) {
            const prefix = stmt.typeName ? `${stmt.typeName} ` : '';
            const targetStr = this.printExpression(stmt.target);

            // Try to recover compound assignments: x = x + y → x += y, x = x + 1 → x++
            if (!stmt.typeName && stmt.value instanceof JavaBinaryExpr) {
                const bin = stmt.value;
                const leftStr = this.printExpression(bin.left);
                if (leftStr === targetStr) {
                    const rightStr = this.printExpression(bin.right);
                    // x = x + 1 → x++, x = x - 1 → x--
                    if (rightStr === '1') {
                        if (bin.operator === '+') {
                            this.writer.writeLine(`${targetStr}++;`);
                            return;
                        }
                        if (bin.operator === '-') {
                            this.writer.writeLine(`${targetStr}--;`);
                            return;
                        }
                    }
                    // x = x op y → x op= y
                    this.writer.writeLine(`${targetStr} ${bin.operator}= ${rightStr};`);
                    return;
                }
            }

            this.writer.writeLine(`${prefix}${targetStr} = ${this.printExpression(stmt.value)};`);
            return;
        }

        if (stmt instanceof JavaReturnStmt) {
            if (stmt.expression === null) {
                this.writer.writeLine('return;');
                return;
            }
            this.writer.writeLine(`return ${this.printExpression(stmt.expression)};`);
            return;
        }

        if (stmt instanceof JavaThrowStmt) {
            this.writer.writeLine(`throw ${this.printExpression(stmt.exception)};`);
            return;
        }

        if (stmt instanceof JavaConstructorCallStmt) {
            const args = stmt.args.map(a => this.printExpression(a)).join(', ');
            this.writer.writeLine(`${stmt.kind}(${args});`);
            return;
        }

        if (stmt instanceof JavaIfStmt) {
            this.writer.writeLine(`if (${this.printExpression(stmt.condition)}) {`);
            this.writer.indent();
            this.printBlock(stmt.thenBranch);
            this.writer.dedent();
            if (stmt.elseBranch) {
                this.writer.writeLine('} else {');
                this.writer.indent();
                this.printBlock(stmt.elseBranch);
                this.writer.dedent();
            }
            this.writer.writeLine('}');
            return;
        }

        if (stmt instanceof JavaWhileStmt) {
            this.writer.writeLine(`while (${this.printExpression(stmt.condition)}) {`);
            this.writer.indent();
            this.printBlock(stmt.body);
            this.writer.dedent();
            this.writer.writeLine('}');
            return;
        }

        if (stmt instanceof JavaForStmt) {
            this.writer.writeLine(`for (${stmt.init}; ${this.printExpression(stmt.condition)}; ${stmt.update}) {`);
            this.writer.indent();
            this.printBlock(stmt.body);
            this.writer.dedent();
            this.writer.writeLine('}');
            return;
        }

        if (stmt instanceof JavaForEachStmt) {
            this.writer.writeLine(`for (${stmt.varType} ${stmt.varName} : ${this.printExpression(stmt.iterable)}) {`);
            this.writer.indent();
            this.printBlock(stmt.body);
            this.writer.dedent();
            this.writer.writeLine('}');
            return;
        }

        if (stmt instanceof JavaDoWhileStmt) {
            this.writer.writeLine('do {');
            this.writer.indent();
            this.printBlock(stmt.body);
            this.writer.dedent();
            this.writer.writeLine(`} while (${this.printExpression(stmt.condition)});`);
            return;
        }

        if (stmt instanceof JavaBreakStmt) {
            if (stmt.label) {
                this.writer.writeLine(`break ${stmt.label};`);
            } else {
                this.writer.writeLine('break;');
            }
            return;
        }

        if (stmt instanceof JavaContinueStmt) {
            if (stmt.label) {
                this.writer.writeLine(`continue ${stmt.label};`);
            } else {
                this.writer.writeLine('continue;');
            }
            return;
        }

        if (stmt instanceof JavaSwitchStmt) {
            this.writer.writeLine(`switch (${this.printExpression(stmt.expression)}) {`);
            this.writer.indent();

            for (const c of stmt.cases) {
                for (const label of c.labels) {
                    this.writer.writeLine(this.formatSwitchLabel(label));
                }
                this.writer.indent();
                this.printBlock(c.body);
                this.writer.dedent();
            }

            this.writer.dedent();
            this.writer.writeLine('}');
            return;
        }

        if (stmt instanceof JavaTryCatchStmt) {
            this.writer.writeLine('try {');
            this.writer.indent();
            this.printBlock(stmt.tryBlock);
            this.writer.dedent();

            for (const c of stmt.catches) {
                this.printCatchClause(c);
            }

            if (stmt.finallyBlock) {
                this.writer.writeLine('} finally {');
                this.writer.indent();
                this.printBlock(stmt.finallyBlock);
                this.writer.dedent();
            }

            this.writer.writeLine('}');
            return;
        }

        if (stmt instanceof JavaSynchronizedStmt) {
            this.writer.writeLine(`synchronized (${this.printExpression(stmt.lockExpr)}) {`);
            this.writer.indent();
            this.printBlock(stmt.body);
            this.writer.dedent();
            this.writer.writeLine('}');
            return;
        }

        this.writer.writeLine(`/* unsupported stmt */`);
    }

    public printExpression(expr: JavaExpr, parentPrecedence: number = 0): string {
        if (expr instanceof JavaThisExpr) return 'this';
        if (expr instanceof JavaIdentifierExpr) return expr.name;
        if (expr instanceof JavaTypeNameExpr) return expr.typeName;
        if (expr instanceof JavaLiteralExpr) return expr.text;

        if (expr instanceof JavaBinaryExpr) {
            const prec = this.operatorPrecedence(expr.operator);
            const inner = `${this.printExpression(expr.left, prec)} ${expr.operator} ${this.printExpression(expr.right, prec + 1)}`;
            return prec < parentPrecedence ? `(${inner})` : inner;
        }

        if (expr instanceof JavaUnaryExpr) {
            return `${expr.operator}${this.printExpression(expr.operand, 14)}`;
        }

        if (expr instanceof JavaCastExpr) {
            return `(${expr.typeName}) ${this.printExpression(expr.expression, 13)}`;
        }

        if (expr instanceof JavaInstanceOfExpr) {
            const inner = `${this.printExpression(expr.expression, 9)} instanceof ${expr.typeName}`;
            return 9 < parentPrecedence ? `(${inner})` : inner;
        }

        if (expr instanceof JavaFieldAccessExpr) {
            return `${this.printExpression(expr.target)}.${expr.fieldName}`;
        }

        if (expr instanceof JavaMethodCallExpr) {
            const args = expr.args.map(a => this.printExpression(a)).join(', ');
            return `${this.printExpression(expr.target)}.${expr.methodName}(${args})`;
        }

        if (expr instanceof JavaNewClassExpr) {
            const args = expr.args.map(a => this.printExpression(a)).join(', ');
            return `new ${expr.typeName}(${args})`;
        }

        if (expr instanceof JavaArrayAccessExpr) {
            return `${this.printExpression(expr.array)}[${this.printExpression(expr.index)}]`;
        }

        if (expr instanceof JavaArrayLengthExpr) {
            return `${this.printExpression(expr.array)}.length`;
        }

        if (expr instanceof JavaNewArrayExpr) {
            const dims = expr.dimensions.map(d => `[${this.printExpression(d)}]`).join('');
            return `new ${expr.elementTypeName}${dims}`;
        }

        if (expr instanceof JavaArrayInitExpr) {
            const elems = expr.elements.map(e => this.printExpression(e)).join(', ');
            return `new ${expr.elementTypeName}[] {${elems}}`;
        }

        if (expr instanceof JavaUnsupportedExpr) {
            return `null /* ${expr.comment} */`;
        }

        return 'null /* unknown expr */';
    }

    private formatSwitchLabel(label: JavaSwitchCaseLabel): string {
        if (label === 'default') return 'default:';
        return `case ${label}:`;
    }

    private printCatchClause(c: JavaCatchClause): void {
        this.writer.writeLine(`} catch (${c.exceptionTypeName} ${c.exceptionVarName}) {`);
        this.writer.indent();
        this.printBlock(c.body);
        this.writer.dedent();
    }

    /**
     * Returns Java operator precedence (higher = tighter binding).
     * Based on https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html
     */
    private operatorPrecedence(op: string): number {
        switch (op) {
            case '||': return 3;
            case '&&': return 4;
            case '|': return 5;
            case '^': return 6;
            case '&': return 7;
            case '==': case '!=': return 8;
            case '<': case '>': case '<=': case '>=': return 9;
            case '<<': case '>>': case '>>>': return 10;
            case '+': case '-': return 11;
            case '*': case '/': case '%': return 12;
            default: return 1; // safe fallback
        }
    }
}

