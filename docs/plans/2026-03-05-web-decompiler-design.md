# Web Decompiler App Design

## Overview

A client-side web app that accepts JAR files via drag-and-drop, decompiles `.class` files using the existing TypeScript decompiler packages in a Web Worker, and displays the decompiled Java source in a Monaco editor. Lives at `apps/web/` in the monorepo.

## Architecture

**Client-side only** — no server-side processing. The decompiler packages (`java-asm-ts`, `java-ir-ts`, `java-decompiler-ts`) run entirely in the browser inside a Web Worker. JAR parsing uses JSZip.

### Data Flow

```
JAR File (drag & drop)
  → JSZip.loadAsync(arrayBuffer)
  → Build tree structure from zip entry paths
  → Render FileTree sidebar

User clicks .class file →
  → Check in-memory cache (Map<string, string>)
  → If miss: post ArrayBuffer to Web Worker
  → Worker: ClassReader → IRClassVisitor → Decompiler → Java source string
  → Return source, cache it
  → Display in Monaco editor (read-only, Java syntax)
```

### Component Tree

```
App
├── DropZone (landing state, full-screen)
└── DecompilerView (after JAR loaded)
    ├── AppHeader (jar name, class count badge, "Load New" button)
    └── SplitPane
        ├── FileTree (collapsible package hierarchy, shadcn ScrollArea)
        └── CodePanel
            ├── FileTab (current class path breadcrumb)
            └── MonacoEditor (Java, read-only, custom dark theme)
```

## UX States

1. **Landing** — Full-screen drop zone. Dashed border, amber glow on drag-over. "Drop a .jar file to decompile" centered.
2. **Working** — Three regions: top bar, left sidebar (file tree), main area (Monaco editor).
3. **Loading** — Pulsing skeleton in Monaco area while Web Worker decompiles a class.

## Aesthetic: Clean Industrial

| Element | Value |
|---------|-------|
| Base bg | `#12141a` |
| Panel bg | `#1a1d23` |
| Surface | `#22262e` |
| Border | `#2a2e36`, 1px solid, max 2px radius |
| Accent | `#d4873a` (warm amber) |
| Text primary | `#e0e4ec` |
| Text muted | `#6b7280` |
| Code font | JetBrains Mono |
| UI font | Geist Sans (Next.js built-in) |

Utilitarian and precise. Sharp edges. No decorative elements. Visible grid lines. Amber accents only on interactive/active states. Custom Monaco theme matching the palette.

## Tech Stack

- **Next.js 15** — App router, new app at `apps/web/`
- **shadcn/ui** — ScrollArea, Collapsible, Button, Badge
- **@monaco-editor/react** — Monaco editor wrapper
- **jszip** — JAR/ZIP parsing
- **Web Worker** — Decompiler execution (bundled with webpack)
- **React Context** — JAR state + decompiled source cache

## Out of Scope

- AI post-processing
- Server-side processing
- File saving/export
- Multi-tab editing
- Settings/preferences
