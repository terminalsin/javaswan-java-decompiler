# blackswan-java

A Java bytecode toolkit written entirely in TypeScript. Read `.class` files, lift them to an IR, analyze them, and decompile them back to source — all without a JVM.

## Packages

| Package | Description |
| --- | --- |
| [`@blkswn/java-asm`](packages/java-asm-ts) | TypeScript port of OW2 ASM. Read, write, and transform raw bytecode. |
| [`@blkswn/java-ir`](packages/java-ir-ts) | Intermediate representation. Lifts stack bytecode into typed expressions and a control flow graph. |
| [`@blkswn/java-analysis`](packages/java-analysis-ts) | Analysis framework. Class hierarchy, call graphs, constant folding, optimization passes. |
| [`@blkswn/java-decompiler`](packages/java-decompiler-ts) | Decompiler. Turns bytecode into readable Java source. |
| [`@blkswn/java-decompiler-ai`](packages/java-decompiler-ts-ai) | AI cleanup pass. Renames variables, fixes formatting artifacts in decompiled output. |

## Apps

| App | Description |
| --- | --- |
| [`similarity-eval`](apps/similarity-eval) | Benchmark harness. Scores decompiler output against original source using 9 similarity metrics. |
| [`web`](apps/web) | Web UI. Interactive decompiler with Monaco editor. |
| [`java-format-cli`](apps/java-format-cli) | Java source formatter (Palantir). Used by the eval pipeline. |
| [`decompilers`](apps/decompilers) | Bundled reference decompilers (CFR, Procyon, Vineflower) for benchmarking. |

## How it fits together

```
.class / .jar file
       │
       ▼
   java-asm          read/write raw bytecode
       │
       ▼
   java-ir            lift to expressions + control flow graph
       │
       ▼
   java-analysis      resolve types, optimize, fold constants
       │
       ▼
   java-decompiler    reconstruct Java source
       │
       ▼
   java-decompiler-ai (optional) clean up variable names + formatting
```

## Quick start

```bash
# install
bun install

# build everything
bun run build

# run tests
bun run turbo run test
```

Build a single package:

```bash
turbo run build --filter=@blkswn/java-asm
```

## License

BSD-3-Clause
