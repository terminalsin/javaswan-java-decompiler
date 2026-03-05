import { writeFileSync, mkdtempSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Minimal MCP stdio server script that exposes a single `file_done` tool.
 * The agent calls this tool to signal it has finished processing a file.
 * The tool itself is a no-op — the signal comes from detecting the tool call
 * in the OpenCode event stream.
 */
const MCP_SERVER_SCRIPT = `
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, terminal: false });

const totalFiles = parseInt(process.env.TOTAL_FILES || "0", 10);
const fileList = (process.env.FILE_LIST || "").split("\\n").filter(Boolean);
const doneFiles = new Set();

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\\n");
}

rl.on("line", (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  if (msg.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "decompiler-progress", version: "1.0.0" },
      },
    });
  } else if (msg.method === "notifications/initialized") {
    // No response for notifications
  } else if (msg.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        tools: [
          {
            name: "file_done",
            description:
              "Signal that you have finished processing a file. Call this after you are done with each file, whether you edited it or decided no changes were needed.",
            inputSchema: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                  description: "Relative path of the file that was processed (e.g. com/example/MyClass.java)",
                },
              },
              required: ["file"],
            },
          },
        ],
      },
    });
  } else if (msg.method === "tools/call") {
    const file = msg.params?.arguments?.file ?? "unknown";
    doneFiles.add(file);
    const done = doneFiles.size;
    const remaining = totalFiles > 0 ? Math.max(totalFiles - done, 0) : 0;
    const nextFiles = fileList.filter(f => !doneFiles.has(f)).slice(0, 3);
    let text = "Acknowledged: " + file + ".";
    if (totalFiles > 0) {
      text += " Progress: " + done + "/" + totalFiles + " files complete.";
      text += " " + remaining + " file(s) remaining.";
    }
    if (nextFiles.length > 0) {
      text += " Next files to process: " + nextFiles.join(", ");
    } else if (remaining === 0 && totalFiles > 0) {
      text += " All files processed!";
    }
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        content: [{ type: "text", text: text }],
      },
    });
  } else if (msg.id != null) {
    send({ jsonrpc: "2.0", id: msg.id, result: {} });
  }
});
`.trim();

export const MCP_SERVER_NAME = 'decompiler-progress';
export const MCP_TOOL_NAME = 'file_done';

export interface McpScriptInfo {
  readonly scriptPath: string;
  readonly environment: Record<string, string>;
}

/**
 * Writes the MCP server script to a temp file and returns its path + env vars.
 * Pass `totalFiles` and `fileNames` so the tool response can guide the agent
 * with remaining-file counts and next-file suggestions.
 */
export function writeMcpServerScript(totalFiles?: number, fileNames?: string[]): McpScriptInfo {
  const dir = mkdtempSync(join(tmpdir(), 'decompiler-mcp-'));
  const scriptPath = join(dir, 'file-done-server.cjs');
  writeFileSync(scriptPath, MCP_SERVER_SCRIPT, 'utf-8');
  const environment: Record<string, string> = {};
  if (totalFiles != null && totalFiles > 0) {
    environment['TOTAL_FILES'] = String(totalFiles);
  }
  if (fileNames && fileNames.length > 0) {
    // Use newline separator (null bytes not allowed in env vars)
    environment['FILE_LIST'] = fileNames.join('\n');
  }
  return { scriptPath, environment };
}

/**
 * Removes the temp MCP server script file.
 */
export function cleanupMcpScript(scriptPath: string): void {
  try {
    unlinkSync(scriptPath);
  } catch {
    // ignore cleanup errors
  }
}
