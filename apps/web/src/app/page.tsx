"use client";

import { useJar } from "@/lib/jar-context";
import { DropZone } from "@/components/drop-zone";
import { DecompilerView } from "@/components/decompiler-view";

export default function Home() {
  const { fileName } = useJar();

  // DecompilerView handles its own fade-in via mounted state.
  // DropZone already has its own mount animation.
  return fileName ? <DecompilerView /> : <DropZone />;
}
