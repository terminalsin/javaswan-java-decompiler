export type AIPostProcessErrorCode =
  | 'CONNECTION_FAILED'
  | 'AGENT_TIMEOUT'
  | 'SESSION_ERROR'
  | 'PROVIDER_ERROR';

export class AIPostProcessError extends Error {
  readonly code: AIPostProcessErrorCode;
  readonly cause?: unknown;

  constructor(code: AIPostProcessErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AIPostProcessError';
    this.code = code;
    this.cause = options?.cause;
  }
}
