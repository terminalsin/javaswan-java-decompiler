import { createOpencodeClient } from '@opencode-ai/sdk';
import { AIPostProcessError } from './errors';
import { ActivityMapper, type OnActivity } from './activity';
import { MCP_SERVER_NAME, writeMcpServerScript, cleanupMcpScript } from './fileDoneMcp';

export interface SessionRunnerOptions {
  readonly baseUrl?: string;
  readonly providerID: string;
  readonly modelID: string;
  readonly agentTimeout: number;
  readonly onActivity?: OnActivity;
  readonly onSessionCreated?: (sessionId: string) => void;
  readonly verbose?: boolean;
  /** Total number of files to process (passed to MCP tool for progress feedback). */
  readonly totalFiles?: number;
  /** Relative file names to process (passed to MCP tool for next-file suggestions). */
  readonly fileNames?: string[];
}

export interface SessionRunResult {
  readonly sessionId: string;
}

/**
 * Creates an OpenCode session, sends a prompt, and waits for the agent to finish.
 */
export async function runSession(
  systemPrompt: string,
  userMessage: string,
  options: SessionRunnerOptions,
): Promise<SessionRunResult> {
  const baseUrl = options.baseUrl ?? 'http://localhost:4096';
  const client = createOpencodeClient({ baseUrl });

  // Create session
  let sessionId: string;
  try {
    const { data: session } = await client.session.create({
      body: { title: 'java-decompiler-ai cleanup' },
    });
    sessionId = session!.id;
    options.onSessionCreated?.(sessionId);
  } catch (err) {
    throw new AIPostProcessError(
      'CONNECTION_FAILED',
      `Failed to connect to OpenCode server at ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  // Register the file_done MCP tool so the agent can signal per-file progress.
  // MCP tools don't appear in tool.ids()/tool.list(), so we don't restrict the
  // session's tool set — the agent gets access to all available tools including MCP.
  let mcpScriptPath: string | undefined;
  let mcpConnected = false;
  try {
    const mcpInfo = writeMcpServerScript(options.totalFiles, options.fileNames);
    mcpScriptPath = mcpInfo.scriptPath;
    if (options.verbose) {
      process.stderr.write(`[verbose] MCP script written to: ${mcpScriptPath}\n`);
    }
    const addResult = await client.mcp.add({
      body: {
        name: MCP_SERVER_NAME,
        config: {
          type: 'local' as const,
          command: ['node', mcpScriptPath],
          environment: mcpInfo.environment,
          enabled: true,
        },
      },
    });
    const serverStatus = addResult.data?.[MCP_SERVER_NAME];
    mcpConnected = serverStatus != null && 'status' in serverStatus && serverStatus.status === 'connected';
    if (options.verbose) {
      process.stderr.write(`[verbose] MCP server registered: ${JSON.stringify(serverStatus)}\n`);
    }
    if (!mcpConnected) {
      // Server wasn't auto-connected by add(), try explicit connect
      await client.mcp.connect({ path: { name: MCP_SERVER_NAME } });
      mcpConnected = true;
      if (options.verbose) {
        process.stderr.write(`[verbose] MCP server connected via explicit connect()\n`);
      }
    }
  } catch (err) {
    // Non-fatal: progress tracking will just lack per-file signals
    if (options.verbose) {
      process.stderr.write(`[verbose] MCP registration failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
    if (mcpScriptPath) cleanupMcpScript(mcpScriptPath);
    mcpScriptPath = undefined;
  }

  try {
    // Subscribe to events before sending the prompt so we don't miss completion
    const { stream } = await client.event.subscribe();

    // Inject file_done tool details if MCP server is connected.
    // The system prompt already references file_done in the process steps;
    // this section tells the agent the tool signature.
    let finalSystemPrompt = systemPrompt;
    if (mcpConnected) {
      finalSystemPrompt += `\n\n## file_done Tool\n\nThe \`file_done\` tool is available. It takes a single argument \`file\` (string) — the relative path of the file you just processed. You MUST call it after every file. It will respond with your progress and which files to process next.`;
    }

    // Build tool map — enable core built-in tools only.
    // MCP tools (file_done) are available automatically via the registered MCP server
    // and do NOT need to be listed here. Including unknown tool names causes silent failures.
    const tools: Record<string, boolean> = {
      read: true,
      edit: true,
      write: true,
      glob: true,
      grep: true,
      list: true,
      bash: true,
    };

    // Send the prompt asynchronously (fire-and-forget, returns 204 immediately).
    // session.prompt() blocks until the agent finishes — we need promptAsync()
    // so events flow through the stream while the agent works.
    if (options.verbose) {
      process.stderr.write(`[verbose] Sending prompt: provider=${options.providerID} model=${options.modelID} tools=${Object.keys(tools).join(',')}\n`);
    }
    const promptResult = await client.session.promptAsync({
      path: { id: sessionId },
      body: {
        model: {
          providerID: options.providerID,
          modelID: options.modelID,
        },
        system: finalSystemPrompt,
        parts: [{ type: 'text', text: userMessage }],
        tools,
      },
    });
    if (options.verbose) {
      process.stderr.write(`[verbose] promptAsync response: ${JSON.stringify(promptResult?.response?.status ?? 'unknown')}\n`);
    }

    // Brief delay then check session status for early errors
    if (options.verbose) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const statusResp = await client.session.status();
        process.stderr.write(`[verbose] All session statuses: ${JSON.stringify(statusResp.data)}\n`);
      } catch (err) {
        process.stderr.write(`[verbose] Session status check failed: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }

    // Wait for agent completion via event stream
    await waitForCompletion(client, stream, sessionId, options.agentTimeout, options.onActivity, options.verbose);

    return { sessionId };
  } catch (err) {
    // Try to abort the session on error
    try {
      await client.session.abort({ path: { id: sessionId } });
    } catch { /* ignore abort errors */ }

    if (err instanceof AIPostProcessError) throw err;
    throw new AIPostProcessError(
      'SESSION_ERROR',
      `OpenCode session error: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  } finally {
    // Cleanup MCP server registration
    if (mcpScriptPath) {
      client.mcp.disconnect({ path: { name: MCP_SERVER_NAME } }).catch(() => {});
      cleanupMcpScript(mcpScriptPath);
    }
  }
}

/**
 * Waits for the agent session to become idle by listening to the event stream.
 * Auto-approves tool permission requests so the agent can run unattended.
 */
async function waitForCompletion(
  client: ReturnType<typeof createOpencodeClient>,
  stream: AsyncGenerator<any>,
  sessionId: string,
  timeoutMs: number,
  onActivity?: OnActivity,
  verbose?: boolean,
): Promise<void> {
  const mapper = new ActivityMapper(sessionId);

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        stream.return(undefined).catch(() => {});
        reject(new AIPostProcessError('AGENT_TIMEOUT', `Agent did not complete within ${timeoutMs}ms`));
      }
    }, timeoutMs);

    (async () => {
      try {
        for await (const event of stream) {
          if (settled) break;

          // Log raw events when verbose mode is on
          if (verbose) {
            const eventType = event?.type ?? 'unknown';
            const eventSid = event?.properties?.sessionID ?? event?.properties?.part?.sessionID ?? '';
            const partType = event?.properties?.part?.type ?? '';
            const partStatus = event?.properties?.part?.state?.status ?? '';
            const detail = partType ? ` part=${partType}${partStatus ? ` status=${partStatus}` : ''}` : '';
            // Log session.status details (idle/busy/retry)
            let statusDetail = '';
            if (eventType === 'session.status') {
              const st = event?.properties?.status;
              statusDetail = ` status.type=${st?.type ?? 'unknown'}`;
              if (st?.type === 'retry') statusDetail += ` attempt=${st.attempt} msg=${st.message}`;
            }
            // Log permission events
            let permDetail = '';
            if (eventType === 'permission.asked' || eventType === 'permission.updated') {
              permDetail = ` perm=${event?.properties?.id ?? ''} title=${event?.properties?.title ?? ''}`;
            }
            process.stderr.write(`[verbose] event=${eventType} sid=${eventSid}${detail}${statusDetail}${permDetail}\n`);
          }

          // Emit activities for the display layer
          if (onActivity) {
            for (const activity of mapper.map(event)) {
              onActivity(activity);
            }
          }

          const eventType: string | undefined = event?.type;
          const eventSessionId: string | undefined = event?.properties?.sessionID;

          // Only process events for our session
          if (eventSessionId && eventSessionId !== sessionId) continue;

          // Auto-approve tool permission requests so the agent runs unattended
          if (eventType === 'permission.asked' || eventType === 'permission.updated') {
            const permissionId: string | undefined = event?.properties?.id;
            if (permissionId) {
              if (verbose) {
                const title = event?.properties?.title ?? '';
                process.stderr.write(`[verbose] auto-approving permission ${permissionId}: ${title}\n`);
              }
              client.postSessionIdPermissionsPermissionId({
                path: { id: sessionId, permissionID: permissionId },
                body: { response: 'always' },
              }).catch(() => { /* ignore approval errors */ });
            }
            continue;
          }

          // Handle session.status events — idle completes, retry with non-transient errors fails fast
          if (eventType === 'session.status') {
            const status = event?.properties?.status;
            if (status?.type === 'idle') {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                stream.return(undefined).catch(() => {});
                resolve();
              }
              break;
            }
            if (status?.type === 'retry') {
              const msg: string = status.message ?? '';
              // Non-transient errors: fail fast instead of waiting for timeout
              const nonTransient = /exceeded|invalid|unauthorized|forbidden|not found|disabled/i.test(msg);
              if (nonTransient) {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  stream.return(undefined).catch(() => {});
                  reject(new AIPostProcessError(
                    'PROVIDER_ERROR',
                    `Provider error (attempt ${status.attempt}): ${msg}`,
                  ));
                }
                break;
              }
            }
          }

          // Handle dedicated session.idle event
          if (eventType === 'session.idle') {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              stream.return(undefined).catch(() => {});
              resolve();
            }
            break;
          }

          if (eventType === 'session.error') {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              stream.return(undefined).catch(() => {});
              const errorInfo = event?.properties?.error;
              reject(
                new AIPostProcessError(
                  'SESSION_ERROR',
                  `Agent encountered an error: ${JSON.stringify(errorInfo ?? event)}`,
                ),
              );
            }
            break;
          }
        }

        // Stream ended without a completion event — treat as complete
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(
            new AIPostProcessError(
              'SESSION_ERROR',
              `Event stream error: ${err instanceof Error ? err.message : String(err)}`,
              { cause: err },
            ),
          );
        }
      }
    })();
  });
}

/**
 * Checks if the OpenCode server is reachable.
 */
export async function checkHealth(baseUrl?: string): Promise<boolean> {
  try {
    const client = createOpencodeClient({ baseUrl: baseUrl ?? 'http://localhost:4096' });
    await client.session.list();
    return true;
  } catch {
    return false;
  }
}
