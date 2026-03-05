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
