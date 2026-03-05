import type { Type } from '@blkswn/java-asm';
import { TypeSort } from '@blkswn/java-asm';

export class JavaLiteralFormatter {
  public format(value: unknown, typeHint: Type | null = null): string {
    if (value === null) return 'null';
    if (value === undefined) return 'null';

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    if (typeof value === 'bigint') {
      if (value >= -2147483648n && value <= 2147483647n) {
        return value.toString();
      }
      return `${value.toString()}L`;
    }

    if (typeof value === 'number') {
      const sort = typeHint?.getSort();
      if (sort === TypeSort.LONG) {
        const truncated = Math.trunc(value);
        // Small values that fit in int range don't need the L suffix — Java widens automatically
        if (truncated >= -2147483648 && truncated <= 2147483647) {
          return `${truncated}`;
        }
        return `${truncated}L`;
      }
      if (sort === TypeSort.FLOAT) {
        // Ensure float literals have an 'f' suffix.
        if (Number.isInteger(value)) {
          return `${value.toFixed(1)}f`;
        }
        return `${value}f`;
      }
      return String(value);
    }

    // Fallback - best effort stringification
    return JSON.stringify(value);
  }
}

