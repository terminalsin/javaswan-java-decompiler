import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';
import { tokenizeToSet } from '../../tokenizer/JavaTokenizer.js';

export class DiceCoefficient implements SimilarityMetric {
  readonly name = 'dice';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const setA = tokenizeToSet(original.normalizedContent);
    const setB = tokenizeToSet(deobfuscated.normalizedContent);

    if (setA.size === 0 && setB.size === 0) {
      return { metricName: this.name, score: 1.0 };
    }

    let intersection = 0;
    const smaller = setA.size <= setB.size ? setA : setB;
    const larger = setA.size <= setB.size ? setB : setA;

    for (const token of smaller) {
      if (larger.has(token)) {
        intersection++;
      }
    }

    const score = (2 * intersection) / (setA.size + setB.size);

    return {
      metricName: this.name,
      score,
      details: { intersection, totalTokens: setA.size + setB.size },
    };
  }
}
