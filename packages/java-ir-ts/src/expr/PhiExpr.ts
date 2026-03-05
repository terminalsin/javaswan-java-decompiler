import { Type } from '@blkswn/java-asm';
import { Expr, type ExprVisitor } from './Expr';

/**
 * Represents a phi function at a control flow merge point.
 * 
 * In JVM bytecode, when multiple control flow paths merge (at loop headers,
 * after conditionals, exception handlers), the stack may contain values from
 * different predecessors. The JVM's StackMapTable frames tell us the types
 * of these values.
 * 
 * PhiExpr represents "a value of type T that comes from one of the predecessors".
 * The actual value depends on which path was taken at runtime.
 * 
 * For exception handlers, the phi is always the caught exception.
 * For loop headers, the phi may be the initial value or a loop-carried value.
 */
export class PhiExpr extends Expr {
  /**
   * The type of this phi, derived from frame information.
   */
  public readonly type: Type;

  /**
   * The stack slot index this phi corresponds to (0 = bottom of stack).
   */
  public readonly stackSlot: number;

  /**
   * The block index where this phi is defined.
   */
  public readonly blockIndex: number;

  /**
   * The predecessor block indices that contribute values to this phi.
   * May be empty if not yet resolved.
   */
  public readonly predecessors: number[];

  /**
   * If this is from an exception handler, the exception type.
   */
  public readonly exceptionType?: string | null;

  /**
   * Creates a new phi expression.
   * 
   * @param type The type from the frame
   * @param stackSlot The stack slot index
   * @param blockIndex The block where this phi is defined
   * @param predecessors The predecessor blocks
   * @param exceptionType If from an exception handler, the exception type
   */
  constructor(
    type: Type,
    stackSlot: number,
    blockIndex: number,
    predecessors: number[] = [],
    exceptionType?: string | null
  ) {
    super();
    this.type = type;
    this.stackSlot = stackSlot;
    this.blockIndex = blockIndex;
    this.predecessors = predecessors;
    this.exceptionType = exceptionType;
  }

  /**
   * Creates a phi for an exception handler entry.
   */
  public static forException(
    exceptionType: string | null,
    blockIndex: number,
    predecessors: number[] = []
  ): PhiExpr {
    const type = exceptionType
      ? Type.getObjectType(exceptionType)
      : Type.getObjectType('java/lang/Throwable');
    return new PhiExpr(type, 0, blockIndex, predecessors, exceptionType);
  }

  /**
   * Creates a phi for a stack slot from frame information.
   */
  public static fromFrame(
    type: Type,
    stackSlot: number,
    blockIndex: number,
    predecessors: number[] = []
  ): PhiExpr {
    return new PhiExpr(type, stackSlot, blockIndex, predecessors);
  }

  /**
   * Returns true if this phi is for an exception handler.
   */
  public isExceptionPhi(): boolean {
    return this.exceptionType !== undefined;
  }

  public accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitPhiExpr(this);
  }

  public toString(): string {
    if (this.exceptionType !== undefined) {
      const typeName = this.exceptionType ?? 'Throwable';
      return `φ(caught ${typeName.replace(/\//g, '.')})`;
    }

    const preds = this.predecessors.length > 0
      ? `from blocks [${this.predecessors.join(', ')}]`
      : '';
    return `φ[${this.stackSlot}]${preds}`;
  }
}
