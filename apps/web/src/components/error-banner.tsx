"use client";

import { useJar } from "@/lib/jar-context";
import { AlertTriangle, X } from "lucide-react";

export function ErrorBanner() {
  const { error, setError } = useJar();

  if (!error) return null;

  return (
    <div className="flex items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-mono animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <span className="flex-1 text-destructive">{error}</span>
      <button
        type="button"
        onClick={() => setError(null)}
        className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
