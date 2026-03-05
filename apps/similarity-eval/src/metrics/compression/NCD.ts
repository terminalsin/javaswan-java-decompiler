import { gzipSync } from 'node:zlib';
import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';

export class NormalizedCompressionDistance implements SimilarityMetric {
  readonly name = 'ncd';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const x = original.normalizedContent;
    const y = deobfuscated.normalizedContent;

    const cx = compressedSize(x);
    const cy = compressedSize(y);
    const cxy = compressedSize(x + y);

    const minC = Math.min(cx, cy);
    const maxC = Math.max(cx, cy);

    // NCD(x,y) = (C(xy) - min(C(x),C(y))) / max(C(x),C(y))
    const ncd = maxC === 0 ? 0 : (cxy - minC) / maxC;

    // Convert to similarity: 1 - NCD, clamped to [0, 1]
    const score = Math.max(0, Math.min(1, 1 - ncd));

    return {
      metricName: this.name,
      score,
      details: {
        ncd,
        compressedX: cx,
        compressedY: cy,
        compressedXY: cxy,
      },
    };
  }
}

function compressedSize(text: string): number {
  return gzipSync(Buffer.from(text, 'utf-8'), { level: 9 }).length;
}
