import {
  type Expr,
  type Stmt,
  type BasicBlock,
  ConstantExpr,
  VarExpr,
  VarStoreStmt,
  ArithmeticExpr,
  NegationExpr,
  ComparisonExpr,
  CastExpr,
  CastKind,
  ArrayStoreStmt,
  ArrayLoadExpr,
  ArrayLengthExpr,
  FieldLoadExpr,
  FieldStoreStmt,
  ConditionalJumpStmt,
  SwitchStmt,
  ThrowStmt,
  ReturnStmt,
  MonitorStmt,
  PopStmt,
  NewArrayExpr,
  InstanceOfExpr,
  StaticInvocationExpr,
  VirtualInvocationExpr,
  DynamicInvocationExpr,
} from '@blkswn/java-ir';
import type { AnalysisMethod } from '../model/AnalysisMethod';
import { AbstractOptimizationPass, type PassStatistics } from './OptimizationPass';
import { LocalConstantState, constant, BOTTOM } from './constantFolding/LocalConstantState';
import { ConstantFolder } from './constantFolding/ConstantFolder';

/**
 * Constant propagation and folding optimization pass.
 * 
 * This pass performs intraprocedural analysis to:
 * 1. Track constant values of local variables
 * 2. Replace VarExpr with ConstantExpr when provably constant
 * 3. Fold arithmetic, negation, comparison, and cast expressions with constant operands
 */
export class ConstantFoldingPass extends AbstractOptimizationPass {
  public readonly name = 'ConstantFolding';
  public readonly description = 'Propagates constants and folds constant expressions';

  private readonly folder = new ConstantFolder();

  /**
   * Block-entry states for dataflow analysis.
   */
  private blockEntryStates: Map<number, LocalConstantState> = new Map();

  /**
   * Whether we're in the analysis phase (computing states) or transform phase.
   */
  private analysisPhase = true;

  public runOnMethod(method: AnalysisMethod): boolean {
    const cfg = method.cfg;
    if (!cfg || cfg.blocks.length === 0) {
      return false;
    }

    this.folder.reset();
    this.blockEntryStates.clear();

    // Phase 1: Compute constant states via dataflow
    this.analysisPhase = true;
    this.computeDataflow(method);

    // Phase 2: Transform using computed states
    this.analysisPhase = false;
    const changed = this.transformMethod(method);

    // Update statistics
    this.statistics['arithmeticFolds'] =
      ((this.statistics['arithmeticFolds'] as number) || 0) + this.folder.arithmeticFolds;
    this.statistics['negationFolds'] =
      ((this.statistics['negationFolds'] as number) || 0) + this.folder.negationFolds;
    this.statistics['comparisonFolds'] =
      ((this.statistics['comparisonFolds'] as number) || 0) + this.folder.comparisonFolds;
    this.statistics['castFolds'] =
      ((this.statistics['castFolds'] as number) || 0) + this.folder.castFolds;

    return changed;
  }

  /**
   * Computes dataflow (constant propagation) to fixed point.
   */
  private computeDataflow(method: AnalysisMethod): void {
    const cfg = method.cfg!;
    const worklist: number[] = [];

    // Initialize entry block
    const entryState = LocalConstantState.empty();
    this.blockEntryStates.set(0, entryState);
    worklist.push(0);

    // Process worklist until fixed point
    while (worklist.length > 0) {
      const blockIndex = worklist.pop()!;
      const block = cfg.blocks[blockIndex];
      if (!block) continue;

      const entryState = this.blockEntryStates.get(blockIndex) ?? LocalConstantState.empty();
      const exitState = this.analyzeBlock(block, entryState.clone());

      // Propagate to successors
      for (const succIndex of block.successors) {
        let succEntry = this.blockEntryStates.get(succIndex);
        if (!succEntry) {
          succEntry = LocalConstantState.empty();
          this.blockEntryStates.set(succIndex, succEntry);
          worklist.push(succIndex);
        }

        const changed = succEntry.mergeFrom(exitState);
        if (changed && !worklist.includes(succIndex)) {
          worklist.push(succIndex);
        }
      }
    }
  }

  /**
   * Analyzes a block and returns the exit state.
   */
  private analyzeBlock(block: BasicBlock, state: LocalConstantState): LocalConstantState {
    for (const stmt of block.statements) {
      this.analyzeStmt(stmt, state);
    }
    return state;
  }

  /**
   * Updates state based on a statement.
   */
  private analyzeStmt(stmt: Stmt, state: LocalConstantState): void {
    if (stmt instanceof VarStoreStmt) {
      // Check if the stored value is a constant
      const constValue = this.extractConstant(stmt.value, state);
      if (constValue) {
        state.setConstant(stmt.index, constValue.value, constValue.type);
      } else {
        state.setNonConstant(stmt.index);
      }
    }
    // Other statements don't affect local constant state directly
  }

  /**
   * Extracts a constant value from an expression using the current state.
   */
  private extractConstant(
    expr: Expr,
    state: LocalConstantState
  ): { value: unknown; type: import('@blkswn/java-asm').Type } | null {
    if (expr instanceof ConstantExpr) {
      return { value: expr.value, type: expr.type };
    }

    if (expr instanceof VarExpr) {
      return state.getConstant(expr.index);
    }

    // Try to fold the expression first
    const folded = this.tryFoldWithState(expr, state);
    if (folded instanceof ConstantExpr) {
      return { value: folded.value, type: folded.type };
    }

    return null;
  }

  /**
   * Tries to fold an expression using the current constant state.
   */
  private tryFoldWithState(expr: Expr, state: LocalConstantState): Expr {
    // First, recursively fold sub-expressions
    const transformed = this.transformExpr(expr, state);

    // Then try to fold the result
    return this.folder.tryFold(transformed);
  }

  /**
   * Transforms the method using computed constant states.
   */
  private transformMethod(method: AnalysisMethod): boolean {
    const cfg = method.cfg!;
    let changed = false;

    for (const block of cfg.blocks) {
      const state = this.blockEntryStates.get(block.index) ?? LocalConstantState.empty();
      const blockChanged = this.transformBlock(block, state);
      changed = changed || blockChanged;
    }

    return changed;
  }

  /**
   * Transforms a block using the entry constant state.
   */
  private transformBlock(block: BasicBlock, entryState: LocalConstantState): boolean {
    let changed = false;
    const state = entryState.clone();
    const newStatements: Stmt[] = [];

    for (const stmt of block.statements) {
      const [newStmt, stmtChanged] = this.transformStmt(stmt, state);
      newStatements.push(newStmt);
      if (stmtChanged) changed = true;

      // Update state for next statement
      this.analyzeStmt(newStmt, state);
    }

    if (changed) {
      block.statements.length = 0;
      block.statements.push(...newStatements);
    }

    return changed;
  }

  /**
   * Transforms a statement.
   */
  private transformStmt(stmt: Stmt, state: LocalConstantState): [Stmt, boolean] {
    if (stmt instanceof VarStoreStmt) {
      const [newValue, changed] = this.transformExprWithChange(stmt.value, state);
      if (changed) {
        return [new VarStoreStmt(stmt.index, newValue, stmt.name), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof ArrayStoreStmt) {
      const [newArray, c1] = this.transformExprWithChange(stmt.array, state);
      const [newIndex, c2] = this.transformExprWithChange(stmt.index, state);
      const [newValue, c3] = this.transformExprWithChange(stmt.value, state);
      if (c1 || c2 || c3) {
        return [new ArrayStoreStmt(newArray, newIndex, newValue), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof FieldStoreStmt) {
      const [newInstance, c1] = stmt.instance
        ? this.transformExprWithChange(stmt.instance, state)
        : [null, false];
      const [newValue, c2] = this.transformExprWithChange(stmt.value, state);
      if (c1 || c2) {
        // Create a new FieldStoreStmt - need to preserve the type
        return [new FieldStoreStmt(
          stmt.owner,
          stmt.fieldName,
          stmt.fieldDescriptor,
          newInstance,
          newValue,
          stmt.isStatic
        ), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof ConditionalJumpStmt) {
      const [newLeft, c1] = this.transformExprWithChange(stmt.left, state);
      const [newRight, c2] = stmt.right
        ? this.transformExprWithChange(stmt.right, state)
        : [null, false];
      if (c1 || c2) {
        return [new ConditionalJumpStmt(newLeft, newRight, stmt.op, stmt.trueTarget, stmt.falseTarget), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof SwitchStmt) {
      const [newKey, changed] = this.transformExprWithChange(stmt.key, state);
      if (changed) {
        return [new SwitchStmt(newKey, stmt.cases, stmt.defaultTarget), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof ThrowStmt) {
      const [newException, changed] = this.transformExprWithChange(stmt.exception, state);
      if (changed) {
        return [new ThrowStmt(newException), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof ReturnStmt) {
      if (stmt.value) {
        const [newValue, changed] = this.transformExprWithChange(stmt.value, state);
        if (changed) {
          return [new ReturnStmt(newValue), true];
        }
      }
      return [stmt, false];
    }

    if (stmt instanceof MonitorStmt) {
      const [newObject, changed] = this.transformExprWithChange(stmt.object, state);
      if (changed) {
        return [new MonitorStmt(newObject, stmt.kind), true];
      }
      return [stmt, false];
    }

    if (stmt instanceof PopStmt) {
      const [newValue, changed] = this.transformExprWithChange(stmt.value, state);
      if (changed) {
        return [new PopStmt(newValue), true];
      }
      return [stmt, false];
    }

    return [stmt, false];
  }

  /**
   * Transforms an expression and returns whether it changed.
   */
  private transformExprWithChange(expr: Expr, state: LocalConstantState): [Expr, boolean] {
    const result = this.transformExpr(expr, state);
    return [result, result !== expr];
  }

  /**
   * Transforms an expression by propagating constants and folding.
   */
  private transformExpr(expr: Expr, state: LocalConstantState): Expr {
    // Variable replacement
    if (expr instanceof VarExpr) {
      const constExpr = state.getConstantExpr(expr.index);
      if (constExpr) {
        return constExpr;
      }
      return expr;
    }

    // Already a constant
    if (expr instanceof ConstantExpr) {
      return expr;
    }

    // Arithmetic
    if (expr instanceof ArithmeticExpr) {
      const newLeft = this.transformExpr(expr.left, state);
      const newRight = this.transformExpr(expr.right, state);
      const newExpr = (newLeft !== expr.left || newRight !== expr.right)
        ? new ArithmeticExpr(expr.type, newLeft, newRight, expr.op)
        : expr;
      return this.folder.foldArithmetic(newExpr as ArithmeticExpr);
    }

    // Negation
    if (expr instanceof NegationExpr) {
      const newOperand = this.transformExpr(expr.operand, state);
      const newExpr = newOperand !== expr.operand
        ? new NegationExpr(expr.type, newOperand)
        : expr;
      return this.folder.foldNegation(newExpr as NegationExpr);
    }

    // Comparison
    if (expr instanceof ComparisonExpr) {
      const newLeft = this.transformExpr(expr.left, state);
      const newRight = this.transformExpr(expr.right, state);
      const newExpr = (newLeft !== expr.left || newRight !== expr.right)
        ? new ComparisonExpr(newLeft, newRight, expr.op)
        : expr;
      return this.folder.foldComparison(newExpr as ComparisonExpr);
    }

    // Cast
    if (expr instanceof CastExpr) {
      const newOperand = this.transformExpr(expr.operand, state);
      const newExpr = newOperand !== expr.operand
        ? new CastExpr(expr.type, newOperand, expr.fromType, expr.kind)
        : expr;
      return this.folder.foldCast(newExpr as CastExpr);
    }

    // Array load
    if (expr instanceof ArrayLoadExpr) {
      const newArray = this.transformExpr(expr.array, state);
      const newIndex = this.transformExpr(expr.index, state);
      if (newArray !== expr.array || newIndex !== expr.index) {
        return new ArrayLoadExpr(expr.type, newArray, newIndex);
      }
      return expr;
    }

    // Array length
    if (expr instanceof ArrayLengthExpr) {
      const newArray = this.transformExpr(expr.array, state);
      if (newArray !== expr.array) {
        return new ArrayLengthExpr(newArray);
      }
      return expr;
    }

    // Field load
    if (expr instanceof FieldLoadExpr) {
      if (expr.instance) {
        const newInstance = this.transformExpr(expr.instance, state);
        if (newInstance !== expr.instance) {
          return new FieldLoadExpr(
            expr.type,
            expr.owner,
            expr.fieldName,
            expr.fieldDescriptor,
            newInstance,
            expr.isStatic
          );
        }
      }
      return expr;
    }

    // New array
    if (expr instanceof NewArrayExpr) {
      const newDims = expr.dimensions.map(d => this.transformExpr(d, state));
      const changed = newDims.some((d, i) => d !== expr.dimensions[i]);
      if (changed) {
        return new NewArrayExpr(expr.type, expr.elementType, newDims);
      }
      return expr;
    }

    // InstanceOf
    if (expr instanceof InstanceOfExpr) {
      const newOperand = this.transformExpr(expr.operand, state);
      if (newOperand !== expr.operand) {
        return new InstanceOfExpr(newOperand, expr.checkType);
      }
      return expr;
    }

    // Invocations - transform arguments
    if (expr instanceof StaticInvocationExpr) {
      const newArgs = expr.args.map(a => this.transformExpr(a, state));
      const changed = newArgs.some((a, i) => a !== expr.args[i]);
      if (changed) {
        return new StaticInvocationExpr(
          expr.type,
          expr.owner,
          expr.methodName,
          expr.methodDescriptor,
          newArgs
        );
      }
      return expr;
    }

    if (expr instanceof VirtualInvocationExpr) {
      const newReceiver = this.transformExpr(expr.receiver, state);
      const newArgs = expr.args.map(a => this.transformExpr(a, state));
      const changed = newReceiver !== expr.receiver || newArgs.some((a, i) => a !== expr.args[i]);
      if (changed) {
        return new VirtualInvocationExpr(
          expr.type,
          expr.owner,
          expr.methodName,
          expr.methodDescriptor,
          newReceiver,
          newArgs,
          expr.kind,
          expr.isInterface
        );
      }
      return expr;
    }

    if (expr instanceof DynamicInvocationExpr) {
      const newArgs = expr.args.map(a => this.transformExpr(a, state));
      const changed = newArgs.some((a, i) => a !== expr.args[i]);
      if (changed) {
        return new DynamicInvocationExpr(
          expr.type,
          expr.methodName,
          expr.methodDescriptor,
          newArgs,
          expr.bootstrapMethod,
          expr.bootstrapArgs
        );
      }
      return expr;
    }

    // Default: return unchanged
    return expr;
  }

  public override reset(): void {
    super.reset();
    this.folder.reset();
    this.blockEntryStates.clear();
  }
}
