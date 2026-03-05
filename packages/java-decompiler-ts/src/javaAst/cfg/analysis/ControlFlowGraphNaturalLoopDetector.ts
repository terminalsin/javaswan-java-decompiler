import type { ControlFlowGraph } from '@blkswn/java-ir';
import { ControlFlowGraphDominatorAnalysis } from './ControlFlowGraphDominatorAnalysis';

export interface NaturalLoop {
    readonly header: number;
    readonly nodes: ReadonlySet<number>;
    readonly backEdges: readonly { readonly from: number; readonly to: number }[];
}

export class ControlFlowGraphNaturalLoopDetector {
    private readonly dom = new ControlFlowGraphDominatorAnalysis();

    public detect(cfg: ControlFlowGraph): NaturalLoop[] {
        const dominators = this.dom.computeDominators(cfg);
        const loopsByHeader = new Map<number, { nodes: Set<number>; backEdges: { from: number; to: number }[] }>();

        for (const block of cfg.blocks) {
            const from = block.index;
            for (const to of block.successors) {
                if (this.dom.dominates(dominators, to, from)) {
                    const nodes = this.computeNaturalLoopNodes(cfg, to, from);
                    const entry = loopsByHeader.get(to) ?? { nodes: new Set<number>(), backEdges: [] };
                    for (const n of nodes) entry.nodes.add(n);
                    entry.backEdges.push({ from, to });
                    loopsByHeader.set(to, entry);
                }
            }
        }

        const loops: NaturalLoop[] = [];
        for (const [header, data] of loopsByHeader.entries()) {
            loops.push({
                header,
                nodes: data.nodes,
                backEdges: data.backEdges,
            });
        }

        // Deterministic: sort by header index.
        loops.sort((a, b) => a.header - b.header);
        return loops;
    }

    private computeNaturalLoopNodes(cfg: ControlFlowGraph, header: number, tail: number): Set<number> {
        const loop = new Set<number>();
        loop.add(header);
        const stack: number[] = [tail];

        while (stack.length > 0) {
            const n = stack.pop()!;
            if (loop.has(n)) continue;
            loop.add(n);
            const block = cfg.blocks[n];
            if (!block) continue;
            for (const p of block.predecessors) {
                stack.push(p);
            }
        }

        return loop;
    }
}

