import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseJar } from "../jar-parser";

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
