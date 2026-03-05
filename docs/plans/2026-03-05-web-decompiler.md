# Web Decompiler App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-side web app that accepts JAR files via drag-and-drop, decompiles `.class` files in a Web Worker using the existing TypeScript decompiler packages, and displays the result in a Monaco editor.

**Architecture:** Next.js 15 app at `apps/web/` in the monorepo. JAR parsing via JSZip on the main thread. Decompilation in a Web Worker using `@blkswn/java-decompiler`. File tree sidebar + Monaco editor layout. All client-side, no API routes.

**Tech Stack:** Next.js 15 (App Router), shadcn/ui, Monaco Editor (@monaco-editor/react), JSZip, Web Worker, Tailwind CSS v4

---

### Task 1: Scaffold Next.js App

**Files:**
- Create: `apps/web/` (entire Next.js project via CLI)

**Step 1: Create Next.js app with CLI**

```bash
cd /Users/terminalsin/Documents/blackswan-java
bunx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-bun
```

Accept defaults. This creates the full Next.js 15 scaffold.

**Step 2: Verify it runs**

```bash
cd apps/web && bun run dev
```

Visit http://localhost:3000, confirm it loads. Kill the dev server.

**Step 3: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold Next.js 15 app at apps/web"
```

---

### Task 2: Install shadcn/ui and Components

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/ui/` (shadcn components)

**Step 1: Initialize shadcn**

```bash
cd apps/web
bunx --bun shadcn@latest init
```

Choose: New York style, Zinc base color, CSS variables: yes.

**Step 2: Install required components**

```bash
bunx --bun shadcn@latest add button badge scroll-area collapsible separator tooltip
```

**Step 3: Commit**

```bash
git add -A apps/web
git commit -m "feat: add shadcn/ui with button, badge, scroll-area, collapsible, separator, tooltip"
```

---

### Task 3: Add Workspace Dependencies and Configure

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`

**Step 1: Add workspace packages + jszip + monaco**

```bash
cd apps/web
bun add @blkswn/java-decompiler@workspace:* @blkswn/java-asm@workspace:* @blkswn/java-ir@workspace:* jszip @monaco-editor/react monaco-editor
```

**Step 2: Configure next.config.ts for workspace packages**

Replace the contents of `apps/web/next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@blkswn/java-decompiler",
    "@blkswn/java-asm",
    "@blkswn/java-ir",
    "@blkswn/java-analysis",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

**Step 3: Build workspace packages**

```bash
cd /Users/terminalsin/Documents/blackswan-java
bun run build --filter=@blkswn/java-decompiler
```

**Step 4: Verify the Next.js app still builds**

```bash
cd apps/web && bun run build
```

**Step 5: Commit**

```bash
git add apps/web/package.json apps/web/next.config.ts bun.lock
git commit -m "feat: add workspace decompiler deps, jszip, monaco to web app"
```

---

### Task 4: Theme and Global Styles

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Set up the industrial dark theme in globals.css**

Replace `apps/web/src/app/globals.css` with the industrial color palette CSS variables. Key colors:

```css
/* Base: #12141a, Panel: #1a1d23, Surface: #22262e, Border: #2a2e36 */
/* Accent: #d4873a (warm amber), Text: #e0e4ec, Muted: #6b7280 */
```

Import JetBrains Mono from Google Fonts (or use `next/font`).

Tailwind CSS v4 approach: use `@theme` block to define custom tokens, override shadcn CSS variables for the dark industrial palette.

**Step 2: Update layout.tsx**

- Set `<html>` to dark mode by default (`className="dark"`)
- Add JetBrains Mono via `next/font/google`
- Set Geist Sans as the UI font (already included by create-next-app)
- Set page title to "BlackSwan Decompiler"
- Add meta description

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat: add industrial dark theme with amber accents"
```

---

### Task 5: JAR Parsing Utility (TDD)

**Files:**
- Create: `apps/web/src/lib/jar-parser.ts`
- Create: `apps/web/src/lib/__tests__/jar-parser.test.ts`

**Step 1: Install vitest for testing**

```bash
cd apps/web
bun add -D vitest @vitejs/plugin-react
```

Add to `apps/web/package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

**Step 2: Write the failing test**

```typescript
// apps/web/src/lib/__tests__/jar-parser.test.ts
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseJar, type JarEntry } from "../jar-parser";

describe("parseJar", () => {
  it("extracts .class entries from a JAR zip", async () => {
    const zip = new JSZip();
    zip.file("com/example/Main.class", new Uint8Array([0xca, 0xfe, 0xba, 0xbe]));
    zip.file("com/example/Utils.class", new Uint8Array([0xca, 0xfe, 0xba, 0xbe]));
    zip.file("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\n");

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const entries = await parseJar(buffer);

    expect(entries).toHaveLength(2);
    expect(entries[0].path).toBe("com/example/Main.class");
    expect(entries[1].path).toBe("com/example/Utils.class");
    expect(entries[0].bytes).toBeInstanceOf(Uint8Array);
  });

  it("returns empty array for JAR with no .class files", async () => {
    const zip = new JSZip();
    zip.file("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\n");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const entries = await parseJar(buffer);
    expect(entries).toHaveLength(0);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
cd apps/web && bun run test
```

Expected: FAIL — `parseJar` not defined.

**Step 4: Implement jar-parser.ts**

```typescript
// apps/web/src/lib/jar-parser.ts
import JSZip from "jszip";

export interface JarEntry {
  path: string;
  bytes: Uint8Array;
}

export async function parseJar(buffer: ArrayBuffer): Promise<JarEntry[]> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: JarEntry[] = [];

  const promises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && relativePath.endsWith(".class")) {
      promises.push(
        zipEntry.async("uint8array").then((bytes) => {
          entries.push({ path: relativePath, bytes });
        })
      );
    }
  });

  await Promise.all(promises);
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}
```

**Step 5: Run test to verify it passes**

```bash
cd apps/web && bun run test
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/src/lib/jar-parser.ts apps/web/src/lib/__tests__/jar-parser.test.ts apps/web/package.json apps/web/vitest.config.ts
git commit -m "feat: add JAR parsing utility with tests"
```

---

### Task 6: File Tree Builder (TDD)

**Files:**
- Create: `apps/web/src/lib/tree-builder.ts`
- Create: `apps/web/src/lib/__tests__/tree-builder.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/web/src/lib/__tests__/tree-builder.test.ts
import { describe, it, expect } from "vitest";
import { buildFileTree, type TreeNode } from "../tree-builder";

describe("buildFileTree", () => {
  it("builds a nested tree from flat paths", () => {
    const paths = [
      "com/example/Main.class",
      "com/example/Utils.class",
      "com/example/sub/Helper.class",
      "org/other/Foo.class",
    ];

    const tree = buildFileTree(paths);

    expect(tree).toHaveLength(2); // com, org
    const com = tree.find((n) => n.name === "com")!;
    expect(com.type).toBe("folder");
    expect(com.children).toHaveLength(1); // example
    const example = com.children![0];
    expect(example.children).toHaveLength(3); // Main, Utils, sub
  });

  it("returns empty array for empty input", () => {
    expect(buildFileTree([])).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/web && bun run test
```

**Step 3: Implement tree-builder.ts**

```typescript
// apps/web/src/lib/tree-builder.ts
export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

export function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const nodePath = parts.slice(0, i + 1).join("/");

      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = {
          name,
          path: nodePath,
          type: isFile ? "file" : "folder",
          ...(isFile ? {} : { children: [] }),
        };
        current.push(existing);
      }
      if (!isFile) {
        current = existing.children!;
      }
    }
  }

  sortTree(root);
  return root;
}

function sortTree(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }
}
```

**Step 4: Run tests**

```bash
cd apps/web && bun run test
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/tree-builder.ts apps/web/src/lib/__tests__/tree-builder.test.ts
git commit -m "feat: add file tree builder with tests"
```

---

### Task 7: React Context for App State

**Files:**
- Create: `apps/web/src/lib/jar-context.tsx`

**Step 1: Create the JAR context**

```typescript
// apps/web/src/lib/jar-context.tsx
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
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/jar-context.tsx
git commit -m "feat: add JarProvider context for app state management"
```

---

### Task 8: Web Worker for Decompilation

**Files:**
- Create: `apps/web/src/workers/decompiler.worker.ts`
- Create: `apps/web/src/lib/use-decompiler.ts`

**Step 1: Create the worker file**

```typescript
// apps/web/src/workers/decompiler.worker.ts

// Message types
interface DecompileRequest {
  type: "decompile";
  path: string;
  bytes: Uint8Array;
}

interface DecompileResponse {
  type: "result";
  path: string;
  source: string;
}

interface ErrorResponse {
  type: "error";
  path: string;
  message: string;
}

self.onmessage = async (event: MessageEvent<DecompileRequest>) => {
  const { path, bytes } = event.data;

  try {
    const { JavaDecompiler } = await import("@blkswn/java-decompiler");
    const decompiler = new JavaDecompiler();
    const source = decompiler.decompileClassFileBytes(bytes, {
      resolveReferences: true,
      constantFolding: true,
      emitPackageDeclaration: true,
    });

    self.postMessage({ type: "result", path, source } satisfies DecompileResponse);
  } catch (err) {
    self.postMessage({
      type: "error",
      path,
      message: err instanceof Error ? err.message : "Decompilation failed",
    } satisfies ErrorResponse);
  }
};
```

**Step 2: Create the hook to manage the worker**

```typescript
// apps/web/src/lib/use-decompiler.ts
"use client";

import { useRef, useCallback, useEffect } from "react";
import { useJar } from "./jar-context";

export function useDecompiler() {
  const workerRef = useRef<Worker | null>(null);
  const { selectedPath, decompiled, getEntryBytes, setDecompiledSource, setIsDecompiling, setError } = useJar();

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
    [decompiled, getEntryBytes, setIsDecompiling]
  );

  // Auto-decompile when selection changes
  useEffect(() => {
    if (selectedPath) {
      decompile(selectedPath);
    }
  }, [selectedPath, decompile]);

  return { decompile };
}
```

**Step 3: Commit**

```bash
git add apps/web/src/workers/decompiler.worker.ts apps/web/src/lib/use-decompiler.ts
git commit -m "feat: add Web Worker decompiler and useDecompiler hook"
```

---

### Task 9: DropZone Component

**Files:**
- Create: `apps/web/src/components/drop-zone.tsx`

**Step 1: Build the DropZone**

Full-screen drag-and-drop landing page. Dashed border zone, amber glow on drag-over. Accepts `.jar` files only. On drop, calls `loadJar()` from context.

Key behaviors:
- `onDragOver` / `onDragLeave` for visual state
- `onDrop` to extract the File and call `loadJar(file)`
- Validate file extension is `.jar`
- Show loading spinner during parsing
- Subtle entry animation (fade + slide up)

Style: Deep dark background (#12141a), dashed border in muted gray, amber glow (#d4873a) on drag-over with `box-shadow` and border color transition.

**Step 2: Commit**

```bash
git add apps/web/src/components/drop-zone.tsx
git commit -m "feat: add DropZone component with drag-and-drop JAR upload"
```

---

### Task 10: FileTree Component

**Files:**
- Create: `apps/web/src/components/file-tree.tsx`

**Step 1: Build the FileTree**

Recursive tree component using shadcn `Collapsible` and `ScrollArea`.

- Folder nodes: clickable to expand/collapse, folder icon, package name
- File nodes: clickable to select, `.class` file icon, class name (strip `.class` extension for display)
- Active file: amber left-border accent, slightly lighter background
- Indent levels via padding-left
- Use `useJar().selectFile(path)` on click
- Wrap in shadcn `ScrollArea` for overflow

Sort: folders first, then alphabetical.

**Step 2: Commit**

```bash
git add apps/web/src/components/file-tree.tsx
git commit -m "feat: add FileTree component with collapsible package hierarchy"
```

---

### Task 11: CodePanel with Monaco Editor

**Files:**
- Create: `apps/web/src/components/code-panel.tsx`
- Create: `apps/web/src/lib/monaco-theme.ts`

**Step 1: Define custom Monaco theme**

```typescript
// apps/web/src/lib/monaco-theme.ts
import type { editor } from "monaco-editor";

export const industrialDarkTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "keyword", foreground: "d4873a" },
    { token: "string", foreground: "a3be8c" },
    { token: "number", foreground: "d4873a" },
    { token: "type", foreground: "81a1c1" },
    // ... more token rules matching industrial palette
  ],
  colors: {
    "editor.background": "#1a1d23",
    "editor.foreground": "#e0e4ec",
    "editor.lineHighlightBackground": "#22262e",
    "editor.selectionBackground": "#2a2e3680",
    "editorLineNumber.foreground": "#6b7280",
    "editorLineNumber.activeForeground": "#d4873a",
    "editor.inactiveSelectionBackground": "#22262e",
    "editorIndentGuide.background": "#2a2e36",
    // ... more editor colors
  },
};
```

**Step 2: Build CodePanel component**

```typescript
// apps/web/src/components/code-panel.tsx
```

- Uses `@monaco-editor/react` `Editor` component
- Language: `java`, read-only
- Registers custom theme on `beforeMount`
- Shows file path breadcrumb at top (e.g., `com/example/Main.class`)
- Shows pulsing skeleton lines when `isDecompiling` is true
- Shows "Select a class file" placeholder when no file selected
- Minimap enabled, word wrap off

**Step 3: Commit**

```bash
git add apps/web/src/components/code-panel.tsx apps/web/src/lib/monaco-theme.ts
git commit -m "feat: add CodePanel with Monaco editor and custom industrial theme"
```

---

### Task 12: AppHeader Component

**Files:**
- Create: `apps/web/src/components/app-header.tsx`

**Step 1: Build AppHeader**

- Left: "BLACKSWAN" logo text in bold, amber accent on "SWAN"
- Center: JAR filename + class count badge (shadcn Badge)
- Right: "Load New" button (shadcn Button, ghost variant) that calls `reset()`
- Height: 48px, border-bottom, panel background

**Step 2: Commit**

```bash
git add apps/web/src/components/app-header.tsx
git commit -m "feat: add AppHeader with JAR info and reset action"
```

---

### Task 13: Assemble Main Page

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/decompiler-view.tsx`

**Step 1: Create DecompilerView (the working state layout)**

```typescript
// apps/web/src/components/decompiler-view.tsx
```

Assembles: AppHeader on top, FileTree on left (280px, resizable border), CodePanel filling the rest. Uses CSS Grid or flexbox. The `useDecompiler()` hook is called here to activate the worker.

**Step 2: Update page.tsx**

```typescript
// apps/web/src/app/page.tsx
"use client";

import { useJar } from "@/lib/jar-context";
import { DropZone } from "@/components/drop-zone";
import { DecompilerView } from "@/components/decompiler-view";

export default function Home() {
  const { fileName } = useJar();
  return fileName ? <DecompilerView /> : <DropZone />;
}
```

**Step 3: Update layout.tsx to wrap with JarProvider**

Add `<JarProvider>` wrapper around `{children}` in the root layout.

**Step 4: Run the app and test manually**

```bash
cd apps/web && bun run dev
```

Test flow:
1. Landing page shows drop zone
2. Drop a .jar file
3. File tree appears with class hierarchy
4. Click a .class file
5. Monaco editor shows decompiled Java source

**Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/layout.tsx apps/web/src/components/decompiler-view.tsx
git commit -m "feat: wire up main page with DropZone → DecompilerView flow"
```

---

### Task 14: Polish — Animations, Error Handling, Empty States

**Files:**
- Modify: `apps/web/src/components/drop-zone.tsx`
- Modify: `apps/web/src/components/code-panel.tsx`
- Modify: `apps/web/src/components/decompiler-view.tsx`

**Step 1: Add transitions**

- DropZone → DecompilerView: fade transition
- File tree item hover: subtle background shift
- Monaco panel: fade-in when decompiled source arrives
- Drop zone drag-over: scale + glow animation

**Step 2: Error handling**

- Display error toast/banner if JAR parsing fails
- Display error in Monaco area if decompilation of a specific class fails
- Handle non-.jar files with a validation message on the drop zone

**Step 3: Empty states**

- Monaco area when no file selected: "Select a class from the sidebar" with muted text and subtle icon
- File tree when JAR has no .class files: "No class files found" message

**Step 4: Final manual test**

```bash
cd apps/web && bun run dev
```

Test all flows: happy path, invalid file, empty JAR, large JAR.

**Step 5: Run build to confirm no errors**

```bash
cd apps/web && bun run build
```

**Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat: add animations, error handling, and empty states"
```

---

### Task 15: Verification and Cleanup

**Step 1: Run all tests**

```bash
cd apps/web && bun run test
```

**Step 2: Run lint**

```bash
cd apps/web && bun run lint
```

Fix any lint errors.

**Step 3: Run type check**

```bash
cd apps/web && bun run check-types || cd apps/web && bunx tsc --noEmit
```

Fix any type errors.

**Step 4: Final build**

```bash
cd apps/web && bun run build
```

**Step 5: Commit any fixes**

```bash
git add apps/web
git commit -m "chore: fix lint and type errors"
```

---

## Reference: Key APIs

### Decompiler (used in Web Worker)
```typescript
import { JavaDecompiler } from "@blkswn/java-decompiler";
const decompiler = new JavaDecompiler();
const source: string = decompiler.decompileClassFileBytes(classBytes: Uint8Array, {
  resolveReferences: true,
  constantFolding: true,
  emitPackageDeclaration: true,
});
```

### JAR Parsing (used in main thread)
```typescript
import JSZip from "jszip";
const zip = await JSZip.loadAsync(arrayBuffer);
zip.forEach((path, entry) => { /* ... */ });
const bytes = await entry.async("uint8array");
```

### Monorepo Workspace Resolution
Packages use `workspace:*` protocol. Must run `bun install` from monorepo root after adding deps. Packages must be built (`bun run build`) before Next.js can consume them.
