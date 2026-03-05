import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * Stack map frame type.
 */
export enum FrameType {
  /** Full frame with all locals and stack */
  FULL = 'full',
  /** Same locals, empty stack */
  SAME = 'same',
  /** Same locals, one stack item */
  SAME1 = 'same1',
  /** Append 1-3 locals */
  APPEND = 'append',
  /** Chop 1-3 locals */
  CHOP = 'chop',
}

/**
 * Represents a stack map frame metadata statement.
 * This is a pseudo-statement for verification (important for block ordering!).
 */
export class FrameStmt extends Stmt {
  /**
   * The frame type.
   */
  public readonly frameType: FrameType;

  /**
   * Local variable types (for FULL, APPEND frames).
   */
  public readonly locals: readonly (string | number)[];

  /**
   * Stack element types (for FULL, SAME1 frames).
   */
  public readonly stack: readonly (string | number)[];

  constructor(
    frameType: FrameType,
    locals: readonly (string | number)[],
    stack: readonly (string | number)[]
  ) {
    super();
    this.frameType = frameType;
    this.locals = locals;
    this.stack = stack;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitFrameStmt(this);
  }

  public toString(): string {
    return `// frame ${this.frameType}`;
  }

  public getExpressions(): readonly Expr[] {
    return [];
  }
}
