"use client";

import { useState } from "react";
import { useJar } from "@/lib/jar-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, File, Folder } from "lucide-react";
import type { TreeNode } from "@/lib/tree-builder";

export function FileTree() {
  const { tree, selectedPath, selectFile } = useJar();

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {tree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={selectFile}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;

  const displayName = isFolder
    ? node.name
    : node.name.replace(/\.class$/, "");

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center gap-1.5 py-1 pr-2 font-mono text-sm font-medium text-foreground hover:bg-secondary transition-colors duration-100"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{displayName}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
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
      className={`flex w-full items-center gap-1.5 py-1 pr-2 font-mono text-sm text-foreground transition-colors duration-100 ${
        isSelected ? "bg-[#22262e] border-l-2 border-l-[#d4873a]" : "hover:bg-secondary border-l-2 border-l-transparent"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{displayName}</span>
    </button>
  );
}
