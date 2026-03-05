import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';
import { tokenize } from '../../tokenizer/JavaTokenizer.js';

export class NormalizedLevenshtein implements SimilarityMetric {
  readonly name = 'levenshtein';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const tokensA = tokenize(original.normalizedContent);
    const tokensB = tokenize(deobfuscated.normalizedContent);

    const maxLen = Math.max(tokensA.length, tokensB.length);
    if (maxLen === 0) {
      return { metricName: this.name, score: 1.0 };
    }

    // For very large inputs, fall back to line-level comparison
    const a = tokensA.length > 5000 ? original.normalizedContent.split('\n') : tokensA;
    const b = tokensB.length > 5000 ? deobfuscated.normalizedContent.split('\n') : tokensB;
    const effectiveMax = Math.max(a.length, b.length);

    const dist = editDistance(a, b);
    const score = 1 - dist / effectiveMax;

    return {
      metricName: this.name,
      score: Math.max(0, score),
      details: {
        editDistance: dist,
        tokensA: tokensA.length,
        tokensB: tokensB.length,
        mode: tokensA.length > 5000 ? 'line-level' : 'token-level',
      },
    };
  }
}

/** Wagner-Fischer edit distance with single-row space optimization */
function editDistance(a: string[], b: string[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter array for space optimization
  let short = a;
  let long = b;
  if (a.length > b.length) {
    short = b;
    long = a;
  }

  const shortLen = short.length;
  const longLen = long.length;

  let prev = new Array(shortLen + 1);
  let curr = new Array(shortLen + 1);

  for (let j = 0; j <= shortLen; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= longLen; i++) {
    curr[0] = i;
    for (let j = 1; j <= shortLen; j++) {
      const cost = long[i - 1] === short[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[shortLen];
}
