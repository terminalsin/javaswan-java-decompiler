import { describe, it, expect } from "vitest";
import { buildFileTree } from "../tree-builder";

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

  it("sorts folders before files", () => {
    const paths = [
      "com/Zebra.class",
      "com/sub/Alpha.class",
      "com/Alpha.class",
    ];
    const tree = buildFileTree(paths);
    const com = tree[0];
    // sub folder should come before Alpha.class and Zebra.class
    expect(com.children![0].name).toBe("sub");
    expect(com.children![0].type).toBe("folder");
    expect(com.children![1].name).toBe("Alpha.class");
    expect(com.children![1].type).toBe("file");
  });
});
