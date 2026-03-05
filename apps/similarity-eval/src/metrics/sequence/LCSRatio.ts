import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';
import { tokenize } from '../../tokenizer/JavaTokenizer.js';

export class LCSRatio implements SimilarityMetric {
  readonly name = 'lcs-ratio';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const tokensA = tokenize(original.normalizedContent);
    const tokensB = tokenize(deobfuscated.normalizedContent);

    const maxLen = Math.max(tokensA.length, tokensB.length);
    if (maxLen === 0) {
      return { metricName: this.name, score: 1.0 };
    }

    // For very large inputs, use line-level comparison
    const a = tokensA.length > 5000 ? original.normalizedContent.split('\n') : tokensA;
    const b = tokensB.length > 5000 ? deobfuscated.normalizedContent.split('\n') : tokensB;
    const effectiveMax = Math.max(a.length, b.length);

    const lcsLen = lcsLength(a, b);
    const score = lcsLen / effectiveMax;

    return {
      metricName: this.name,
      score,
      details: {
        lcsLength: lcsLen,
        tokensA: tokensA.length,
        tokensB: tokensB.length,
        mode: tokensA.length > 5000 ? 'line-level' : 'token-level',
      },
    };
  }
}

/** LCS length via DP with single-row space optimization */
function lcsLength(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  // Ensure a is shorter for space optimization
  let short = a;
  let long = b;
  if (a.length > b.length) {
    short = b;
    long = a;
  }

  const shortLen = short.length;
  const longLen = long.length;

  let prev = new Array(shortLen + 1).fill(0);
  let curr = new Array(shortLen + 1).fill(0);

  for (let i = 1; i <= longLen; i++) {
    for (let j = 1; j <= shortLen; j++) {
      if (long[i - 1] === short[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[shortLen];
}
