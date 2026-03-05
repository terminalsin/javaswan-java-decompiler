import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';

let Parser: any;
let Java: any;
let treeSitterAvailable = false;

try {
  Parser = require('tree-sitter');
  Java = require('tree-sitter-java');
  treeSitterAvailable = true;
} catch {
  // tree-sitter not available; this metric will gracefully degrade
}

export class ASTSimilarity implements SimilarityMetric {
  readonly name = 'ast-similarity';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult | null {
    if (!treeSitterAvailable) {
      return null;
    }

    try {
      const parser = new Parser();
      parser.setLanguage(Java);

      const treeA = parser.parse(original.normalizedContent);
      const treeB = parser.parse(deobfuscated.normalizedContent);

      const histA = nodeHistogram(treeA.rootNode);
      const histB = nodeHistogram(treeB.rootNode);
      const histCosine = histogramCosine(histA, histB);

      const bigramsA = parentChildBigrams(treeA.rootNode);
      const bigramsB = parentChildBigrams(treeB.rootNode);
      const bigramJaccard = setJaccard(bigramsA, bigramsB);

      const depthA = depthProfile(treeA.rootNode);
      const depthB = depthProfile(treeB.rootNode);
      const depthCorr = profileCorrelation(depthA, depthB);

      const score = 0.4 * histCosine + 0.4 * bigramJaccard + 0.2 * depthCorr;

      return {
        metricName: this.name,
        score: Math.max(0, Math.min(1, score)),
        details: {
          astNodeHistogramCosine: histCosine,
          astBigramJaccard: bigramJaccard,
          astDepthProfileCorrelation: depthCorr,
          nodeCountA: treeA.rootNode.descendantCount,
          nodeCountB: treeB.rootNode.descendantCount,
        },
      };
    } catch {
      return null;
    }
  }
}

function nodeHistogram(node: any): Map<string, number> {
  const hist = new Map<string, number>();
  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    const type = cursor.currentNode.type;
    hist.set(type, (hist.get(type) ?? 0) + 1);

    if (cursor.gotoFirstChild()) continue;
    if (cursor.gotoNextSibling()) continue;

    while (true) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
      if (cursor.gotoNextSibling()) break;
    }
  }

  return hist;
}

function histogramCosine(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const key of keys) {
    const va = a.get(key) ?? 0;
    const vb = b.get(key) ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
}

function parentChildBigrams(node: any): Set<string> {
  const bigrams = new Set<string>();
  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    const current = cursor.currentNode;
    for (let i = 0; i < current.childCount; i++) {
      bigrams.add(`${current.type}->${current.child(i).type}`);
    }

    if (cursor.gotoFirstChild()) continue;
    if (cursor.gotoNextSibling()) continue;

    while (true) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
      if (cursor.gotoNextSibling()) break;
    }
  }

  return bigrams;
}

function setJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;

  for (const item of smaller) {
    if (larger.has(item)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function depthProfile(node: any): number[] {
  const depths: number[] = [];
  collectDepths(node, 0, depths);

  // Create a histogram of depths
  const maxDepth = Math.max(...depths, 0);
  const profile = new Array(maxDepth + 1).fill(0);
  for (const d of depths) {
    profile[d]++;
  }
  return profile;
}

function collectDepths(node: any, depth: number, depths: number[]): void {
  depths.push(depth);
  for (let i = 0; i < node.childCount; i++) {
    collectDepths(node.child(i), depth + 1, depths);
  }
}

function profileCorrelation(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Pad to equal length
  const pa = [...a, ...new Array(maxLen - a.length).fill(0)];
  const pb = [...b, ...new Array(maxLen - b.length).fill(0)];

  // Pearson correlation
  const n = pa.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += pa[i];
    sumB += pb[i];
    sumAB += pa[i] * pb[i];
    sumA2 += pa[i] * pa[i];
    sumB2 += pb[i] * pb[i];
  }

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  if (denominator === 0) return 1;
  // Map from [-1, 1] to [0, 1]
  return (numerator / denominator + 1) / 2;
}
