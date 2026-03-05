import { BasicBlock } from './BasicBlock';

/**
 * Represents an exception handler entry.
 */
export interface ExceptionHandler {
  /**
   * The start block index of the try region.
   */
  readonly startBlock: number;

  /**
   * The end block index of the try region (exclusive).
   */
  readonly endBlock: number;

  /**
   * The handler block index.
   */
  readonly handlerBlock: number;

  /**
   * The exception type being caught (null for catch-all).
   */
  readonly exceptionType: string | null;
}

/**
 * Represents a control flow graph for a method.
 * 
 * Blocks are indexed by their linear position in the original bytecode,
 * which is important for frame verification.
 */
export class ControlFlowGraph {
  /**
   * The basic blocks, indexed by their linear position.
   */
  public readonly blocks: BasicBlock[] = [];

  /**
   * The exception handlers.
   */
  public readonly exceptionHandlers: ExceptionHandler[] = [];

  /**
   * Map from bytecode offset to block index.
   */
  private readonly offsetToBlock: Map<number, number> = new Map();

  /**
   * Creates a new basic block and adds it to the CFG.
   */
  public createBlock(): BasicBlock {
    const block = new BasicBlock(this.blocks.length);
    this.blocks.push(block);
    return block;
  }

  /**
   * Gets a block by index.
   */
  public getBlock(index: number): BasicBlock | undefined {
    return this.blocks[index];
  }

  /**
   * Gets the entry block (block 0).
   */
  public getEntryBlock(): BasicBlock | undefined {
    return this.blocks[0];
  }

  /**
   * Associates a bytecode offset with a block index.
   */
  public setOffsetToBlock(offset: number, blockIndex: number): void {
    this.offsetToBlock.set(offset, blockIndex);
  }

  /**
   * Gets the block index for a bytecode offset.
   */
  public getBlockForOffset(offset: number): number | undefined {
    return this.offsetToBlock.get(offset);
  }

  /**
   * Adds an edge from one block to another.
   */
  public addEdge(fromIndex: number, toIndex: number): void {
    const fromBlock = this.blocks[fromIndex];
    const toBlock = this.blocks[toIndex];
    if (fromBlock && toBlock) {
      fromBlock.addSuccessor(toIndex);
      toBlock.addPredecessor(fromIndex);
    }
  }

  /**
   * Adds an exception handler.
   */
  public addExceptionHandler(handler: ExceptionHandler): void {
    this.exceptionHandlers.push(handler);
    const handlerBlock = this.blocks[handler.handlerBlock];
    if (handlerBlock) {
      handlerBlock.isExceptionHandler = true;
      if (handler.exceptionType !== null) {
        handlerBlock.handledExceptionTypes.push(handler.exceptionType);
      }
    }
  }

  /**
   * Returns the number of blocks.
   */
  public get size(): number {
    return this.blocks.length;
  }

  /**
   * Iterates over all blocks in linear order.
   */
  public *[Symbol.iterator](): Iterator<BasicBlock> {
    yield* this.blocks;
  }

  /**
   * Returns blocks in reverse post-order (useful for dataflow analysis).
   */
  public getReversePostOrder(): BasicBlock[] {
    const visited = new Set<number>();
    const result: BasicBlock[] = [];

    const visit = (blockIndex: number): void => {
      if (visited.has(blockIndex)) {
        return;
      }
      visited.add(blockIndex);

      const block = this.blocks[blockIndex];
      if (block) {
        for (const successor of block.successors) {
          visit(successor);
        }
        result.unshift(block);
      }
    };

    if (this.blocks.length > 0) {
      visit(0);
    }

    // Add any unreachable blocks
    for (let i = 0; i < this.blocks.length; i++) {
      if (!visited.has(i)) {
        const block = this.blocks[i];
        if (block) {
          result.push(block);
        }
      }
    }

    return result;
  }
}
