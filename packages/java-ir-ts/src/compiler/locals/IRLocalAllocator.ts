import type { Type } from '@blkswn/java-asm';

/**
 * Allocates new local variable slots for compiler-generated temporaries.
 */
export class IRLocalAllocator {
  private nextLocalIndex: number;

  constructor(initialLocalIndex: number) {
    this.nextLocalIndex = initialLocalIndex;
  }

  public allocate(type: Type): number {
    const size = type.getSize();
    if (size === 0) {
      throw new Error('Cannot allocate a local slot for void type');
    }

    const index = this.nextLocalIndex;
    this.nextLocalIndex += size;
    return index;
  }

  public getNextLocalIndex(): number {
    return this.nextLocalIndex;
  }
}

