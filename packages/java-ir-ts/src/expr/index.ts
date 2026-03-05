// Base expression
export { Expr, type ExprVisitor } from './Expr';

// Simple expressions
export { ArithmeticExpr, ArithmeticOp } from './ArithmeticExpr';
export { VarExpr } from './VarExpr';
export { ConstantExpr } from './ConstantExpr';
export { NegationExpr } from './NegationExpr';
export { ComparisonExpr, ComparisonOp } from './ComparisonExpr';

// Invocation expressions
export { InvocationExpr } from './InvocationExpr';
export { StaticInvocationExpr } from './StaticInvocationExpr';
export { VirtualInvocationExpr, VirtualInvocationKind } from './VirtualInvocationExpr';
export { DynamicInvocationExpr } from './DynamicInvocationExpr';

// Field and array expressions
export { FieldLoadExpr } from './FieldLoadExpr';
export { ArrayLoadExpr } from './ArrayLoadExpr';
export { ArrayLengthExpr } from './ArrayLengthExpr';
export { NewArrayExpr } from './NewArrayExpr';

// Type expressions
export { CastExpr, CastKind } from './CastExpr';
export { InstanceOfExpr } from './InstanceOfExpr';
export { NewExpr } from './NewExpr';
export { CaughtExceptionExpr } from './CaughtExceptionExpr';

// Phi expressions for control flow merge points
export { PhiExpr } from './PhiExpr';
