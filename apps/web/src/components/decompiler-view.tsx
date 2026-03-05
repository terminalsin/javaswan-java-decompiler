"use client";

import { AppHeader } from "./app-header";
import { FileTree } from "./file-tree";
import { CodePanel } from "./code-panel";
import { useDecompiler } from "@/lib/use-decompiler";

export function DecompilerView() {
  useDecompiler(); // Activates the Web Worker

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[280px] shrink-0 border-r border-border bg-card overflow-hidden">
          <FileTree />
        </div>
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <CodePanel />
        </div>
      </div>
    </div>
  );
}
