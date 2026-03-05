import type { Stmt } from '../stmt/Stmt';

/**
 * Represents a basic block in the control flow graph.
 * 
 * A basic block is a sequence of statements with:
 * - Single entry point (first statement)
 * - Single exit point (last statement)
 * - No branches except at the end
 * 
 * The index is significant and represents the linear order of blocks
 * in the original bytecode (important for frame verification!).
 */
export class BasicBlock {
  /**
   * The index of this block in the CFG.
   * This represents the linear order in the original bytecode.
   */
  public readonly index: number;

  /**
   * The statements in this block.
   */
  public readonly statements: Stmt[] = [];

  /**
   * Predecessor block indices.
   */
  public readonly predecessors: Set<number> = new Set();

  /**
   * Successor block indices.
   */
  public readonly successors: Set<number> = new Set();

  /**
   * Whether this block is an exception handler entry point.
   */
  public isExceptionHandler: boolean = false;

  /**
   * The exception types handled by this block (if it's an exception handler).
   */
  public readonly handledExceptionTypes: string[] = [];

  /**
   * The bytecode offset this block starts at (for debugging).
   */
  public bytecodeOffset: number = -1;

  constructor(index: number) {
    this.index = index;
  }

  /**
   * Adds a statement to this block.
   */
  public addStatement(stmt: Stmt): void {
    this.statements.push(stmt);
  }

  /**
   * Adds a predecessor block.
   */
  public addPredecessor(blockIndex: number): void {
    this.predecessors.add(blockIndex);
  }

  /**
   * Adds a successor block.
   */
  public addSuccessor(blockIndex: number): void {
    this.successors.add(blockIndex);
  }

  /**
   * Returns the terminating statement of this block (jump, return, throw, switch).
   */
  public getTerminator(): Stmt | null {
    if (this.statements.length === 0) {
      return null;
    }
    return this.statements[this.statements.length - 1] ?? null;
  }

  /**
   * Returns whether this block has any statements.
   */
  public isEmpty(): boolean {
    return this.statements.length === 0;
  }

  public toString(): string {
    return `Block ${this.index} (predecessors: [${[...this.predecessors].join(', ')}], successors: [${[...this.successors].join(', ')}])`;
  }
}
