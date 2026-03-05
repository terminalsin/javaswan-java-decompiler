"use client";

import { useJar } from "@/lib/jar-context";
import { industrialDarkTheme } from "@/lib/monaco-theme";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import { AlertTriangle, RotateCcw } from "lucide-react";

const SKELETON_WIDTHS = [72, 58, 85, 63, 91, 47, 76, 54];

export function CodePanel() {
  const { selectedPath, decompiled, isDecompiling, error, setError } = useJar();

  const source = selectedPath ? decompiled.get(selectedPath) : undefined;

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("industrial-dark", industrialDarkTheme);
  };

  // Empty state: no file selected
  if (!selectedPath) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a class from the sidebar</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isDecompiling && !source) {
    return (
      <div className="flex h-full flex-col">
        <FilePathBar path={selectedPath} />
        <div className="flex flex-1 items-center justify-center">
          {/* Pulsing skeleton lines */}
          <div className="w-full max-w-lg space-y-3 px-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded-sm bg-muted"
                style={{ width: `${SKELETON_WIDTHS[i]}%`, animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state: decompilation failed for this file
  if (!source && !isDecompiling && error) {
    return (
      <div className="flex h-full flex-col">
        <FilePathBar path={selectedPath} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-md text-center px-8">
            <AlertTriangle className="h-10 w-10 text-destructive" strokeWidth={1.5} />
            <div className="space-y-2">
              <p className="text-sm font-mono font-semibold text-destructive">
                Decompilation Failed
              </p>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-primary border border-primary/30 hover:bg-primary/10 transition-colors duration-150"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <FilePathBar path={selectedPath} />
      <div className="flex-1">
        <Editor
          height="100%"
          language="java"
          theme="industrial-dark"
          value={source ?? "// Select a class file to view its source"}
          beforeMount={handleBeforeMount}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            wordWrap: "off",
            fontSize: 13,
            fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            renderLineHighlight: "line",
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}

function FilePathBar({ path }: { path: string }) {
  // Show the class path as breadcrumb-style segments
  const segments = path.split("/");
  const className = segments.pop()?.replace(".class", "") ?? "";
  const packagePath = segments.join(".");

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs font-mono">
      {packagePath && (
        <span className="text-muted-foreground">{packagePath}.</span>
      )}
      <span className="text-primary font-semibold">{className}</span>
    </div>
  );
}
