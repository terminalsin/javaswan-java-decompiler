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

    self.postMessage({ type: "result", path, source } as DecompileResponse);
  } catch (err) {
    self.postMessage({
      type: "error",
      path,
      message: err instanceof Error ? err.message : "Decompilation failed",
    } as ErrorResponse);
  }
};
