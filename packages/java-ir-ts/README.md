# @blkswn/java-ir

A low-level intermediate representation (IR) for Java bytecode that lifts stack-based JVM instructions into typed expressions and statements organized in a control flow graph.

## Overview

This package provides:

- **Expression hierarchy**: Typed expressions representing JVM operations (arithmetic, invocations, field access, etc.)
- **Statement hierarchy**: Statements that consume expressions (stores, jumps, returns, etc.)
- **Control Flow Graph**: Basic blocks with predecessor/successor edges, indexed by linear position
- **IR Builder**: Converts bytecode from `@blkswn/java-asm` visitors into IR

## Installation

```bash
npm install @blkswn/java-ir
```

## Usage

```typescript
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor } from '@blkswn/java-ir';

// Read a class file
const classBytes = fs.readFileSync('MyClass.class');
const reader = new ClassReader(classBytes);

// Build IR
const irVisitor = new IRClassVisitor();
reader.accept(irVisitor, 0);

const classIR = irVisitor.getClassIR();

// Access methods
for (const method of classIR.methods) {
  console.log(`Method: ${method.name}`);
  
  // Iterate over basic blocks
  for (const block of method.cfg.blocks) {
    console.log(`  Block ${block.index}:`);
    for (const stmt of block.statements) {
      console.log(`    ${stmt}`);
    }
  }
}
```

## Expression Types

| Expression | Description |
|------------|-------------|
| `ArithmeticExpr` | Binary arithmetic operations (+, -, *, /, %, <<, >>, >>>, &, \|, ^) |
| `VarExpr` | Local variable load |
| `ConstantExpr` | Constant values (int, long, float, double, string, null, class, etc.) |
| `NegationExpr` | Unary negation |
| `ComparisonExpr` | Long/float/double comparison (lcmp, fcmpl, fcmpg, dcmpl, dcmpg) |
| `StaticInvocationExpr` | Static method call |
| `VirtualInvocationExpr` | Virtual/special/interface method call |
| `DynamicInvocationExpr` | invokedynamic |
| `FieldLoadExpr` | Field read (getfield/getstatic) |
| `ArrayLoadExpr` | Array element read |
| `ArrayLengthExpr` | Array length |
| `NewArrayExpr` | Array allocation |
| `CastExpr` | Type cast (checkcast, primitive conversions) |
| `InstanceOfExpr` | instanceof check |
| `NewExpr` | Object allocation |
| `CaughtExceptionExpr` | Exception at handler entry |

## Statement Types

| Statement | Description |
|-----------|-------------|
| `VarStoreStmt` | Local variable store |
| `ArrayStoreStmt` | Array element store |
| `FieldStoreStmt` | Field write (putfield/putstatic) |
| `MonitorStmt` | Monitor enter/exit |
| `ConditionalJumpStmt` | Conditional branch |
| `UnconditionalJumpStmt` | Unconditional branch (goto) |
| `SwitchStmt` | Table/lookup switch |
| `ThrowStmt` | Throw exception |
| `ReturnStmt` | Method return |
| `NopStmt` | No operation |
| `PopStmt` | Pop value from stack |
| `LineNumberStmt` | Line number metadata |
| `FrameStmt` | Stack map frame metadata |

## Design Notes

- This is a **low-level IR**, not in SSA form
- Block indices are significant for frame verification
- Expressions are trees built by simulating the JVM stack during bytecode traversal
- DUP/SWAP operations create shared expression references

## License

BSD-3-Clause
