"use client";

import { useJar } from "@/lib/jar-context";
import { DropZone } from "@/components/drop-zone";
import { DecompilerView } from "@/components/decompiler-view";

export default function Home() {
  const { fileName } = useJar();
  return fileName ? <DecompilerView /> : <DropZone />;
}
