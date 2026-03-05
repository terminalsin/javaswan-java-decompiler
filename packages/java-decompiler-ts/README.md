# @blkswn/java-decompiler

A TypeScript decompiler for Java `.class` files built on top of:

- `@blkswn/java-asm` (classfile parsing)
- `@blkswn/java-ir` (CFG + typed expressions/statements)
- `@blkswn/java-analysis` (reference resolution + optimization passes)

## Status

Early but functional. The architecture is designed for incremental improvements:

- Parse classfile → IR
- Optional analysis passes (e.g. constant folding)
- Convert IR → Java AST
- Print Java-ish source code (best-effort; falls back to safe lower-level forms when needed)

