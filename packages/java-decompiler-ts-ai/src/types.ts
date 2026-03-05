import type { JavaDecompilerOptions } from '@blkswn/java-decompiler';
import type { OnActivity } from './activity';

export interface OpenCodeConnectionOptions {
  /** Base URL for the running OpenCode server. Default: "http://localhost:4096" */
  readonly baseUrl?: string;
  /** Request timeout in ms for individual API calls. Default: 120_000 */
  readonly timeout?: number;
  /** Maximum retry count for transient failures. Default: 2 */
  readonly maxRetries?: number;
}

export interface AIModelSelection {
  /** Provider ID (e.g. "anthropic", "openai"). Default: "anthropic" */
  readonly providerID?: string;
  /** Model ID within the provider. Default: "claude-sonnet-4-20250514" */
  readonly modelID?: string;
}

export interface AIPostProcessorOptions {
  /** OpenCode server connection configuration. */
  readonly connection?: OpenCodeConnectionOptions;
  /** Which model to use for the cleanup agent. */
  readonly model?: AIModelSelection;
  /** Custom system prompt replacing the default entirely. */
  readonly systemPrompt?: string;
  /** Additional instructions appended to the default prompt. Ignored if systemPrompt is set. */
  readonly additionalInstructions?: string;
  /** Working directory for temporary file operations. Defaults to os.tmpdir() subdir. */
  readonly workspaceDir?: string;
  /** Whether to clean up the workspace directory after processing. Default: true */
  readonly cleanupWorkspace?: boolean;
  /** Maximum time in ms to wait for the AI agent to complete. Default: 300_000 */
  readonly agentTimeout?: number;
  /** Callback invoked with real-time activity events during processing. */
  readonly onActivity?: OnActivity;
  /** Log raw OpenCode event stream to stderr for debugging. */
  readonly verbose?: boolean;
}

export interface AIPostProcessResult {
  /** Map of class internal name to improved Java source code. */
  readonly sources: Map<string, string>;
  /** The OpenCode session ID used (for debugging/inspection). */
  readonly sessionId: string;
  /** Path to workspace directory (set if cleanupWorkspace is false). */
  readonly workspacePath?: string;
}

export interface AIJavaDecompilerOptions {
  /** Options passed to the underlying JavaDecompiler. */
  readonly decompilerOptions?: JavaDecompilerOptions;
  /** Options passed to the AI post-processor. */
  readonly aiOptions?: AIPostProcessorOptions;
}
