# @blkswn/java-asm

A TypeScript implementation of OW2 ASM - a Java bytecode manipulation and analysis framework.

## Features

- Full Java bytecode parsing (ClassReader)
- Full Java bytecode generation (ClassWriter)
- Visitor pattern API for class transformation
- Support for all Java bytecode instructions
- Frame support for reading/writing StackMapTable
- TypeScript-first with full type definitions
- Complete annotation support (including type annotations and parameter annotations)
- Module support (Java 9+)
- Record support (Java 16+)
- Generic signature parsing and writing
- Bootstrap method support for invokedynamic and ConstantDynamic

## Installation

```bash
npm install @blkswn/java-asm
```

## Usage

### Reading a Class File

```typescript
import { ClassReader, ClassVisitor, Opcodes } from '@blkswn/java-asm';

// Read class bytes (e.g., from a .class file)
const classBytes = new Uint8Array([...]); // Your class file bytes

const reader = new ClassReader(classBytes);
reader.accept(new MyClassVisitor(), 0);
```

### Writing a Class File

```typescript
import { ClassWriter, Opcodes } from '@blkswn/java-asm';

const writer = new ClassWriter(0);
writer.visit(
  Opcodes.V11,
  Opcodes.ACC_PUBLIC,
  'com/example/MyClass',
  null,
  'java/lang/Object',
  null
);

// Add fields, methods, etc.

const bytes = writer.toByteArray();
```

### Parsing Generic Signatures

```typescript
import { SignatureReader, SignatureWriter, SignatureVisitor } from '@blkswn/java-asm';

// Parse a generic signature
const reader = new SignatureReader('<T:Ljava/lang/Object;>Ljava/util/List<TT;>;');
reader.accept(mySignatureVisitor);

// Build a generic signature
const writer = new SignatureWriter();
writer.visitFormalTypeParameter('T');
writer.visitClassBound().visitClassType('java/lang/Object');
writer.visitClassBound().visitEnd();
// ... more visits
const signature = writer.toString();
```

### Working with Modules

```typescript
import { ClassWriter, Opcodes } from '@blkswn/java-asm';

const writer = new ClassWriter(0);
writer.visit(Opcodes.V11, Opcodes.ACC_MODULE, 'module-info', null, null, null);

const moduleVisitor = writer.visitModule('com.example.mymodule', Opcodes.ACC_OPEN, '1.0');
if (moduleVisitor) {
  moduleVisitor.visitRequire('java.base', Opcodes.ACC_MANDATED, null);
  moduleVisitor.visitExport('com/example/api', 0, null);
  moduleVisitor.visitEnd();
}

writer.visitEnd();
const bytes = writer.toByteArray();
```

### Working with Records

```typescript
import { ClassWriter, Opcodes } from '@blkswn/java-asm';

const writer = new ClassWriter(0);
writer.visit(
  Opcodes.V16,
  Opcodes.ACC_PUBLIC | Opcodes.ACC_FINAL | Opcodes.ACC_RECORD,
  'com/example/Point',
  null,
  'java/lang/Record',
  null
);

// Add record components
const component1 = writer.visitRecordComponent('x', 'I', null);
component1?.visitEnd();

const component2 = writer.visitRecordComponent('y', 'I', null);
component2?.visitEnd();

writer.visitEnd();
const bytes = writer.toByteArray();
```

## API Overview

### Core Classes

- `ClassReader` - Parses Java class files
- `ClassWriter` - Generates Java class files
- `ClassVisitor` - Abstract visitor for class elements
- `MethodVisitor` - Abstract visitor for method bytecode
- `FieldVisitor` - Abstract visitor for fields
- `AnnotationVisitor` - Abstract visitor for annotations
- `ModuleVisitor` - Abstract visitor for module declarations
- `RecordComponentVisitor` - Abstract visitor for record components
- `SignatureVisitor` - Abstract visitor for generic signatures

### Readers and Writers

- `SignatureReader` - Parses generic type signatures
- `SignatureWriter` - Generates generic type signatures
- `ModuleWriter` - Generates Module attributes
- `RecordComponentWriter` - Generates record component info

### Type Utilities

- `Type` - Type descriptors and utilities
- `TypePath` - Paths into type arguments
- `TypeReference` - References to types in annotations
- `Handle` - Method handles for invokedynamic
- `ConstantDynamic` - Dynamic constants

### Constants

- `Opcodes` - All JVM opcodes and constants (ASM4-ASM9)

### Exceptions

- `AsmError` - Base exception for ASM errors
- `InvalidClassError` - Invalid class file format
- `UnsupportedClassVersionError` - Unsupported class version
- `UnknownOpcodeError` - Unknown bytecode opcode
- `SignatureParseError` - Signature parsing error

## Supported Java Versions

This library supports class files from Java 1.1 through Java 21 (class file versions 45.3 through 65.0).

## License

BSD-3-Clause (same as OW2 ASM)
