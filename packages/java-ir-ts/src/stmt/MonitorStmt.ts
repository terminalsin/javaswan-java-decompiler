import type { Expr } from '../expr/Expr';
import { Stmt, type StmtVisitor } from './Stmt';

/**
 * The kind of monitor operation.
 */
export enum MonitorKind {
  /** Acquire monitor lock (monitorenter) */
  ENTER = 'enter',
  /** Release monitor lock (monitorexit) */
  EXIT = 'exit',
}

/**
 * Represents a monitor enter/exit statement.
 * Corresponds to: MONITORENTER, MONITOREXIT
 */
export class MonitorStmt extends Stmt {
  /**
   * The object to synchronize on.
   */
  public readonly object: Expr;

  /**
   * The kind of monitor operation.
   */
  public readonly kind: MonitorKind;

  constructor(object: Expr, kind: MonitorKind) {
    super();
    this.object = object;
    this.kind = kind;
  }

  public accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitMonitorStmt(this);
  }

  public toString(): string {
    return `monitor${this.kind}(${this.object})`;
  }

  public getExpressions(): readonly Expr[] {
    return [this.object];
  }
}
