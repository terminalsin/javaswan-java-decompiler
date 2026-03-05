import chalk from 'chalk';
import type { AgentActivity, OnActivity } from '../activity';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatEta(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.ceil((ms % 60_000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function progressBar(current: number, total: number, width: number = 30): string {
  if (total <= 0) return '';
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const pct = Math.round(ratio * 100);
  return `${chalk.green('█'.repeat(filled))}${chalk.dim('░'.repeat(empty))} ${pct}%`;
}

function toolInputSummary(tool: string, input: Record<string, unknown>): string {
  if (tool === 'read' || tool === 'write' || tool === 'edit') {
    const filePath = input.file_path ?? input.filePath ?? input.path;
    if (typeof filePath === 'string') {
      const parts = filePath.split('/');
      return parts[parts.length - 1] ?? filePath;
    }
  }
  if (tool === 'bash') {
    const cmd = input.command;
    if (typeof cmd === 'string') {
      return cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd;
    }
  }
  if (tool === 'glob') {
    const pattern = input.pattern;
    if (typeof pattern === 'string') return pattern;
  }
  if (tool === 'grep') {
    const pattern = input.pattern;
    if (typeof pattern === 'string') return pattern;
  }
  return '';
}

function log(tag: string, color: (s: string) => string, message: string): void {
  const prefix = chalk.dim('[') + color(tag.padEnd(10)) + chalk.dim(']');
  process.stderr.write(`${prefix} ${message}\n`);
}

interface StreamingState {
  totalFiles: number;
  /** Files the agent has signalled as done (edited or skipped) */
  filesDone: number;
  doneSet: Set<string>;
  /** Files actually modified on disk */
  filesEdited: number;
  editedSet: Set<string>;
  aiStartTime: number;
  agentTimeout: number;
  currentFile: string;
  totalTokens: number;
  totalCost: number;
  toolCalls: number;
  lastProgressLine: number;
}

function printProgress(state: StreamingState): void {
  if (state.totalFiles <= 0 || state.aiStartTime <= 0) return;

  const elapsed = Date.now() - state.aiStartTime;
  const done = state.filesDone;
  const bar = progressBar(done, state.totalFiles);

  let etaPart = '';
  if (done > 0) {
    const msPerFile = elapsed / done;
    const remaining = (state.totalFiles - done) * msPerFile;
    etaPart = ` ETA: ${chalk.bold(formatEta(remaining))}`;
  } else if (elapsed > 5000) {
    etaPart = ` ETA: ${chalk.dim('estimating...')}`;
  }

  const filePart = state.currentFile ? ` ${chalk.dim('current:')} ${chalk.yellow(state.currentFile)}` : '';
  const speedPart = done > 0
    ? ` ${chalk.dim(`(${(elapsed / done / 1000).toFixed(1)}s/file)`)}`
    : '';
  const editPart = state.filesEdited > 0
    ? ` ${chalk.dim(`[${state.filesEdited} edited]`)}`
    : '';

  let timeoutPart = '';
  if (state.agentTimeout > 0) {
    const remaining = Math.max(state.agentTimeout - elapsed, 0);
    const ratio = remaining / state.agentTimeout;
    const colorFn = ratio > 0.5 ? chalk.green : ratio > 0.2 ? chalk.yellow : chalk.red;
    timeoutPart = ` ${chalk.dim('timeout:')} ${colorFn(formatEta(remaining))}`;
  }

  log('progress', chalk.green, `${bar} ${chalk.bold(`${done}/${state.totalFiles}`)} files${editPart}${etaPart}${speedPart}${timeoutPart}${filePart}`);
}

/**
 * Creates a streaming display that prints colorized activity lines to stderr.
 * Returns an OnActivity callback. Tracks state for progress/ETA display.
 */
export function createStreamingDisplay(): OnActivity {
  const state: StreamingState = {
    totalFiles: 0,
    filesDone: 0,
    doneSet: new Set(),
    filesEdited: 0,
    editedSet: new Set(),
    aiStartTime: 0,
    agentTimeout: 0,
    currentFile: '',
    totalTokens: 0,
    totalCost: 0,
    toolCalls: 0,
    lastProgressLine: 0,
  };

  return (activity: AgentActivity): void => {
    switch (activity.type) {
      case 'decompile_start':
        log('decompile', chalk.blue, activity.fileCount != null
          ? `Decompiling ${activity.fileCount} class(es)...`
          : 'Decompiling...');
        break;

      case 'decompile_complete':
        log('decompile', chalk.blue, chalk.green('✓') + ` Decompiled ${activity.fileCount} class(es) in ${formatDuration(activity.durationMs)}`);
        break;

      case 'workspace_created':
        log('workspace', chalk.magenta, `Created workspace at ${chalk.dim(activity.path)}`);
        break;

      case 'ai_start':
        state.totalFiles = activity.fileCount;
        state.aiStartTime = Date.now();
        state.agentTimeout = activity.agentTimeout ?? 0;
        log('ai', chalk.cyan, `Starting AI cleanup ${chalk.dim(`(session: ${activity.sessionId.slice(0, 8)}, ${activity.fileCount} files, timeout: ${state.agentTimeout > 0 ? formatEta(state.agentTimeout) : 'none'})`)}`);
        printProgress(state);
        break;

      case 'tool_start': {
        state.toolCalls++;
        const summary = toolInputSummary(activity.tool, activity.input);
        // Track current file being processed
        if ((activity.tool === 'read' || activity.tool === 'edit' || activity.tool === 'write') && summary) {
          state.currentFile = summary;
        }
        const detail = summary ? ` ${chalk.dim(summary)}` : '';
        log('tool', chalk.white, `→ ${chalk.bold(activity.tool)}${detail}`);
        break;
      }

      case 'tool_complete': {
        const title = activity.title ? ` ${chalk.dim(activity.title)}` : '';
        log('tool', chalk.white, chalk.green('✓') + ` ${activity.tool} completed ${chalk.dim(`(${formatDuration(activity.durationMs)})`)}${title}`);
        break;
      }

      case 'tool_error':
        log('tool', chalk.white, chalk.red('✗') + ` ${activity.tool} failed: ${chalk.red(activity.error)}`);
        break;

      case 'file_edited': {
        if (!state.editedSet.has(activity.file)) {
          state.editedSet.add(activity.file);
          state.filesEdited = state.editedSet.size;
        }
        log('file', chalk.yellow, `✎ Modified ${chalk.yellow(activity.file)}`);
        break;
      }

      case 'file_done': {
        if (!state.doneSet.has(activity.file)) {
          state.doneSet.add(activity.file);
          state.filesDone = state.doneSet.size;
        }
        const wasEdited = state.editedSet.has(activity.file);
        const status = wasEdited ? chalk.green('edited') : chalk.dim('no changes');
        log('done', chalk.green, `✓ ${activity.file} (${status})`);
        printProgress(state);
        break;
      }

      case 'agent_text': {
        const trimmed = activity.text.trim();
        if (trimmed.length > 0) {
          const line = trimmed.split('\n')[0]!;
          const display = line.length > 100 ? line.slice(0, 97) + '...' : line;
          log('agent', chalk.cyan, chalk.dim(display));
        }
        break;
      }

      case 'step_complete': {
        const stepTokens = activity.tokens.input + activity.tokens.output;
        state.totalTokens += stepTokens;
        state.totalCost += activity.cost;
        const cost = activity.cost > 0 ? ` $${activity.cost.toFixed(4)}` : '';
        const elapsed = state.aiStartTime > 0 ? ` ${chalk.dim(`(${formatDuration(Date.now() - state.aiStartTime)} elapsed)`)}` : '';
        log('step', chalk.gray, `${stepTokens.toLocaleString()} tokens${cost}${elapsed} — total: ${state.totalTokens.toLocaleString()} tokens, $${state.totalCost.toFixed(4)}`);

        // Print progress on each step if we haven't recently
        const now = Date.now();
        if (now - state.lastProgressLine > 3000) {
          state.lastProgressLine = now;
          printProgress(state);
        }
        break;
      }

      case 'session_complete': {
        const totalElapsed = state.aiStartTime > 0 ? Date.now() - state.aiStartTime : 0;
        const summary = [
          `${state.filesDone}/${state.totalFiles} files processed (${state.filesEdited} edited)`,
          `${state.toolCalls} tool calls`,
          `${state.totalTokens.toLocaleString()} tokens`,
        ];
        if (state.totalCost > 0) summary.push(`$${state.totalCost.toFixed(4)}`);
        if (totalElapsed > 0) summary.push(formatDuration(totalElapsed));

        log('ai', chalk.cyan, chalk.green('✓') + ` AI cleanup complete — ${summary.join(chalk.dim(' · '))}`);
        break;
      }

      case 'session_error':
        log('ai', chalk.cyan, chalk.red('✗') + ` AI error: ${chalk.red(activity.error)}`);
        break;
    }
  };
}
