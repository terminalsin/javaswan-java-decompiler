"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { parseJar, type JarEntry } from "./jar-parser";
import { buildFileTree, type TreeNode } from "./tree-builder";

interface JarState {
  fileName: string | null;
  entries: JarEntry[];
  tree: TreeNode[];
  selectedPath: string | null;
  decompiled: Map<string, string>;
  isLoading: boolean;
  isDecompiling: boolean;
  error: string | null;
}

interface JarContextValue extends JarState {
  loadJar: (file: File) => Promise<void>;
  selectFile: (path: string) => void;
  reset: () => void;
  setDecompiledSource: (path: string, source: string) => void;
  setIsDecompiling: (v: boolean) => void;
  setError: (error: string | null) => void;
  getEntryBytes: (path: string) => Uint8Array | undefined;
}

const JarContext = createContext<JarContextValue | null>(null);

export function JarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JarState>({
    fileName: null,
    entries: [],
    tree: [],
    selectedPath: null,
    decompiled: new Map(),
    isLoading: false,
    isDecompiling: false,
    error: null,
  });

  const entriesRef = useRef<JarEntry[]>([]);

  const loadJar = useCallback(async (file: File) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const buffer = await file.arrayBuffer();
      const entries = await parseJar(buffer);
      entriesRef.current = entries;
      const tree = buildFileTree(entries.map((e) => e.path));
      setState({
        fileName: file.name,
        entries,
        tree,
        selectedPath: null,
        decompiled: new Map(),
        isLoading: false,
        isDecompiling: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to parse JAR",
      }));
    }
  }, []);

  const selectFile = useCallback((path: string) => {
    setState((s) => ({ ...s, selectedPath: path }));
  }, []);

  const reset = useCallback(() => {
    entriesRef.current = [];
    setState({
      fileName: null,
      entries: [],
      tree: [],
      selectedPath: null,
      decompiled: new Map(),
      isLoading: false,
      isDecompiling: false,
      error: null,
    });
  }, []);

  const setDecompiledSource = useCallback((path: string, source: string) => {
    setState((s) => {
      const decompiled = new Map(s.decompiled);
      decompiled.set(path, source);
      return { ...s, decompiled, isDecompiling: false };
    });
  }, []);

  const setIsDecompiling = useCallback((v: boolean) => {
    setState((s) => ({ ...s, isDecompiling: v }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error, isDecompiling: false }));
  }, []);

  const getEntryBytes = useCallback((path: string) => {
    return entriesRef.current.find((e) => e.path === path)?.bytes;
  }, []);

  return (
    <JarContext.Provider
      value={{
        ...state,
        loadJar,
        selectFile,
        reset,
        setDecompiledSource,
        setIsDecompiling,
        setError,
        getEntryBytes,
      }}
    >
      {children}
    </JarContext.Provider>
  );
}

export function useJar() {
  const ctx = useContext(JarContext);
  if (!ctx) throw new Error("useJar must be used within JarProvider");
  return ctx;
}
