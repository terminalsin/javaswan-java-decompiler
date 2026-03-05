export interface SourceFile {
  path: string;
  label: string;
  rawContent: string;
  normalizedContent: string;
}

export interface MetricResult {
  metricName: string;
  /** Similarity score in [0.0, 1.0] where 1.0 = identical */
  score: number;
  details?: Record<string, unknown>;
}

export interface FileEvaluation {
  deobfuscatedFile: SourceFile;
  originalFile: SourceFile;
  metrics: MetricResult[];
  compositeScore: number;
}

export interface EvaluationReport {
  timestamp: string;
  originalFile: SourceFile;
  evaluations: FileEvaluation[];
  statistics: StatisticalSummary;
}

export interface MetricStats {
  mean: number;
  median: number;
  stddev: number;
  min: number;
  max: number;
}

export interface StatisticalSummary {
  perMetric: Record<string, MetricStats>;
  composite: MetricStats;
}

export interface DirectoryEvaluation {
  label: string;
  dirPath: string;
  fileEvaluations: FileEvaluation[];
  unmatchedOriginals: string[];
  unmatchedDeobfuscated: string[];
  aggregateComposite: number;
  aggregateMetrics: Record<string, number>;
  matchRate: number;
}

export interface DirectoryReport {
  timestamp: string;
  originalDir: string;
  directoryEvaluations: DirectoryEvaluation[];
  statistics: StatisticalSummary;
}
