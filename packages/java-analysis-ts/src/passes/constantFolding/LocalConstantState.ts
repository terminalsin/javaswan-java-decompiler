import { ConstantExpr } from '@blkswn/java-ir';
import type { Type } from '@blkswn/java-asm';

/**
 * Represents the constant value lattice for a local variable.
 * 
 * Lattice: TOP (unknown) -> concrete value -> BOTTOM (multiple values)
 */
export type ConstantLatticeValue =
  | { kind: 'top' }           // Unknown - no information yet
  | { kind: 'constant'; value: unknown; type: Type }  // Known constant
  | { kind: 'bottom' };       // Non-constant (multiple values)

export const TOP: ConstantLatticeValue = { kind: 'top' };
export const BOTTOM: ConstantLatticeValue = { kind: 'bottom' };

/**
 * Creates a constant lattice value.
 */
export function constant(value: unknown, type: Type): ConstantLatticeValue {
  return { kind: 'constant', value, type };
}

/**
 * Computes the meet (join) of two lattice values.
 * Used when merging values at control flow merge points.
 */
export function meet(a: ConstantLatticeValue, b: ConstantLatticeValue): ConstantLatticeValue {
  // TOP is the identity for meet
  if (a.kind === 'top') {
    return b;
  }
  if (b.kind === 'top') {
    return a;
  }

  // BOTTOM absorbs everything
  if (a.kind === 'bottom' || b.kind === 'bottom') {
    return BOTTOM;
  }

  // Both are constants - check if they're equal
  if (a.kind === 'constant' && b.kind === 'constant') {
    if (constantsEqual(a.value, a.type, b.value, b.type)) {
      return a;
    }
  }

  // Different constants -> BOTTOM
  return BOTTOM;
}

/**
 * Checks if two constant values are equal.
 */
function constantsEqual(v1: unknown, t1: Type, v2: unknown, t2: Type): boolean {
  // Types must be compatible
  if (t1.getSort() !== t2.getSort()) {
    return false;
  }

  // Handle special cases
  if (v1 === null && v2 === null) {
    return true;
  }
  if (v1 === null || v2 === null) {
    return false;
  }

  // BigInt comparison
  if (typeof v1 === 'bigint' && typeof v2 === 'bigint') {
    return v1 === v2;
  }

  // Number comparison (handle NaN)
  if (typeof v1 === 'number' && typeof v2 === 'number') {
    if (Number.isNaN(v1) && Number.isNaN(v2)) {
      return true;
    }
    return v1 === v2;
  }

  // String comparison
  if (typeof v1 === 'string' && typeof v2 === 'string') {
    return v1 === v2;
  }

  // Default: strict equality
  return v1 === v2;
}

/**
 * State for tracking constant values of local variables.
 */
export class LocalConstantState {
  /**
   * Map from local variable index to its constant value.
   */
  private readonly locals: Map<number, ConstantLatticeValue> = new Map();

  /**
   * Creates an empty state (all locals are TOP).
   */
  public static empty(): LocalConstantState {
    return new LocalConstantState();
  }

  /**
   * Creates a copy of this state.
   */
  public clone(): LocalConstantState {
    const copy = new LocalConstantState();
    for (const [index, value] of this.locals) {
      copy.locals.set(index, value);
    }
    return copy;
  }

  /**
   * Gets the lattice value for a local variable.
   */
  public get(index: number): ConstantLatticeValue {
    return this.locals.get(index) ?? TOP;
  }

  /**
   * Sets the lattice value for a local variable.
   */
  public set(index: number, value: ConstantLatticeValue): void {
    if (value.kind === 'top') {
      this.locals.delete(index);
    } else {
      this.locals.set(index, value);
    }
  }

  /**
   * Sets a local to a constant value.
   */
  public setConstant(index: number, value: unknown, type: Type): void {
    this.set(index, constant(value, type));
  }

  /**
   * Sets a local to non-constant (BOTTOM).
   */
  public setNonConstant(index: number): void {
    this.set(index, BOTTOM);
  }

  /**
   * Checks if a local has a known constant value.
   */
  public isConstant(index: number): boolean {
    return this.get(index).kind === 'constant';
  }

  /**
   * Gets the constant value for a local (if known).
   */
  public getConstant(index: number): { value: unknown; type: Type } | null {
    const lattice = this.get(index);
    if (lattice.kind === 'constant') {
      return { value: lattice.value, type: lattice.type };
    }
    return null;
  }

  /**
   * Creates a ConstantExpr from a local's constant value.
   */
  public getConstantExpr(index: number): ConstantExpr | null {
    const c = this.getConstant(index);
    if (c) {
      return new ConstantExpr(c.type, c.value);
    }
    return null;
  }

  /**
   * Merges another state into this one (in-place meet).
   * Returns true if this state changed.
   */
  public mergeFrom(other: LocalConstantState): boolean {
    let changed = false;

    // All locals in this state
    for (const [index, thisValue] of this.locals) {
      const otherValue = other.get(index);
      const merged = meet(thisValue, otherValue);
      if (merged.kind !== thisValue.kind ||
        (merged.kind === 'constant' && thisValue.kind === 'constant' && merged.value !== thisValue.value)) {
        this.set(index, merged);
        changed = true;
      }
    }

    // Locals only in other state
    for (const [index, otherValue] of other.locals) {
      if (!this.locals.has(index)) {
        const thisValue = TOP;
        const merged = meet(thisValue, otherValue);
        if (merged.kind !== 'top') {
          this.set(index, merged);
          changed = true;
        }
      }
    }

    return changed;
  }

  /**
   * Checks if two states are equal.
   */
  public equals(other: LocalConstantState): boolean {
    if (this.locals.size !== other.locals.size) {
      return false;
    }

    for (const [index, value] of this.locals) {
      const otherValue = other.get(index);
      if (value.kind !== otherValue.kind) {
        return false;
      }
      if (value.kind === 'constant' && otherValue.kind === 'constant') {
        if (!constantsEqual(value.value, value.type, otherValue.value, otherValue.type)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Returns a string representation for debugging.
   */
  public toString(): string {
    const entries: string[] = [];
    for (const [index, value] of this.locals) {
      if (value.kind === 'constant') {
        entries.push(`var${index}=${value.value}`);
      } else if (value.kind === 'bottom') {
        entries.push(`var${index}=⊥`);
      }
    }
    return `{${entries.join(', ')}}`;
  }
}
