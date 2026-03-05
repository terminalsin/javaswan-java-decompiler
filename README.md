<img width="1584" height="200" alt="@blkswnjava-asm (1)" src="https://github.com/user-attachments/assets/984d98bf-8240-4eb5-b13d-db45e7e5863c" />

# JavaSwan Java Decompiler
<p align="">
  <a href="https://www.npmjs.com/package/@blkswn/java-asm">
    <img alt="npm version" src="https://img.shields.io/npm/v/@blkswn/java-asm?style=for-the-badge">
  </a>
  <a href="https://github.com/terminalsin/javaswan-java-decompiler/issues">
    <img alt="Issues" src="https://img.shields.io/github/issues/terminalsin/javaswan-java-decompiler?style=for-the-badge">
  </a>
  <a href="https://twitter.com/thibautone/follow?screen_name=thibaut">
    <img alt="Follow @thibautone" src="https://img.shields.io/twitter/follow/thibautone?label=Follow&style=for-the-badge">
  </a>
  <a href="https://discord.gg/5vmgwgszxQ">
    <img alt="Discord" src="https://img.shields.io/discord/904888546609987674?label=discord&style=for-the-badge">
  </a>
  <a href="https://opensource.org/licenses/BSD-3-Clause">
    <img alt="BSD-3-Clause" src="https://img.shields.io/badge/license-BSD--3--Clause-blue?style=for-the-badge">
  </a>
</p>

A Java bytecode toolkit written entirely in TypeScript. Read `.class` files, lift them to an IR, analyze them, and decompile them back to source — all without a JVM.
<br/>

> [!NOTE]
> We have a public accessible version available at https://javaswan.com.
>
> I also wrote a blog post, would mean the world if you could read it :)
> 
> https://shanyu.juneja.net/thoughts/self-improving-decompiler/

https://github.com/user-attachments/assets/b20d1b82-ab8f-4b69-89b2-9b36da96afac

## Installing with NPM


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
