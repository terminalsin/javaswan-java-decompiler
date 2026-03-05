"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "./app-header";
import { FileTree } from "./file-tree";
import { CodePanel } from "./code-panel";
import { ErrorBanner } from "./error-banner";
import { useDecompiler } from "@/lib/use-decompiler";

export function DecompilerView() {
  useDecompiler(); // Activates the Web Worker
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger the entrance animation on next frame
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`flex h-screen flex-col bg-background transition-opacity duration-300 ease-out ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <AppHeader />
      <ErrorBanner />
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
