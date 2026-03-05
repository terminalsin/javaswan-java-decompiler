import React, { useSyncExternalStore, useEffect, useReducer } from 'react';
import { render, Box, Text } from 'ink';
import type { AgentActivity, OnActivity } from '../activity';

// ─── Activity Store ───────────────────────────────────────────────

interface FileStatus {
  name: string;
  edited: boolean;
  done: boolean;
}

interface ActivityLogEntry {
  time: Date;
  text: string;
  color?: string;
}

interface TuiState {
  phase: 'idle' | 'decompiling' | 'ai_processing' | 'complete' | 'error';
  sessionId: string;
  totalFiles: number;
  agentTimeout: number;
  files: Map<string, FileStatus>;
  log: ActivityLogEntry[];
  currentFile: string;
  stats: {
    tokensIn: number;
    tokensOut: number;
    tokensReasoning: number;
    cost: number;
    toolCalls: number;
    filesEdited: number;
    filesDone: number;
    startTime: number;
    /** Timestamps of each file-done signal for throughput calculation */
    doneTimestamps: number[];
  };
  errorMessage?: string;
}

function createInitialState(): TuiState {
  return {
    phase: 'idle',
    sessionId: '',
    totalFiles: 0,
    agentTimeout: 0,
    files: new Map(),
    log: [],
    currentFile: '',
    stats: {
      tokensIn: 0,
      tokensOut: 0,
      tokensReasoning: 0,
      cost: 0,
      toolCalls: 0,
      filesEdited: 0,
      filesDone: 0,
      startTime: Date.now(),
      doneTimestamps: [],
    },
  };
}

class ActivityStore {
  private state: TuiState = createInitialState();
  private listeners = new Set<() => void>();

  getSnapshot = (): TuiState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(partial: Partial<TuiState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener();
  }

  private addLog(text: string, color?: string): void {
    const log = [...this.state.log, { time: new Date(), text, color }];
    // Keep last 50 entries
    this.update({ log: log.slice(-50) });
  }

  onActivity(activity: AgentActivity): void {
    switch (activity.type) {
      case 'decompile_start':
        this.update({ phase: 'decompiling', ...(activity.fileCount != null ? { totalFiles: activity.fileCount } : {}) });
        this.addLog(activity.fileCount != null
          ? `Decompiling ${activity.fileCount} class(es)...`
          : 'Decompiling...');
        break;

      case 'decompile_complete':
        this.addLog(`Decompiled ${activity.fileCount} class(es) in ${formatMs(activity.durationMs)}`, 'green');
        break;

      case 'workspace_created':
        this.addLog(`Workspace: ${activity.path}`, 'dim');
        break;

      case 'ai_start': {
        this.update({
          phase: 'ai_processing',
          sessionId: activity.sessionId,
          totalFiles: activity.fileCount,
          agentTimeout: activity.agentTimeout ?? 0,
          stats: { ...this.state.stats, startTime: Date.now() },
        });
        this.addLog(`AI cleanup started (${activity.fileCount} files)`, 'cyan');
        break;
      }

      case 'tool_start': {
        const inputSummary = summarizeInput(activity.tool, activity.input);
        let currentFile = this.state.currentFile;
        if ((activity.tool === 'read' || activity.tool === 'edit' || activity.tool === 'write') && inputSummary) {
          currentFile = inputSummary.trim();
        }
        this.update({
          currentFile,
          stats: { ...this.state.stats, toolCalls: this.state.stats.toolCalls + 1 },
        });
        this.addLog(`→ ${activity.tool}${inputSummary}`);
        break;
      }

      case 'tool_complete':
        this.addLog(`✓ ${activity.tool} (${formatMs(activity.durationMs)})`, 'green');
        break;

      case 'tool_error':
        this.addLog(`✗ ${activity.tool}: ${activity.error}`, 'red');
        break;

      case 'file_edited': {
        const files = new Map(this.state.files);
        const existing = files.get(activity.file);
        files.set(activity.file, { name: activity.file, edited: true, done: existing?.done ?? false });
        const filesEdited = Array.from(files.values()).filter(f => f.edited).length;
        this.update({ files, stats: { ...this.state.stats, filesEdited } });
        this.addLog(`✎ ${activity.file}`, 'yellow');
        break;
      }

      case 'file_done': {
        const files = new Map(this.state.files);
        const existing = files.get(activity.file);
        const wasDone = existing?.done === true;
        files.set(activity.file, { name: activity.file, edited: existing?.edited ?? false, done: true });
        const filesDone = Array.from(files.values()).filter(f => f.done).length;
        const doneTimestamps = wasDone
          ? this.state.stats.doneTimestamps
          : [...this.state.stats.doneTimestamps, Date.now()];
        this.update({ files, stats: { ...this.state.stats, filesDone, doneTimestamps } });
        const status = existing?.edited ? 'edited' : 'no changes';
        this.addLog(`✓ ${activity.file} (${status})`, 'green');
        break;
      }

      case 'agent_text': {
        const trimmed = activity.text.trim();
        if (trimmed.length > 0) {
          const line = trimmed.split('\n')[0]!;
          this.addLog(line.length > 80 ? line.slice(0, 77) + '...' : line, 'dim');
        }
        break;
      }

      case 'step_complete':
        this.update({
          stats: {
            ...this.state.stats,
            tokensIn: this.state.stats.tokensIn + activity.tokens.input,
            tokensOut: this.state.stats.tokensOut + activity.tokens.output,
            tokensReasoning: this.state.stats.tokensReasoning + activity.tokens.reasoning,
            cost: this.state.stats.cost + activity.cost,
          },
        });
        break;

      case 'session_complete':
        this.update({ phase: 'complete' });
        this.addLog('AI cleanup complete', 'green');
        break;

      case 'session_error':
        this.update({ phase: 'error', errorMessage: activity.error });
        this.addLog(`Error: ${activity.error}`, 'red');
        break;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function summarizeInput(tool: string, input: Record<string, unknown>): string {
  if (tool === 'read' || tool === 'write' || tool === 'edit') {
    const p = input.file_path ?? input.filePath ?? input.path;
    if (typeof p === 'string') {
      const parts = p.split('/');
      return ` ${parts[parts.length - 1]}`;
    }
  }
  if (tool === 'bash') {
    const cmd = input.command;
    if (typeof cmd === 'string') return ` ${cmd.length > 40 ? cmd.slice(0, 37) + '...' : cmd}`;
  }
  return '';
}

// ─── ETA / Progress Helpers ────────────────────────────────────────

function formatEtaMs(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.ceil((ms % 60_000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function computeEta(state: TuiState): string | null {
  const { filesDone, startTime } = state.stats;
  if (state.totalFiles <= 0 || filesDone <= 0) return null;
  if (filesDone >= state.totalFiles) return null;

  const elapsed = Date.now() - startTime;
  const msPerFile = elapsed / filesDone;
  const remaining = (state.totalFiles - filesDone) * msPerFile;
  return formatEtaMs(remaining);
}

function progressBarText(current: number, total: number, width: number = 24): string {
  if (total <= 0) return '';
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ─── Components ───────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold color="white">{title}</Text>
      {children}
    </Box>
  );
}

function StatusBar({ state }: { state: TuiState }) {
  const phaseColors: Record<string, string> = {
    idle: 'gray',
    decompiling: 'blue',
    ai_processing: 'cyan',
    complete: 'green',
    error: 'red',
  };
  const phaseLabels: Record<string, string> = {
    idle: 'Idle',
    decompiling: 'Decompiling',
    ai_processing: 'AI Processing',
    complete: 'Complete',
    error: 'Error',
  };

  const color = phaseColors[state.phase] ?? 'white';
  const label = phaseLabels[state.phase] ?? state.phase;
  const { filesDone, filesEdited } = state.stats;
  const pct = state.totalFiles > 0 ? Math.round((filesDone / state.totalFiles) * 100) : 0;
  const eta = computeEta(state);

  return (
    <Panel title="Status">
      <Box gap={2}>
        <Text color={color}>● {label}</Text>
        {state.sessionId && <Text dimColor>session: {state.sessionId.slice(0, 8)}</Text>}
        {state.currentFile && <Text dimColor>→ {state.currentFile}</Text>}
      </Box>
      {state.totalFiles > 0 && state.phase === 'ai_processing' && (
        <Box gap={1}>
          <Text color="green">{progressBarText(filesDone, state.totalFiles)}</Text>
          <Text bold>{pct}%</Text>
          <Text dimColor>({filesDone}/{state.totalFiles} files, {filesEdited} edited)</Text>
          {eta && <Text color="yellow">ETA: {eta}</Text>}
          {filesDone === 0 && state.stats.startTime > 0 && (
            <Text dimColor>estimating...</Text>
          )}
        </Box>
      )}
      {state.phase === 'complete' && state.totalFiles > 0 && (
        <Box gap={1}>
          <Text color="green">{progressBarText(state.totalFiles, state.totalFiles)}</Text>
          <Text bold color="green">100%</Text>
          <Text dimColor>({filesDone}/{state.totalFiles} processed, {filesEdited} edited)</Text>
        </Box>
      )}
    </Panel>
  );
}

function FileList({ state }: { state: TuiState }) {
  const files = Array.from(state.files.values());
  if (files.length === 0) return null;

  return (
    <Panel title="Files">
      {files.slice(-10).map((file) => {
        let icon: string;
        let color: string;
        if (file.done && file.edited) { icon = '✓'; color = 'green'; }
        else if (file.done) { icon = '–'; color = 'gray'; }
        else if (file.edited) { icon = '✎'; color = 'yellow'; }
        else { icon = '…'; color = 'gray'; }
        return (
          <Box key={file.name}>
            <Text color={color}>{icon} {file.name}</Text>
          </Box>
        );
      })}
      {files.length > 10 && <Text dimColor>  ... and {files.length - 10} more</Text>}
    </Panel>
  );
}

function ActivityLog({ state }: { state: TuiState }) {
  const entries = state.log.slice(-15);

  return (
    <Panel title="Activity">
      {entries.length === 0 ? (
        <Text dimColor>Waiting for activity...</Text>
      ) : (
        entries.map((entry, i) => {
          const timeStr = entry.time.toLocaleTimeString('en-US', { hour12: false });
          return (
            <Box key={i}>
              <Text dimColor>[{timeStr}] </Text>
              <Text color={entry.color as any}>{entry.text}</Text>
            </Box>
          );
        })
      )}
    </Panel>
  );
}

function StatsBar({ state }: { state: TuiState }) {
  const { stats } = state;
  const elapsedMs = Date.now() - stats.startTime;
  const elapsed = formatEtaMs(elapsedMs);
  const totalTokens = stats.tokensIn + stats.tokensOut;
  const eta = computeEta(state);

  // Throughput: avg seconds per file done
  const avgPerFile = stats.filesDone > 0
    ? `${(elapsedMs / stats.filesDone / 1000).toFixed(1)}s/file`
    : null;

  // Timeout countdown
  const timeoutMs = state.agentTimeout;
  const timeoutRemaining = timeoutMs > 0 ? Math.max(timeoutMs - elapsedMs, 0) : 0;
  const timeoutRatio = timeoutMs > 0 ? timeoutRemaining / timeoutMs : 1;
  const timeoutColor = timeoutRatio > 0.5 ? 'green' : timeoutRatio > 0.2 ? 'yellow' : 'red';

  return (
    <Panel title="Stats">
      <Box gap={2} flexWrap="wrap">
        <Text>Tokens: <Text bold>{totalTokens.toLocaleString()}</Text> ({stats.tokensIn.toLocaleString()} in / {stats.tokensOut.toLocaleString()} out)</Text>
        {stats.cost > 0 && <Text>Cost: <Text bold>${stats.cost.toFixed(4)}</Text></Text>}
      </Box>
      <Box gap={2} flexWrap="wrap">
        <Text>Tools: <Text bold>{stats.toolCalls}</Text></Text>
        <Text>Done: <Text bold>{stats.filesDone}</Text>{state.totalFiles > 0 ? `/${state.totalFiles}` : ''} ({stats.filesEdited} edited)</Text>
        <Text>Elapsed: <Text bold>{elapsed}</Text></Text>
        {avgPerFile && <Text>Speed: <Text bold>{avgPerFile}</Text></Text>}
        {eta && <Text>ETA: <Text bold color="yellow">{eta}</Text></Text>}
      </Box>
      {timeoutMs > 0 && state.phase === 'ai_processing' && (
        <Box gap={1}>
          <Text>Timeout: </Text>
          <Text bold color={timeoutColor as any}>{formatEtaMs(timeoutRemaining)}</Text>
          <Text dimColor> remaining of {formatEtaMs(timeoutMs)}</Text>
        </Box>
      )}
    </Panel>
  );
}

function App({ store }: { store: ActivityStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  // Force re-render every second to update elapsed time and ETA
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box flexDirection="column">
      <StatusBar state={state} />
      <FileList state={state} />
      <ActivityLog state={state} />
      <StatsBar state={state} />
    </Box>
  );
}

// ─── Public API ───────────────────────────────────────────────────

export interface TuiDisplay {
  onActivity: OnActivity;
  cleanup: () => void;
}

export function createTuiDisplay(): TuiDisplay {
  const store = new ActivityStore();
  const instance = render(<App store={store} />);

  return {
    onActivity: (activity) => store.onActivity(activity),
    cleanup: () => instance.unmount(),
  };
}
