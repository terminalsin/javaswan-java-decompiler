"use client";

import { useJar } from "@/lib/jar-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";

export function AppHeader() {
  const { fileName, entries, reset } = useJar();

  const classCount = entries.length;

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      {/* Logo */}
      <div className="text-sm font-semibold tracking-wider">
        <span>BLACK</span>
        <span className="text-primary">SWAN</span>
      </div>

      {/* JAR info */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-foreground">{fileName}</span>
        <Badge variant="secondary" className="text-xs">
          {classCount} {classCount === 1 ? "class" : "classes"}
        </Badge>
      </div>

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        className="text-muted-foreground hover:text-foreground"
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        Load New
      </Button>
    </header>
  );
}
