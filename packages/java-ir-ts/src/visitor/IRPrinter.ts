import type { ClassIR } from '../ir/ClassIR';
import type { MethodIR } from '../ir/MethodIR';
import type { FieldIR } from '../ir/FieldIR';
import type { BasicBlock } from '../ir/BasicBlock';
import type { Stmt } from '../stmt/Stmt';
import type { IRVisitor } from './IRVisitor';
import { IRWalker } from './IRVisitor';
import { IRExpressionReferenceCounter } from '../analysis/IRExpressionReferenceCounter';
import { IRExpressionStringifier } from './printing/IRExpressionStringifier';
import { IRStatementStringifier } from './printing/IRStatementStringifier';
import { IRTemporaryExpressionBindings } from './printing/IRTemporaryExpressionBindings';

/**
 * A visitor that prints IR to a string.
 */
export class IRPrinter implements IRVisitor {
  private output: string[] = [];
  private indent: number = 0;
  private stmtStringifier: IRStatementStringifier | null = null;

  private write(text: string): void {
    const indentation = '  '.repeat(this.indent);
    this.output.push(indentation + text);
  }

  /**
   * Prints a class IR to a string.
   */
  public static print(classIR: ClassIR): string {
    const printer = new IRPrinter();
    const walker = new IRWalker(printer);
    walker.visitClass(classIR);
    return printer.getOutput();
  }

  /**
   * Prints a method IR to a string.
   */
  public static printMethod(methodIR: MethodIR): string {
    const printer = new IRPrinter();
    const walker = new IRWalker(printer);
    walker.visitMethod(methodIR);
    return printer.getOutput();
  }

  /**
   * Gets the accumulated output.
   */
  public getOutput(): string {
    return this.output.join('\n');
  }

  public visitClass(classIR: ClassIR): void {
    const modifiers = this.getAccessModifiers(classIR.access, true);
    const type = classIR.isInterface() ? 'interface' : 'class';
    const extendsClause = classIR.superName && classIR.superName !== 'java/lang/Object'
      ? ` extends ${classIR.superName.replace(/\//g, '.')}`
      : '';
    const implementsClause = classIR.interfaces && classIR.interfaces.length > 0
      ? ` implements ${classIR.interfaces.map(i => i.replace(/\//g, '.')).join(', ')}`
      : '';

    this.write(`// Source: ${classIR.sourceFile ?? 'unknown'}`);
    this.write(`// Version: ${classIR.getMajorVersion()}.${classIR.getMinorVersion()}`);
    this.write(`${modifiers}${type} ${classIR.getClassName()}${extendsClause}${implementsClause} {`);
    this.indent++;
  }

  public visitClassEnd(_classIR: ClassIR): void {
    this.indent--;
    this.write('}');
  }

  public visitField(fieldIR: FieldIR): void {
    const modifiers = this.getAccessModifiers(fieldIR.access, false);
    const value = fieldIR.initialValue !== undefined && fieldIR.initialValue !== null
      ? ` = ${JSON.stringify(fieldIR.initialValue)}`
      : '';
    this.write(`${modifiers}${fieldIR.type.getClassName()} ${fieldIR.name}${value};`);
  }

  public visitMethod(methodIR: MethodIR): void {
    this.write('');
    const modifiers = this.getAccessModifiers(methodIR.access, false);
    const params = methodIR.parameterTypes.map((t, i) => `${t.getClassName()} arg${i}`).join(', ');
    const throwsClause = methodIR.exceptions.length > 0
      ? ` throws ${methodIR.exceptions.map(e => e.replace(/\//g, '.')).join(', ')}`
      : '';
    
    this.write(`${modifiers}${methodIR.returnType.getClassName()} ${methodIR.name}(${params})${throwsClause} {`);
    this.indent++;

    if (!methodIR.hasCode()) {
      this.write('// abstract or native');
      this.stmtStringifier = null;
      return;
    }

    // Build a per-method stringifier that can introduce temps for shared Expr instances
    // (e.g., arrays initialized via DUP + *ASTORE).
    const counter = new IRExpressionReferenceCounter();
    const counts = counter.countInMethod(methodIR);
    const bindings = new IRTemporaryExpressionBindings(counts);
    const exprStringifier = new IRExpressionStringifier(bindings);
    this.stmtStringifier = new IRStatementStringifier(bindings, exprStringifier);
  }

  public visitMethodEnd(_methodIR: MethodIR): void {
    this.indent--;
    this.write('}');
    this.stmtStringifier = null;
  }

  public visitBlock(block: BasicBlock): void {
    const handlers = block.isExceptionHandler
      ? ` [handler: ${block.handledExceptionTypes.join(', ') || 'any'}]`
      : '';
    const preds = [...block.predecessors].join(', ');
    const succs = [...block.successors].join(', ');
    
    this.write(`block${block.index}:${handlers} // preds: [${preds}], succs: [${succs}]`);
    this.indent++;
  }

  public visitBlockEnd(_block: BasicBlock): void {
    this.indent--;
  }

  public visitStatement(stmt: Stmt): void {
    if (!this.stmtStringifier) {
    this.write(stmt.toString());
      return;
    }

    const lines = this.stmtStringifier.stringifyWithDeclarations(stmt);
    for (const line of lines) {
      this.write(line);
    }
  }

  private getAccessModifiers(access: number, isClass: boolean): string {
    const modifiers: string[] = [];

    if ((access & 0x0001) !== 0) modifiers.push('public');
    if ((access & 0x0002) !== 0) modifiers.push('private');
    if ((access & 0x0004) !== 0) modifiers.push('protected');
    if ((access & 0x0008) !== 0) modifiers.push('static');
    if ((access & 0x0010) !== 0) modifiers.push('final');
    if ((access & 0x0020) !== 0 && !isClass) modifiers.push('synchronized');
    if ((access & 0x0040) !== 0) modifiers.push('volatile');
    if ((access & 0x0080) !== 0) modifiers.push('transient');
    if ((access & 0x0100) !== 0) modifiers.push('native');
    if ((access & 0x0400) !== 0) modifiers.push('abstract');
    if ((access & 0x0800) !== 0) modifiers.push('strictfp');

    return modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
  }
}
