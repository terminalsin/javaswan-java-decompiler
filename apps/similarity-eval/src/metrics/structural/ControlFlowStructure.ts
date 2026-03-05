import type { SimilarityMetric } from '../SimilarityMetric.js';
import type { MetricResult, SourceFile } from '../../types.js';

const CONTROL_FLOW_KEYWORDS = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
  'try', 'catch', 'finally', 'return', 'throw', 'break', 'continue',
];

const CF_KEYWORD_PATTERN = new RegExp(
  `\\b(${CONTROL_FLOW_KEYWORDS.join('|')})\\b`,
  'g',
);

const METHOD_SIGNATURE_PATTERN =
  /(?:public|private|protected|static|final|abstract|synchronized|native|\s)+\s+[\w<>\[\],\s]+\s+(\w+)\s*\([^)]*\)/g;

export class ControlFlowStructure implements SimilarityMetric {
  readonly name = 'control-flow';

  compute(original: SourceFile, deobfuscated: SourceFile): MetricResult {
    const cfA = extractControlFlowKeywords(original.normalizedContent);
    const cfB = extractControlFlowKeywords(deobfuscated.normalizedContent);
    const cfLCS = lcsRatio(cfA, cfB);

    const depthA = nestingDepthProfile(original.normalizedContent);
    const depthB = nestingDepthProfile(deobfuscated.normalizedContent);
    const depthCorr = pearsonSimilarity(depthA, depthB);

    const sigsA = extractMethodSignatures(original.normalizedContent);
    const sigsB = extractMethodSignatures(deobfuscated.normalizedContent);
    const sigJaccard = setJaccard(sigsA, sigsB);

    const score = 0.4 * cfLCS + 0.3 * depthCorr + 0.3 * sigJaccard;

    return {
      metricName: this.name,
      score: Math.max(0, Math.min(1, score)),
      details: {
        controlFlowKeywordLCS: cfLCS,
        nestingDepthCorrelation: depthCorr,
        methodSignatureJaccard: sigJaccard,
        cfKeywordsA: cfA.length,
        cfKeywordsB: cfB.length,
        methodsA: sigsA.size,
        methodsB: sigsB.size,
      },
    };
  }
}

function extractControlFlowKeywords(source: string): string[] {
  return Array.from(source.matchAll(CF_KEYWORD_PATTERN), (m) => m[1]);
}

function nestingDepthProfile(source: string): number[] {
  const lines = source.split('\n');
  const profile: number[] = [];
  let depth = 0;

  for (const line of lines) {
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth = Math.max(0, depth - 1);
    }
    profile.push(depth);
  }

  return profile;
}

function extractMethodSignatures(source: string): Set<string> {
  const sigs = new Set<string>();
  for (const match of source.matchAll(METHOD_SIGNATURE_PATTERN)) {
    if (match[1]) {
      sigs.add(match[1]);
    }
  }
  return sigs;
}

function lcsRatio(a: string[], b: string[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Single-row DP for LCS length
  const shortArr = a.length <= b.length ? a : b;
  const longArr = a.length <= b.length ? b : a;

  let prev = new Array(shortArr.length + 1).fill(0);
  let curr = new Array(shortArr.length + 1).fill(0);

  for (let i = 1; i <= longArr.length; i++) {
    for (let j = 1; j <= shortArr.length; j++) {
      if (longArr[i - 1] === shortArr[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[shortArr.length] / maxLen;
}

function pearsonSimilarity(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const pa = [...a, ...new Array(Math.max(0, maxLen - a.length)).fill(0)];
  const pb = [...b, ...new Array(Math.max(0, maxLen - b.length)).fill(0)];

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
  return (numerator / denominator + 1) / 2;
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
