import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';
import { tokenizeToFrequencyMap } from '../../tokenizer/JavaTokenizer.js';

export class CosineSimilarity implements SimilarityMetric {
  readonly name = 'cosine';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const freqA = tokenizeToFrequencyMap(original.normalizedContent);
    const freqB = tokenizeToFrequencyMap(deobfuscated.normalizedContent);

    if (freqA.size === 0 && freqB.size === 0) {
      return { metricName: this.name, score: 1.0 };
    }
    if (freqA.size === 0 || freqB.size === 0) {
      return { metricName: this.name, score: 0.0 };
    }

    // Cosine similarity on raw term-frequency vectors
    const vocab = new Set([...freqA.keys(), ...freqB.keys()]);

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (const term of vocab) {
      const a = freqA.get(term) ?? 0;
      const b = freqB.get(term) ?? 0;
      dotProduct += a * b;
      magA += a * a;
      magB += b * b;
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    const score = magA === 0 || magB === 0 ? 0 : dotProduct / (magA * magB);

    return {
      metricName: this.name,
      score: Math.max(0, Math.min(1, score)),
      details: { vocabularySize: vocab.size },
    };
  }
}
