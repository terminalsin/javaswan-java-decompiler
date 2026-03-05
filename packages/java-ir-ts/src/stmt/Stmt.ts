import type { Expr } from '../expr/Expr';

// Import types for visitor interface (using import type to avoid circular issues at runtime)
import type { VarStoreStmt } from './VarStoreStmt';
import type { ArrayStoreStmt } from './ArrayStoreStmt';
import type { FieldStoreStmt } from './FieldStoreStmt';
import type { MonitorStmt } from './MonitorStmt';
import type { ConditionalJumpStmt } from './ConditionalJumpStmt';
import type { UnconditionalJumpStmt } from './UnconditionalJumpStmt';
import type { SwitchStmt } from './SwitchStmt';
import type { ThrowStmt } from './ThrowStmt';
import type { NopStmt } from './NopStmt';
import type { PopStmt } from './PopStmt';
import type { LineNumberStmt } from './LineNumberStmt';
import type { FrameStmt } from './FrameStmt';
import type { ReturnStmt } from './ReturnStmt';

/**
 * Visitor interface for statements.
 * Implement this to traverse/transform the statement list.
 */
export interface StmtVisitor<T> {
  visitVarStoreStmt(stmt: VarStoreStmt): T;
  visitArrayStoreStmt(stmt: ArrayStoreStmt): T;
  visitFieldStoreStmt(stmt: FieldStoreStmt): T;
  visitMonitorStmt(stmt: MonitorStmt): T;
  visitConditionalJumpStmt(stmt: ConditionalJumpStmt): T;
  visitUnconditionalJumpStmt(stmt: UnconditionalJumpStmt): T;
  visitSwitchStmt(stmt: SwitchStmt): T;
  visitThrowStmt(stmt: ThrowStmt): T;
  visitNopStmt(stmt: NopStmt): T;
  visitPopStmt(stmt: PopStmt): T;
  visitLineNumberStmt(stmt: LineNumberStmt): T;
  visitFrameStmt(stmt: FrameStmt): T;
  visitReturnStmt(stmt: ReturnStmt): T;
}

/**
 * Base class for all statements in the IR.
 * Statements consume expressions and represent control flow or side effects.
 */
export abstract class Stmt {
  /**
   * Accept a visitor for this statement.
   */
  public abstract accept<T>(visitor: StmtVisitor<T>): T;

  /**
   * Returns a string representation of this statement.
   */
  public abstract toString(): string;

  /**
   * Returns all expressions used by this statement.
   * Useful for traversing the expression tree.
   */
  public abstract getExpressions(): readonly Expr[];
}
