import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';
import fastDiff from 'fast-diff';

export class LineDiffStats implements SimilarityMetric {
  readonly name = 'line-diff';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const linesA = original.normalizedContent.split('\n');
    const linesB = deobfuscated.normalizedContent.split('\n');

    // Use fast-diff on the full text for accurate diff stats
    const diffs = fastDiff(original.normalizedContent, deobfuscated.normalizedContent);

    let equalChars = 0;
    let totalChars = 0;

    for (const [type, text] of diffs) {
      if (type === fastDiff.EQUAL) {
        equalChars += text.length;
        totalChars += text.length;
      } else if (type === fastDiff.DELETE) {
        totalChars += text.length;
      } else {
        totalChars += text.length;
      }
    }

    // Also compute line-level stats using set intersection
    const setA = new Set(linesA.map((l) => l.trim()).filter(Boolean));
    const setB = new Set(linesB.map((l) => l.trim()).filter(Boolean));

    let commonLines = 0;
    for (const line of setA) {
      if (setB.has(line)) commonLines++;
    }

    const maxLines = Math.max(setA.size, setB.size);
    const lineScore = maxLines === 0 ? 1.0 : commonLines / maxLines;

    // Char-level diff ratio
    const charScore = totalChars === 0 ? 1.0 : equalChars / totalChars;

    // Combined score: weighted average of char-level and line-level
    const score = 0.6 * charScore + 0.4 * lineScore;

    return {
      metricName: this.name,
      score,
      details: {
        charScore,
        lineScore,
        equalChars,
        totalChars,
        commonLines,
        linesA: linesA.length,
        linesB: linesB.length,
      },
    };
  }
}
