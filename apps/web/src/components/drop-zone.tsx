"use client";

import { useState, useCallback, useEffect, useSyncExternalStore, type DragEvent } from "react";
import { useJar } from "@/lib/jar-context";
import { FileArchive, Loader2 } from "lucide-react";

const emptySubscribe = () => () => {};

export function DropZone() {
  const { loadJar, isLoading } = useJar();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Clear error after a few seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set dragging to false when leaving the drop zone itself,
    // not when entering a child element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!file.name.endsWith(".jar")) {
        setError("Invalid file type. Only .jar files are supported.");
        return;
      }

      await loadJar(file);
    },
    [loadJar]
  );

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-background p-8"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`
          flex flex-col items-center justify-center gap-6
          w-full max-w-2xl aspect-[4/3]
          border-2 border-dashed
          transition-all duration-300 ease-out
          ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          ${isDragging
            ? "border-primary scale-[1.01] shadow-[0_0_40px_-10px_rgba(212,135,58,0.3)]"
            : "border-border"
          }
          ${isLoading ? "pointer-events-none" : ""}
        `}
        style={{ borderRadius: 0 }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-6">
            <Loader2
              className="h-12 w-12 text-primary animate-spin"
              strokeWidth={1.5}
            />
            <p className="text-sm font-mono text-muted-foreground tracking-wide uppercase">
              Parsing JAR...
            </p>
          </div>
        ) : (
          <>
            {/* Branding */}
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-mono font-semibold tracking-tight text-foreground">
                JavaSwan
              </h1>
              <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
                Java Decompiler
              </span>
            </div>

            {/* Icon */}
            <FileArchive
              className={`
                h-16 w-16 transition-colors duration-300
                ${isDragging ? "text-primary" : "text-muted-foreground/40"}
              `}
              strokeWidth={1}
            />

            {/* Instruction */}
            <p
              className={`
                text-sm font-mono tracking-wide transition-colors duration-300
                ${isDragging ? "text-primary" : "text-muted-foreground"}
              `}
            >
              Drop a .jar file to decompile
            </p>

            {/* Error message */}
            {error && (
              <p className="text-sm font-mono text-destructive animate-in fade-in slide-in-from-bottom-2 duration-200">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
