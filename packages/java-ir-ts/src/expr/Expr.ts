import type { Type } from '@blkswn/java-asm';

// Import types for visitor interface (using import type to avoid circular issues at runtime)
import type { ArithmeticExpr } from './ArithmeticExpr';
import type { VarExpr } from './VarExpr';
import type { ConstantExpr } from './ConstantExpr';
import type { NegationExpr } from './NegationExpr';
import type { ComparisonExpr } from './ComparisonExpr';
import type { StaticInvocationExpr } from './StaticInvocationExpr';
import type { VirtualInvocationExpr } from './VirtualInvocationExpr';
import type { DynamicInvocationExpr } from './DynamicInvocationExpr';
import type { FieldLoadExpr } from './FieldLoadExpr';
import type { ArrayLoadExpr } from './ArrayLoadExpr';
import type { ArrayLengthExpr } from './ArrayLengthExpr';
import type { NewArrayExpr } from './NewArrayExpr';
import type { CastExpr } from './CastExpr';
import type { InstanceOfExpr } from './InstanceOfExpr';
import type { NewExpr } from './NewExpr';
import type { CaughtExceptionExpr } from './CaughtExceptionExpr';
import type { PhiExpr } from './PhiExpr';

/**
 * Visitor interface for expressions.
 * Implement this to traverse/transform the expression tree.
 */
export interface ExprVisitor<T> {
    visitArithmeticExpr(expr: ArithmeticExpr): T;
    visitVarExpr(expr: VarExpr): T;
    visitConstantExpr(expr: ConstantExpr): T;
    visitNegationExpr(expr: NegationExpr): T;
    visitComparisonExpr(expr: ComparisonExpr): T;
    visitStaticInvocationExpr(expr: StaticInvocationExpr): T;
    visitVirtualInvocationExpr(expr: VirtualInvocationExpr): T;
    visitDynamicInvocationExpr(expr: DynamicInvocationExpr): T;
    visitFieldLoadExpr(expr: FieldLoadExpr): T;
    visitArrayLoadExpr(expr: ArrayLoadExpr): T;
    visitArrayLengthExpr(expr: ArrayLengthExpr): T;
    visitNewArrayExpr(expr: NewArrayExpr): T;
    visitCastExpr(expr: CastExpr): T;
    visitInstanceOfExpr(expr: InstanceOfExpr): T;
    visitNewExpr(expr: NewExpr): T;
    visitCaughtExceptionExpr(expr: CaughtExceptionExpr): T;
    visitPhiExpr(expr: PhiExpr): T;
}

/**
 * Base class for all expressions in the IR.
 * Expressions produce values and can be nested to form expression trees.
 */
export abstract class Expr {
    /**
     * The type of this expression's result.
     */
    public abstract readonly type: Type;

    /**
     * Accept a visitor for this expression.
     */
    public abstract accept<T>(visitor: ExprVisitor<T>): T;

    /**
     * Returns a string representation of this expression.
     */
    public abstract toString(): string;
}
