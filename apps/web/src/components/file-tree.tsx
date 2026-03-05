"use client";

import { useState, useMemo } from "react";
import { useJar } from "@/lib/jar-context";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight, File, Folder, Search } from "lucide-react";
import type { TreeNode } from "@/lib/tree-builder";

export function FileTree() {
  const { tree, selectedPath, selectFile } = useJar();
  const [search, setSearch] = useState("");

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    return filterTree(tree, search.trim().toLowerCase());
  }, [tree, search]);

  if (tree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs font-mono text-muted-foreground text-center">
          No class files found
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-none border border-border bg-background px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 w-max min-w-full">
          {filteredTree.length === 0 ? (
            <p className="text-xs font-mono text-muted-foreground text-center py-4">
              No matches
            </p>
          ) : (
            filteredTree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={selectFile}
                defaultExpanded={search.trim().length > 0}
              />
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultExpanded,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;

  const displayName = isFolder
    ? node.name
    : node.name.replace(/\.class$/, "");

  if (isFolder) {
    const isOpen = expanded || defaultExpanded;
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center gap-1.5 py-1 pr-2 font-mono text-sm font-medium text-foreground hover:bg-secondary transition-colors duration-100 whitespace-nowrap"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{displayName}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                defaultExpanded={defaultExpanded}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={`flex w-full items-center gap-1.5 py-1 pr-2 font-mono text-sm text-foreground transition-colors duration-100 whitespace-nowrap ${
        isSelected ? "bg-[#22262e] border-l-2 border-l-[#d4873a]" : "hover:bg-secondary border-l-2 border-l-transparent"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span>{displayName}</span>
    </button>
  );
}

/** Recursively filter tree nodes by search query matching file names */
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      const name = node.name.replace(/\.class$/, "").toLowerCase();
      if (name.includes(query)) {
        result.push(node);
      }
    } else if (node.children) {
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }

  return result;
}
