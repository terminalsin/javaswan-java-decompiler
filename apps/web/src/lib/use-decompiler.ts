"use client";

import { useRef, useCallback, useEffect } from "react";
import { useJar } from "./jar-context";

export function useDecompiler() {
  const workerRef = useRef<Worker | null>(null);
  const { selectedPath, decompiled, error, getEntryBytes, setDecompiledSource, setIsDecompiling, setError } = useJar();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/decompiler.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const data = event.data;
      if (data.type === "result") {
        setDecompiledSource(data.path, data.source);
      } else if (data.type === "error") {
        setError(`Failed to decompile ${data.path}: ${data.message}`);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setDecompiledSource, setError]);

  const decompile = useCallback(
    (path: string) => {
      if (decompiled.has(path)) return; // cached
      const bytes = getEntryBytes(path);
      if (!bytes || !workerRef.current) return;

      setIsDecompiling(true);
      workerRef.current.postMessage({ type: "decompile", path, bytes });
    },
    // Include `error` so that clearing an error (via retry) recreates this
    // callback and the auto-decompile effect re-fires for the same path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [decompiled, getEntryBytes, setIsDecompiling, error]
  );

  // Auto-decompile when selection changes
  useEffect(() => {
    if (selectedPath) {
      decompile(selectedPath);
    }
  }, [selectedPath, decompile]);

  return { decompile };
}
