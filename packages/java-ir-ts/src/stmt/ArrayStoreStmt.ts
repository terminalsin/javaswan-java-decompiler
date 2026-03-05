import type { Type } from '@blkswn/java-asm';
import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Represents an array element store statement.
 * Corresponds to: IASTORE, LASTORE, FASTORE, DASTORE, AASTORE, BASTORE, CASTORE, SASTORE
 */
export class ArrayStoreStmt extends Stmt {
  /**
   * The array expression.
   */
  public readonly array: Expr;

  /**
   * The index expression.
   */
  public readonly index: Expr;

  /**
   * The value expression to store.
   */
  public readonly value: Expr;

  /**
   * The element type for this store (derived from the original *ASTORE opcode).
   * Used to recover the correct JVM store opcode during re-emission.
   */
  public readonly elementType: Type;

  constructor(array: Expr, index: Expr, value: Expr, elementType: Type) {
    super();
    this.array = array;
    this.index = index;
    this.value = value;
    this.elementType = elementType;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitArrayStoreStmt(this);
  }

  public toString(): string {
    return `${this.array}[${this.index}] = ${this.value}`;
  }

  public getExpressions(): readonly Expr[] {
    return [this.array, this.index, this.value];
  }
}
