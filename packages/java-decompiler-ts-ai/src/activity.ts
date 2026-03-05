/**
 * Activity events emitted during decompilation and AI post-processing.
 * Used by display layers (StreamingDisplay, TuiApp) to show real-time progress.
 */
export type AgentActivity =
  | { type: 'decompile_start'; fileCount?: number }
  | { type: 'decompile_complete'; fileCount: number; durationMs: number }
  | { type: 'workspace_created'; path: string }
  | { type: 'ai_start'; sessionId: string; fileCount: number; agentTimeout?: number }
  | { type: 'tool_start'; tool: string; callId: string; input: Record<string, unknown> }
  | { type: 'tool_complete'; tool: string; callId: string; durationMs: number; title?: string }
  | { type: 'tool_error'; tool: string; callId: string; error: string }
  | { type: 'file_edited'; file: string }
  | { type: 'file_done'; file: string }
  | { type: 'agent_text'; text: string }
  | { type: 'step_complete'; cost: number; tokens: { input: number; output: number; reasoning: number } }
  | { type: 'session_complete'; sessionId: string }
  | { type: 'session_error'; sessionId: string; error: string };

export type OnActivity = (activity: AgentActivity) => void;

/**
 * Stateful mapper that converts OpenCode SDK events into AgentActivity values.
 * Tracks tool start times to compute durations on completion.
 */
export class ActivityMapper {
  private readonly sessionId: string;
  private readonly toolStartTimes = new Map<string, number>();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Maps a raw OpenCode SDK event to zero or more AgentActivity values.
   */
  map(event: any): AgentActivity[] {
    const eventType: string | undefined = event?.type;
    const eventSessionId: string | undefined =
      event?.properties?.sessionID ?? event?.properties?.part?.sessionID;

    // Only process events for our session
    if (eventSessionId && eventSessionId !== this.sessionId) return [];

    if (eventType === 'message.part.updated') {
      return this.mapPartUpdated(event.properties);
    }

    if (eventType === 'file.edited') {
      const file: string = event.properties?.file ?? '';
      return file ? [{ type: 'file_edited', file }] : [];
    }

    if (eventType === 'session.status') {
      // session.status events tell us when agent is busy/idle/retrying
      const status = event.properties?.status;
      if (status?.type === 'idle') {
        return [{ type: 'session_complete', sessionId: this.sessionId }];
      }
      return [];
    }

    if (eventType === 'session.idle') {
      return [{ type: 'session_complete', sessionId: this.sessionId }];
    }

    if (eventType === 'session.error') {
      const error = event.properties?.error;
      return [{
        type: 'session_error',
        sessionId: this.sessionId,
        error: typeof error === 'string' ? error : JSON.stringify(error ?? 'Unknown error'),
      }];
    }

    return [];
  }

  private mapPartUpdated(properties: any): AgentActivity[] {
    const part = properties?.part;
    if (!part) return [];

    const partType: string = part.type;

    if (partType === 'tool') {
      return this.mapToolPart(part);
    }

    if (partType === 'text') {
      const delta: string | undefined = properties.delta;
      if (delta) {
        return [{ type: 'agent_text', text: delta }];
      }
      return [];
    }

    if (partType === 'step-finish') {
      return [{
        type: 'step_complete',
        cost: part.cost ?? 0,
        tokens: {
          input: part.tokens?.input ?? 0,
          output: part.tokens?.output ?? 0,
          reasoning: part.tokens?.reasoning ?? 0,
        },
      }];
    }

    return [];
  }

  private mapToolPart(part: any): AgentActivity[] {
    const state = part.state;
    if (!state) return [];

    const tool: string = part.tool ?? 'unknown';
    const callId: string = part.callID ?? part.id ?? '';
    const status: string = state.status;

    if (status === 'running') {
      this.toolStartTimes.set(callId, state.time?.start ?? Date.now());
      const activities: AgentActivity[] = [{
        type: 'tool_start',
        tool,
        callId,
        input: state.input ?? {},
      }];

      // Detect file_done MCP tool call (tool name may be prefixed by MCP server name)
      if (tool.endsWith('file_done') || tool === 'file_done') {
        const file: string = state.input?.file ?? '';
        if (file) {
          activities.push({ type: 'file_done', file });
        }
      }

      return activities;
    }

    if (status === 'completed') {
      const startTime = this.toolStartTimes.get(callId);
      const durationMs = startTime != null
        ? (state.time?.end ?? Date.now()) - startTime
        : 0;
      this.toolStartTimes.delete(callId);
      return [{
        type: 'tool_complete',
        tool,
        callId,
        durationMs,
        title: state.title,
      }];
    }

    if (status === 'error') {
      this.toolStartTimes.delete(callId);
      return [{
        type: 'tool_error',
        tool,
        callId,
        error: state.error ?? 'Unknown tool error',
      }];
    }

    return [];
  }
}
