import {
  type Expr,
  type Stmt,
  type BasicBlock,
  type ControlFlowGraph,
  StaticInvocationExpr,
  VirtualInvocationExpr,
  VirtualInvocationKind,
  FieldLoadExpr,
  FieldStoreStmt,
  ArithmeticExpr,
  NegationExpr,
  ComparisonExpr,
  CastExpr,
  InstanceOfExpr,
  ArrayLoadExpr,
  ArrayLengthExpr,
  NewArrayExpr,
  NewExpr,
  VarExpr,
  ConstantExpr,
  PhiExpr,
  CaughtExceptionExpr,
  DynamicInvocationExpr,
  VarStoreStmt,
  ArrayStoreStmt,
  ConditionalJumpStmt,
  UnconditionalJumpStmt,
  SwitchStmt,
  ThrowStmt,
  ReturnStmt,
  MonitorStmt,
  PopStmt,
  NopStmt,
  LineNumberStmt,
  FrameStmt,
} from '@blkswn/java-ir';
import type { MethodReferenceResolver } from '../resolution/MethodReferenceResolver';
import type { FieldReferenceResolver } from '../resolution/FieldReferenceResolver';
import type { AnalysisMethod } from '../model/AnalysisMethod';
import { ResolvedStaticInvocationExpr, ResolvedVirtualInvocationExpr } from './ResolvedInvocationExprs';
import { ResolvedFieldLoadExpr, ResolvedFieldStoreStmt } from './ResolvedFieldAccessNodes';

/**
 * Transforms method IR to use resolved references.
 * Preserves expression sharing via memoization.
 */
export class IRResolutionTransformer {
  private readonly methodResolver: MethodReferenceResolver;
  private readonly fieldResolver: FieldReferenceResolver;

  /**
   * Memoization map for transformed expressions.
   * This is important because java-ir-ts may share expression objects
   * (e.g., for DUP operations).
   */
  private readonly exprMemo: Map<Expr, Expr> = new Map();

  /**
   * The method context for resolution.
   */
  private currentMethod: AnalysisMethod | null = null;

  constructor(
    methodResolver: MethodReferenceResolver,
    fieldResolver: FieldReferenceResolver
  ) {
    this.methodResolver = methodResolver;
    this.fieldResolver = fieldResolver;
  }

  /**
   * Transforms all method bodies in place.
   */
  public transformMethod(method: AnalysisMethod): void {
    const cfg = method.cfg;
    if (!cfg) {
      return; // Abstract/native method
    }

    this.currentMethod = method;
    this.exprMemo.clear();

    for (const block of cfg.blocks) {
      this.transformBlock(block);
    }

    this.currentMethod = null;
  }

  private transformBlock(block: BasicBlock): void {
    const newStatements: Stmt[] = [];

    for (const stmt of block.statements) {
      const transformed = this.transformStmt(stmt);
      newStatements.push(transformed);
    }

    // Replace statements in place
    block.statements.length = 0;
    block.statements.push(...newStatements);
  }

  private transformStmt(stmt: Stmt): Stmt {
    if (stmt instanceof VarStoreStmt) {
      const newValue = this.transformExpr(stmt.value);
      if (newValue !== stmt.value) {
        return new VarStoreStmt(stmt.index, newValue, stmt.name);
      }
      return stmt;
    }

    if (stmt instanceof ArrayStoreStmt) {
      const newArray = this.transformExpr(stmt.array);
      const newIndex = this.transformExpr(stmt.index);
      const newValue = this.transformExpr(stmt.value);
      if (newArray !== stmt.array || newIndex !== stmt.index || newValue !== stmt.value) {
        return new ArrayStoreStmt(newArray, newIndex, newValue);
      }
      return stmt;
    }

    if (stmt instanceof FieldStoreStmt) {
      return this.transformFieldStore(stmt);
    }

    if (stmt instanceof ConditionalJumpStmt) {
      const newLeft = this.transformExpr(stmt.left);
      const newRight = stmt.right ? this.transformExpr(stmt.right) : null;
      if (newLeft !== stmt.left || newRight !== stmt.right) {
        return new ConditionalJumpStmt(newLeft, newRight, stmt.op, stmt.trueTarget, stmt.falseTarget);
      }
      return stmt;
    }

    if (stmt instanceof UnconditionalJumpStmt) {
      return stmt;
    }

    if (stmt instanceof SwitchStmt) {
      const newKey = this.transformExpr(stmt.key);
      if (newKey !== stmt.key) {
        return new SwitchStmt(newKey, stmt.cases, stmt.defaultTarget);
      }
      return stmt;
    }

    if (stmt instanceof ThrowStmt) {
      const newException = this.transformExpr(stmt.exception);
      if (newException !== stmt.exception) {
        return new ThrowStmt(newException);
      }
      return stmt;
    }

    if (stmt instanceof ReturnStmt) {
      if (stmt.value) {
        const newValue = this.transformExpr(stmt.value);
        if (newValue !== stmt.value) {
          return new ReturnStmt(newValue);
        }
      }
      return stmt;
    }

    if (stmt instanceof MonitorStmt) {
      const newObject = this.transformExpr(stmt.object);
      if (newObject !== stmt.object) {
        return new MonitorStmt(newObject, stmt.kind);
      }
      return stmt;
    }

    if (stmt instanceof PopStmt) {
      const newValue = this.transformExpr(stmt.value);
      if (newValue !== stmt.value) {
        return new PopStmt(newValue);
      }
      return stmt;
    }

    if (stmt instanceof NopStmt || stmt instanceof LineNumberStmt || stmt instanceof FrameStmt) {
      return stmt;
    }

    // Unknown statement type - return as is
    return stmt;
  }

  private transformExpr(expr: Expr): Expr {
    // Check memoization
    const cached = this.exprMemo.get(expr);
    if (cached) {
      return cached;
    }

    const result = this.doTransformExpr(expr);
    this.exprMemo.set(expr, result);
    return result;
  }

  private doTransformExpr(expr: Expr): Expr {
    if (expr instanceof StaticInvocationExpr && !(expr instanceof ResolvedStaticInvocationExpr)) {
      return this.transformStaticInvocation(expr);
    }

    if (expr instanceof VirtualInvocationExpr && !(expr instanceof ResolvedVirtualInvocationExpr)) {
      return this.transformVirtualInvocation(expr);
    }

    if (expr instanceof DynamicInvocationExpr) {
      // Transform args
      const newArgs = expr.args.map(arg => this.transformExpr(arg));
      const changed = newArgs.some((arg, i) => arg !== expr.args[i]);
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

    if (expr instanceof FieldLoadExpr && !(expr instanceof ResolvedFieldLoadExpr)) {
      return this.transformFieldLoad(expr);
    }

    if (expr instanceof ArithmeticExpr) {
      const newLeft = this.transformExpr(expr.left);
      const newRight = this.transformExpr(expr.right);
      if (newLeft !== expr.left || newRight !== expr.right) {
        return new ArithmeticExpr(expr.type, newLeft, newRight, expr.op);
      }
      return expr;
    }

    if (expr instanceof NegationExpr) {
      const newOperand = this.transformExpr(expr.operand);
      if (newOperand !== expr.operand) {
        return new NegationExpr(expr.type, newOperand);
      }
      return expr;
    }

    if (expr instanceof ComparisonExpr) {
      const newLeft = this.transformExpr(expr.left);
      const newRight = this.transformExpr(expr.right);
      if (newLeft !== expr.left || newRight !== expr.right) {
        return new ComparisonExpr(newLeft, newRight, expr.op);
      }
      return expr;
    }

    if (expr instanceof CastExpr) {
      const newOperand = this.transformExpr(expr.operand);
      if (newOperand !== expr.operand) {
        return new CastExpr(expr.type, newOperand, expr.fromType, expr.kind);
      }
      return expr;
    }

    if (expr instanceof InstanceOfExpr) {
      const newOperand = this.transformExpr(expr.operand);
      if (newOperand !== expr.operand) {
        return new InstanceOfExpr(newOperand, expr.checkType);
      }
      return expr;
    }

    if (expr instanceof ArrayLoadExpr) {
      const newArray = this.transformExpr(expr.array);
      const newIndex = this.transformExpr(expr.index);
      if (newArray !== expr.array || newIndex !== expr.index) {
        return new ArrayLoadExpr(expr.type, newArray, newIndex);
      }
      return expr;
    }

    if (expr instanceof ArrayLengthExpr) {
      const newArray = this.transformExpr(expr.array);
      if (newArray !== expr.array) {
        return new ArrayLengthExpr(newArray);
      }
      return expr;
    }

    if (expr instanceof NewArrayExpr) {
      const newDimensions = expr.dimensions.map(d => this.transformExpr(d));
      const changed = newDimensions.some((d, i) => d !== expr.dimensions[i]);
      if (changed) {
        return new NewArrayExpr(expr.type, expr.elementType, newDimensions);
      }
      return expr;
    }

    // Leaf expressions - no transformation needed
    if (expr instanceof VarExpr || expr instanceof ConstantExpr ||
      expr instanceof NewExpr || expr instanceof PhiExpr ||
      expr instanceof CaughtExceptionExpr) {
      return expr;
    }

    return expr;
  }

  private transformStaticInvocation(expr: StaticInvocationExpr): Expr {
    const referencedFrom = this.currentMethod?.key.toString() ?? 'unknown';
    const resolution = this.methodResolver.resolveStatic(
      expr.owner,
      expr.methodName,
      expr.methodDescriptor,
      referencedFrom
    );

    const newArgs = expr.args.map(arg => this.transformExpr(arg));

    return new ResolvedStaticInvocationExpr(
      expr.type,
      expr.owner,
      expr.methodName,
      expr.methodDescriptor,
      newArgs,
      resolution.declared
    );
  }

  private transformVirtualInvocation(expr: VirtualInvocationExpr): Expr {
    const referencedFrom = this.currentMethod?.key.toString() ?? 'unknown';
    const newReceiver = this.transformExpr(expr.receiver);
    const newArgs = expr.args.map(arg => this.transformExpr(arg));

    // Try to get receiver type for more precise resolution
    const receiverType = this.getReceiverType(newReceiver);

    let resolution;
    if (expr.kind === VirtualInvocationKind.SPECIAL) {
      resolution = this.methodResolver.resolveSpecial(
        expr.owner,
        expr.methodName,
        expr.methodDescriptor,
        referencedFrom
      );
    } else if (expr.kind === VirtualInvocationKind.INTERFACE) {
      resolution = this.methodResolver.resolveInterface(
        expr.owner,
        expr.methodName,
        expr.methodDescriptor,
        receiverType,
        referencedFrom
      );
    } else {
      resolution = this.methodResolver.resolveVirtual(
        expr.owner,
        expr.methodName,
        expr.methodDescriptor,
        receiverType,
        referencedFrom
      );
    }

    return new ResolvedVirtualInvocationExpr(
      expr.type,
      expr.owner,
      expr.methodName,
      expr.methodDescriptor,
      newReceiver,
      newArgs,
      expr.kind,
      expr.isInterface,
      resolution.declared,
      resolution.possibleTargets
    );
  }

  private transformFieldLoad(expr: FieldLoadExpr): Expr {
    const referencedFrom = this.currentMethod?.key.toString() ?? 'unknown';
    const newInstance = expr.instance ? this.transformExpr(expr.instance) : null;

    const resolvedField = this.fieldResolver.resolve(
      expr.owner,
      expr.fieldName,
      expr.fieldDescriptor,
      referencedFrom
    );

    return new ResolvedFieldLoadExpr(
      expr.type,
      expr.owner,
      expr.fieldName,
      expr.fieldDescriptor,
      newInstance,
      expr.isStatic,
      resolvedField
    );
  }

  private transformFieldStore(stmt: FieldStoreStmt): Stmt {
    const referencedFrom = this.currentMethod?.key.toString() ?? 'unknown';
    const newInstance = stmt.instance ? this.transformExpr(stmt.instance) : null;
    const newValue = this.transformExpr(stmt.value);

    const resolvedField = this.fieldResolver.resolve(
      stmt.owner,
      stmt.fieldName,
      stmt.fieldDescriptor,
      referencedFrom
    );

    return new ResolvedFieldStoreStmt(
      stmt.owner,
      stmt.fieldName,
      stmt.fieldDescriptor,
      newInstance,
      newValue,
      stmt.isStatic,
      resolvedField
    );
  }

  /**
   * Tries to extract the static type of a receiver expression.
   */
  private getReceiverType(expr: Expr): string | null {
    // For most precise analysis, we could track types through the IR
    // For now, use the expression's declared type
    const type = expr.type;
    if (type.getSort() === 10) { // OBJECT
      return type.getInternalName();
    }
    return null;
  }
}
