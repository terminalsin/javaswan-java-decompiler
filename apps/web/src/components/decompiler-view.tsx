"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "./app-header";
import { FileTree } from "./file-tree";
import { CodePanel } from "./code-panel";
import { ErrorBanner } from "./error-banner";
import { useDecompiler } from "@/lib/use-decompiler";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export function DecompilerView() {
  useDecompiler(); // Activates the Web Worker
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Sidebar */}
        <ResizablePanel
          defaultSize="280px"
          minSize="120px"
          maxSize="50%"
          className="bg-card"
        >
          <FileTree />
        </ResizablePanel>
        <ResizableHandle className="hover:bg-primary/20 transition-colors duration-150" />
        {/* Main content */}
        <ResizablePanel defaultSize="1fr" minSize="30%">
          <CodePanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
