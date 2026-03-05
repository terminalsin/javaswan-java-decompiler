import type { ControlFlowGraph } from '@blkswn/java-ir';

/**
 * Attempts to turn a CFG into a simple linear chain of blocks.
 * This is safe only when there are no branches and all blocks are reachable in a single sequence.
 */
export class ControlFlowGraphLinearizer {
  public tryLinearize(cfg: ControlFlowGraph): number[] | null {
    if (cfg.blocks.length === 0) {
      return [];
    }

    const order: number[] = [];
    const visited = new Set<number>();
    let current = 0;

    while (!visited.has(current)) {
      visited.add(current);
      order.push(current);

      const block = cfg.blocks[current];
      if (!block) {
        return null;
      }

      if (block.successors.size === 0) {
        break;
      }

      if (block.successors.size > 1) {
        return null;
      }

      const [next] = block.successors;
      if (next === undefined) {
        break;
      }

      // Linear chains require single-entry blocks.
      const nextBlock = cfg.blocks[next];
      if (!nextBlock) {
        return null;
      }
      if (next !== 0 && nextBlock.predecessors.size !== 1) {
        return null;
      }

      current = next;
    }

    // Must cover all blocks to be considered linear.
    if (visited.size !== cfg.blocks.length) {
      return null;
    }

    return order;
  }
}

