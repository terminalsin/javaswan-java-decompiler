# @blkswn/java-decompiler-ai

AI-powered post-processor for Java decompiler output. Uses [OpenCode](https://opencode.ai) to clean up and improve decompiled Java source — fixing formatting, renaming auto-generated variables, and repairing common decompiler artifacts.

## Prerequisites

- [OpenCode](https://opencode.ai) must be installed and running as a server
- An AI provider configured in OpenCode (Anthropic, OpenAI, etc.)

Start the OpenCode server before using this package:

```bash
opencode
```

## Installation

```bash
bun add @blkswn/java-decompiler-ai
```

## CLI Usage

The package includes a `java-decompiler-ai` CLI that decompiles `.class` or `.jar` files with optional AI cleanup.

### Decompile a single class file

```bash
# Decompile and print to stdout (no AI)
java-decompiler-ai MyClass.class --no-ai

# Decompile with AI cleanup
java-decompiler-ai MyClass.class

# Decompile and write to a directory
java-decompiler-ai MyClass.class -o ./output
```

### Decompile a JAR

```bash
# Decompile all classes in a JAR to an output directory
java-decompiler-ai app.jar -o ./decompiled

# Without AI (fast, offline)
java-decompiler-ai app.jar -o ./decompiled --no-ai
```

### CLI Options

```
Arguments:
  <input>                Path to a .class file or .jar file

Options:
  -o, --output <path>    Output directory for decompiled sources (default: stdout)
  --no-ai                Skip AI post-processing (decompile only)
  --base-url <url>       OpenCode server URL (default: "http://localhost:4096")
  --provider <id>        AI model provider (default: "anthropic")
  --model <id>           AI model ID (default: "claude-sonnet-4-20250514")
  --timeout <ms>         AI agent timeout in milliseconds (default: "300000")
  --no-cleanup           Keep temporary workspace after AI processing
  --debug                Include debug comments in decompiled output
  -h, --help             Display help
```

### Run without building

```bash
bun run start -- MyClass.class -o ./output
```

## Library API

### AIPostProcessor

Standalone post-processor that takes already-decompiled Java source and improves it via an AI agent.

```typescript
import { AIPostProcessor } from '@blkswn/java-decompiler-ai';

const processor = new AIPostProcessor({
  connection: { baseUrl: 'http://localhost:4096' },
  model: {
    providerID: 'anthropic',
    modelID: 'claude-sonnet-4-20250514',
  },
});

// Check server connectivity
const healthy = await processor.healthCheck();

// Post-process decompiled sources
const sources = new Map<string, string>([
  ['com/example/MyClass', 'public class MyClass { ... }'],
]);

const result = await processor.postProcess(sources);
// result.sources → Map with improved source code
// result.sessionId → OpenCode session ID for debugging
```

### AIJavaDecompiler

Convenience wrapper that combines decompilation and AI cleanup in one step.

```typescript
import { AIJavaDecompiler } from '@blkswn/java-decompiler-ai';

const decompiler = new AIJavaDecompiler({
  decompilerOptions: {
    resolveReferences: true,
    constantFolding: true,
  },
  aiOptions: {
    model: { providerID: 'anthropic', modelID: 'claude-sonnet-4-20250514' },
  },
});

// Single class file
const source = await decompiler.decompileClassFileBytes(classBytes);

// Multiple classes (from a JAR)
const result = await decompiler.decompileClassIRs(classIRs);
for (const [className, source] of result.sources) {
  console.log(`${className}:\n${source}`);
}
```

### Options

```typescript
interface AIPostProcessorOptions {
  connection?: {
    baseUrl?: string;      // default: "http://localhost:4096"
    timeout?: number;      // default: 120000
    maxRetries?: number;   // default: 2
  };
  model?: {
    providerID?: string;   // default: "anthropic"
    modelID?: string;      // default: "claude-sonnet-4-20250514"
  };
  systemPrompt?: string;          // replace default prompt entirely
  additionalInstructions?: string; // append to default prompt
  workspaceDir?: string;          // custom temp directory
  cleanupWorkspace?: boolean;     // default: true
  agentTimeout?: number;          // default: 300000
}
```

### Custom Instructions

Append additional rules to the default cleanup prompt:

```typescript
const processor = new AIPostProcessor({
  additionalInstructions: 'Also add Javadoc to all public methods.',
});
```

Or replace the prompt entirely:

```typescript
const processor = new AIPostProcessor({
  systemPrompt: 'You are a Java expert. Reformat this code using Google Java Style.',
});
```

## How It Works

1. Decompiled Java sources are written to a temporary workspace directory (preserving package structure)
2. An OpenCode session is created and the AI agent is given instructions to clean up the files
3. The agent reads each `.java` file, applies improvements, and writes them back
4. The improved files are read back and returned
5. The temporary workspace is cleaned up (unless `--no-cleanup` is used)

The AI agent is instructed to:
- Fix formatting (4-space indent, consistent brace style)
- Improve auto-generated variable names (`var1` → meaningful names)
- Fix decompiler artifacts (unnecessary casts, broken string concat, etc.)
- **Never** change the logical behavior of the code
