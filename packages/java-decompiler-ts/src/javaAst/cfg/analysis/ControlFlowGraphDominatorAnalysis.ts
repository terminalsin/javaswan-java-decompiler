import type { ControlFlowGraph } from '@blkswn/java-ir';

export class ControlFlowGraphDominatorAnalysis {
    public computeDominators(cfg: ControlFlowGraph): Map<number, Set<number>> {
        const nodes = cfg.blocks.map(b => b.index);
        const all = new Set<number>(nodes);
        const dom = new Map<number, Set<number>>();

        if (nodes.length === 0) {
            return dom;
        }

        const entry = 0;

        for (const n of nodes) {
            if (n === entry) {
                dom.set(n, new Set([entry]));
            } else {
                dom.set(n, new Set(all));
            }
        }

        let changed = true;
        while (changed) {
            changed = false;

            for (const n of nodes) {
                if (n === entry) continue;

                const block = cfg.blocks[n];
                if (!block) continue;

                const preds = [...block.predecessors];
                if (preds.length === 0) {
                    // Unreachable: keep self-only to avoid polluting intersections.
                    const next = new Set<number>([n]);
                    if (!this.setEquals(dom.get(n)!, next)) {
                        dom.set(n, next);
                        changed = true;
                    }
                    continue;
                }

                let intersection: Set<number> | null = null;
                for (const p of preds) {
                    const pDom = dom.get(p);
                    if (!pDom) continue;
                    intersection = intersection ? this.setIntersection(intersection, pDom) : new Set(pDom);
                }

                if (!intersection) {
                    intersection = new Set<number>();
                }

                const next = new Set<number>(intersection);
                next.add(n);

                if (!this.setEquals(dom.get(n)!, next)) {
                    dom.set(n, next);
                    changed = true;
                }
            }
        }

        return dom;
    }

    public dominates(dominators: Map<number, Set<number>>, a: number, b: number): boolean {
        const d = dominators.get(b);
        return d ? d.has(a) : false;
    }

    private setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
        const out = new Set<T>();
        for (const x of a) {
            if (b.has(x)) out.add(x);
        }
        return out;
    }

    private setEquals<T>(a: Set<T>, b: Set<T>): boolean {
        if (a.size !== b.size) return false;
        for (const x of a) {
            if (!b.has(x)) return false;
        }
        return true;
    }
}

