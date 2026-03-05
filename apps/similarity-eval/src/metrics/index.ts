import type { SimilarityMetric } from './SimilarityMetric.js';
import { JaccardSimilarity } from './text/JaccardSimilarity.js';
import { CosineSimilarity } from './text/CosineSimilarity.js';
import { DiceCoefficient } from './text/DiceCoefficient.js';
import { NormalizedLevenshtein } from './sequence/NormalizedLevenshtein.js';
import { LCSRatio } from './sequence/LCSRatio.js';
import { LineDiffStats } from './sequence/LineDiffStats.js';
import { NormalizedCompressionDistance } from './compression/NCD.js';
import { ASTSimilarity } from './structural/ASTSimilarity.js';
import { ControlFlowStructure } from './structural/ControlFlowStructure.js';

export function createAllMetrics(): SimilarityMetric[] {
  return [
    new JaccardSimilarity(),
    new CosineSimilarity(),
    new DiceCoefficient(),
    new NormalizedLevenshtein(),
    new LCSRatio(),
    new LineDiffStats(),
    new NormalizedCompressionDistance(),
    new ASTSimilarity(),
    new ControlFlowStructure(),
  ];
}

export type { SimilarityMetric } from './SimilarityMetric.js';
