import type { AIPostProcessorOptions, AIPostProcessResult } from './types';
import {
  createWorkspace,
  writeSourceFiles,
  readSourceFiles,
  cleanupWorkspace,
  classNameToFilePath,
} from './WorkspaceManager';
import { runSession, checkHealth } from './SessionRunner';
import { buildSystemPrompt, buildUserMessage } from './prompt';

const DEFAULT_BASE_URL = 'http://localhost:4096';
const DEFAULT_PROVIDER_ID = 'openrouter-shortcut';
const DEFAULT_MODEL_ID = 'minimax/minimax-m2.5:nitro';
const DEFAULT_AGENT_TIMEOUT = 600_000;

export class AIPostProcessor {
  private readonly options: AIPostProcessorOptions;

  constructor(options?: AIPostProcessorOptions) {
    this.options = options ?? {};
  }

  /**
   * Post-processes a map of decompiled Java sources through an AI agent.
   *
   * @param sources Map of internal class name (e.g. "com/example/MyClass")
   *   to decompiled Java source code string.
   * @returns Improved sources with the same keys.
   */
  async postProcess(sources: Map<string, string>): Promise<AIPostProcessResult> {
    if (sources.size === 0) {
      return { sources: new Map(), sessionId: '' };
    }

    const shouldCleanup = this.options.cleanupWorkspace !== false;
    const emit = this.options.onActivity;

    // Stage 1: Create workspace and write files
    const workspaceDir = await createWorkspace(this.options.workspaceDir);
    emit?.({ type: 'workspace_created', path: workspaceDir });
    await writeSourceFiles(workspaceDir, sources);

    try {
      // Build prompt
      const systemPrompt = buildSystemPrompt({
        systemPrompt: this.options.systemPrompt,
        additionalInstructions: this.options.additionalInstructions,
      });

      const fileNames = Array.from(sources.keys()).map(classNameToFilePath);
      const userMessage = buildUserMessage(workspaceDir, fileNames);
      const agentTimeout = this.options.agentTimeout ?? DEFAULT_AGENT_TIMEOUT;

      // Stage 2: Run OpenCode session
      const { sessionId } = await runSession(systemPrompt, userMessage, {
        baseUrl: this.options.connection?.baseUrl ?? DEFAULT_BASE_URL,
        providerID: this.options.model?.providerID ?? DEFAULT_PROVIDER_ID,
        modelID: this.options.model?.modelID ?? DEFAULT_MODEL_ID,
        agentTimeout,
        onActivity: emit,
        verbose: this.options.verbose,
        totalFiles: sources.size,
        fileNames,
        onSessionCreated: (id) => {
          emit?.({ type: 'ai_start', sessionId: id, fileCount: sources.size, agentTimeout });
        },
      });

      // Stage 3: Read back modified files
      const improvedSources = await readSourceFiles(workspaceDir, sources);

      // Stage 4: Cleanup
      if (shouldCleanup) {
        await cleanupWorkspace(workspaceDir);
      }

      return {
        sources: improvedSources,
        sessionId,
        workspacePath: shouldCleanup ? undefined : workspaceDir,
      };
    } catch (err) {
      // Cleanup on error if configured
      if (shouldCleanup) {
        await cleanupWorkspace(workspaceDir).catch(() => { });
      }
      throw err;
    }
  }

  /**
   * Checks whether the OpenCode server is reachable.
   */
  async healthCheck(): Promise<boolean> {
    return checkHealth(this.options.connection?.baseUrl);
  }
}
