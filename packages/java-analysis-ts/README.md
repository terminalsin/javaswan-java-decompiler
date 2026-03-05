# @blkswn/java-analysis

A mid-level analysis framework for Java bytecode that sits on top of `@blkswn/java-ir` and provides:

- **Resolved IR**: Method invocations and field accesses with direct references instead of string-based lookups
- **Class Hierarchy**: Full hierarchy graph with diamond-safe interface method dispatch
- **Call Graph**: Complete call graph with support for virtual/interface dispatch resolution
- **Optimization Passes**: Reusable optimization framework with constant folding as the first pass

## Installation

```bash
npm install @blkswn/java-analysis
```

## Usage

```typescript
import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, ClassIR } from '@blkswn/java-ir';
import { JavaAnalysisCoordinator } from '@blkswn/java-analysis';

// Build ClassIR from bytecode
const classBytes = fs.readFileSync('MyClass.class');
const reader = new ClassReader(classBytes);
const visitor = new IRClassVisitor();
reader.accept(visitor, 0);
const classIR = visitor.getClassIR()!;

// Create analysis program
const coordinator = new JavaAnalysisCoordinator();
const program = coordinator.analyze([classIR]);

// Access hierarchy
const hierarchy = program.hierarchy;
const superTypes = hierarchy.getAllSupertypes('com/example/MyClass');

// Access call graph
const callGraph = program.callGraph;
const callees = callGraph.getCallees(someMethod);

// Run constant folding
import { ConstantFoldingPass } from '@blkswn/java-analysis';
const pass = new ConstantFoldingPass();
pass.run(program);
```

## Features

### Resolved IR

The resolved IR replaces string-based references with direct object references:

- `ResolvedStaticInvocationExpr`: Has `declaredMethod` reference
- `ResolvedVirtualInvocationExpr`: Has `declaredMethod` + `possibleTargets` for virtual dispatch
- `ResolvedFieldLoadExpr` / `ResolvedFieldStoreStmt`: Has `resolvedField` reference

### Class Hierarchy

- Builds extends/implements edges from `ClassIR`
- Provides queries: `getSuperClass()`, `getDirectInterfaces()`, `getAllSupertypes()`, `getAllSubtypes()`
- Handles interface default method diamonds conservatively

### Call Graph

- Nodes are `AnalysisMethod` instances
- Edges connect call sites to possible targets
- Supports depth-limited call tree traversal with cycle detection

### Constant Folding Pass

The constant folding pass performs intraprocedural constant propagation:

- **Arithmetic folding**: `2 + 3` → `5`
- **Negation folding**: `-5` → `-5` as constant
- **Comparison folding**: `lcmp(5L, 3L)` → `1`
- **Cast folding**: `(long) 42` → `42L`
- **Variable folding**: Replace `VarExpr` with constants when provably constant

## License

BSD-3-Clause
