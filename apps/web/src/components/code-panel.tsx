"use client";

import { useJar } from "@/lib/jar-context";
import { industrialDarkTheme } from "@/lib/monaco-theme";
import Editor, { type BeforeMount } from "@monaco-editor/react";

export function CodePanel() {
  const { selectedPath, decompiled, isDecompiling } = useJar();

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
                style={{ width: `${40 + Math.random() * 50}%`, animationDelay: `${i * 100}ms` }}
              />
            ))}
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
          value={source ?? "// Decompilation failed"}
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
