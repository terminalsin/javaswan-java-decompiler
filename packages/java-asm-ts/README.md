![logo](docs/logo.png)
<p align="center">
  <a href="https://www.npmjs.com/package/@blkswn/java-asm">
    <img alt="npm version" src="https://img.shields.io/npm/v/@blkswn/java-asm?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/@blkswn/java-asm">
    <img alt="NPM Downloads" src="https://img.shields.io/npm/dm/@blkswn/java-asm?style=flat-square">
  </a>
  <a href="https://github.com/blackswanhq/java-asm-ts/blob/main/LICENSE">
    <img alt="License: BSD-3-Clause" src="https://img.shields.io/github/license/blackswanhq/java-asm-ts?style=flat-square">
  </a>
  <a href="https://github.com/blackswanhq/java-asm-ts/issues">
    <img alt="Issues" src="https://img.shields.io/github/issues/blackswanhq/java-asm-ts?style=flat-square">
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=blackswanlabs">
    <img alt="Follow @blackswanlabs" src="https://img.shields.io/twitter/follow/blackswanlabs?label=Follow&style=flat-square">
  </a>
  <a href="https://discord.gg/X9yRzJWTVt">
    <img alt="Discord" src="https://img.shields.io/discord/1181964512292647004?label=discord&style=flat-square">
  </a>
  <a href="https://opensource.org/licenses/BSD-3-Clause">
    <img alt="BSD-3-Clause" src="https://img.shields.io/badge/license-BSD--3--Clause-blue?style=flat-square">
  </a>
</p>


# @blkswn/java-asm

TypeScript port of [OW2 ASM](https://asm.ow2.io/). Read, write, and transform Java bytecode.

Supports Java 1.1 through Java 27. Same visitor API as ASM.

## Install

```bash
npm install @blkswn/java-asm
```

## Read a class file

```typescript
import { ClassReader, ClassVisitor, FieldVisitor, MethodVisitor, Opcodes } from "@blkswn/java-asm";
import fs from "fs";

const bytecode = new Uint8Array(fs.readFileSync("MyClass.class"));
const reader = new ClassReader(bytecode);

// Quick inspection
console.log(reader.getClassName());    // "com/example/MyClass"
console.log(reader.getSuperClassName()); // "java/lang/Object"
console.log(reader.getInterfaces());   // ["java/io/Serializable"]

// Walk the full structure with a visitor
class Printer extends ClassVisitor {
  constructor() { super(Opcodes.ASM9); }

  visit(version: number, access: number, name: string) {
    console.log(`class ${name} (Java ${version & 0xffff})`);
  }

  visitField(access: number, name: string, descriptor: string): FieldVisitor | null {
    console.log(`  field ${name}: ${descriptor}`);
    return null;
  }

  visitMethod(access: number, name: string, descriptor: string): MethodVisitor | null {
    console.log(`  method ${name}${descriptor}`);
    return null;
  }
}

reader.accept(new Printer(), 0);
```

## Write a class file

```typescript
import { ClassWriter, Opcodes } from "@blkswn/java-asm";

const cw = new ClassWriter(0);
cw.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC, "com/example/Greeter", null, "java/lang/Object", null);

// field: private String name;
const fv = cw.visitField(Opcodes.ACC_PRIVATE, "name", "Ljava/lang/String;", null, null);
fv?.visitEnd();

// method: public static int add(int a, int b) { return a + b; }
const mv = cw.visitMethod(
  Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC,
  "add", "(II)I", null, null
);
if (mv) {
  mv.visitCode();
  mv.visitVarInsn(Opcodes.ILOAD, 0);
  mv.visitVarInsn(Opcodes.ILOAD, 1);
  mv.visitInsn(Opcodes.IADD);
  mv.visitInsn(Opcodes.IRETURN);
  mv.visitMaxs(2, 2);
  mv.visitEnd();
}

cw.visitEnd();

const bytes: Uint8Array = cw.toByteArray();
fs.writeFileSync("Greeter.class", bytes);
```

## Copy/transform a class

Pass a `ClassWriter` as the delegate to a `ClassVisitor`. The reader pipes events through your visitor into the writer — override what you want to change, everything else passes through.

```typescript
import { ClassReader, ClassWriter, ClassVisitor, MethodVisitor, Opcodes, COMPUTE_MAXS } from "@blkswn/java-asm";

const original = new Uint8Array(fs.readFileSync("Input.class"));

const reader = new ClassReader(original);
const writer = new ClassWriter(COMPUTE_MAXS);

// Pass-through: copies the class unchanged
reader.accept(writer, 0);

const output: Uint8Array = writer.toByteArray();
```

To transform, insert a visitor in the middle:

```typescript
class MethodRenamer extends ClassVisitor {
  constructor(delegate: ClassVisitor) {
    super(Opcodes.ASM9, delegate);
  }

  visitMethod(access: number, name: string, descriptor: string,
              signature: string | null, exceptions: string[] | null): MethodVisitor | null {
    // rename "oldName" → "newName", pass everything else through
    const newName = name === "oldName" ? "newName" : name;
    return super.visitMethod(access, newName, descriptor, signature, exceptions);
  }
}

const reader = new ClassReader(original);
const writer = new ClassWriter(COMPUTE_MAXS);
reader.accept(new MethodRenamer(writer), 0);
```

## Process a JAR

```typescript
import JSZip from "jszip";
import { ClassReader, ClassWriter, COMPUTE_MAXS } from "@blkswn/java-asm";

const zip = await JSZip.loadAsync(fs.readFileSync("app.jar"));

for (const [name, entry] of Object.entries(zip.files)) {
  if (!name.endsWith(".class")) continue;

  const bytecode = await entry.async("uint8array");
  const reader = new ClassReader(bytecode);
  const writer = new ClassWriter(COMPUTE_MAXS);
  reader.accept(writer, 0); // or insert your transformer here

  zip.file(name, writer.toByteArray());
}

const out = await zip.generateAsync({ type: "uint8array" });
fs.writeFileSync("app-modified.jar", out);
```

## Control flow

```typescript
import { Label } from "@blkswn/java-asm";

// public static int max(int a, int b)
const mv = cw.visitMethod(Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC, "max", "(II)I", null, null);
if (mv) {
  mv.visitCode();
  const elseLabel = new Label();
  const endLabel = new Label();

  mv.visitVarInsn(Opcodes.ILOAD, 0);
  mv.visitVarInsn(Opcodes.ILOAD, 1);
  mv.visitJumpInsn(Opcodes.IF_ICMPLE, elseLabel);

  mv.visitVarInsn(Opcodes.ILOAD, 0);       // a > b: return a
  mv.visitJumpInsn(Opcodes.GOTO, endLabel);

  mv.visitLabel(elseLabel);
  mv.visitVarInsn(Opcodes.ILOAD, 1);       // else: return b

  mv.visitLabel(endLabel);
  mv.visitInsn(Opcodes.IRETURN);
  mv.visitMaxs(2, 2);
  mv.visitEnd();
}
```

## API at a glance

| | Read | Write | Visit |
|---|---|---|---|
| **Class** | `ClassReader` | `ClassWriter` | `ClassVisitor` |
| **Method** | — | — | `MethodVisitor` |
| **Field** | — | — | `FieldVisitor` |
| **Annotation** | — | — | `AnnotationVisitor` |
| **Signature** | `SignatureReader` | `SignatureWriter` | `SignatureVisitor` |
| **Module** | — | `ModuleWriter` | `ModuleVisitor` |
| **Record** | — | `RecordComponentWriter` | `RecordComponentVisitor` |

Utilities: `Opcodes`, `Type`, `Label`, `Handle`, `ConstantDynamic`

## License

BSD-3-Clause (same as OW2 ASM)
