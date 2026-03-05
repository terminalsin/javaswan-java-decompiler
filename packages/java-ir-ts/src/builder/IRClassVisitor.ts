import { AnnotationVisitor, ClassVisitor, FieldVisitor, MethodVisitor, Type, ASM9 } from '@blkswn/java-asm';
import type { AnnotationIR } from '../ir/AnnotationIR';
import { ClassIR, type InnerClassInfo } from '../ir/ClassIR';
import { FieldIR } from '../ir/FieldIR';
import { MethodIR } from '../ir/MethodIR';
import { IRAnnotationVisitor } from './IRAnnotationVisitor';
import { IRMethodVisitor } from './IRMethodVisitor';

/**
 * A class visitor that builds IR from bytecode.
 */
export class IRClassVisitor extends ClassVisitor {
  private classIR: ClassIR | null = null;

  constructor() {
    super(ASM9, null);
  }

  /**
   * Gets the class IR being built.
   */
  public getClassIR(): ClassIR | null {
    return this.classIR;
  }

  public visit(
    version: number,
    access: number,
    name: string,
    signature: string | null,
    superName: string | null,
    interfaces: string[] | null
  ): void {
    this.classIR = new ClassIR(
      version,
      access,
      name,
      signature,
      superName,
      interfaces ?? []
    );
  }

  public visitSource(source: string | null, debug: string | null): void {
    if (this.classIR && source !== null) {
      this.classIR.sourceFile = source;
    }
  }

  public visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    if (!this.classIR) return null;
    const av = new IRAnnotationVisitor();
    const classIR = this.classIR;
    return new AnnotationCollectorProxy(av, () => {
      classIR.annotations.push({ descriptor, visible, values: av.entries });
    });
  }

  public visitInnerClass(
    name: string,
    outerName: string | null,
    innerName: string | null,
    access: number
  ): void {
    if (this.classIR) {
      const innerClass: InnerClassInfo = {
        name,
        outerName,
        innerName,
        access,
      };
      this.classIR.addInnerClass(innerClass);
    }
  }

  public visitField(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    value: unknown
  ): FieldVisitor | null {
    if (!this.classIR) return null;

    const fieldType = Type.getType(descriptor);
    const fieldIR = new FieldIR(
      access,
      name,
      descriptor,
      fieldType,
      signature,
      value
    );
    this.classIR.addField(fieldIR);

    return new IRFieldVisitor(fieldIR);
  }

  public visitMethod(
    access: number,
    name: string,
    descriptor: string,
    signature: string | null,
    exceptions: string[] | null
  ): MethodVisitor | null {
    if (!this.classIR) {
      return null;
    }

    const returnType = Type.getReturnType(descriptor);
    const parameterTypes = Type.getArgumentTypes(descriptor);

    const methodIR = new MethodIR(
      access,
      name,
      descriptor,
      signature,
      exceptions ?? [],
      returnType,
      parameterTypes
    );

    this.classIR.addMethod(methodIR);

    // Abstract and native methods don't have code but may have annotations
    if ((access & 0x0400) !== 0 || (access & 0x0100) !== 0) {
      return new IRMethodAnnotationOnlyVisitor(methodIR);
    }

    return new IRMethodVisitorWithAnnotations(methodIR);
  }

  public visitEnd(): void {
    // Finalization if needed
  }
}

/**
 * A proxy AnnotationVisitor that delegates to an IRAnnotationVisitor and
 * calls a callback on visitEnd to store the collected annotation.
 */
class AnnotationCollectorProxy extends AnnotationVisitor {
  private readonly onEnd: () => void;

  constructor(delegate: IRAnnotationVisitor, onEnd: () => void) {
    super(ASM9, delegate);
    this.onEnd = onEnd;
  }

  visitEnd(): void {
    super.visitEnd();
    this.onEnd();
  }
}

/**
 * FieldVisitor that captures field annotations.
 */
class IRFieldVisitor extends FieldVisitor {
  private readonly fieldIR: FieldIR;

  constructor(fieldIR: FieldIR) {
    super(ASM9, null);
    this.fieldIR = fieldIR;
  }

  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    const av = new IRAnnotationVisitor();
    const fieldIR = this.fieldIR;
    return new AnnotationCollectorProxy(av, () => {
      fieldIR.annotations.push({ descriptor, visible, values: av.entries });
    });
  }
}

/**
 * MethodVisitor that only captures annotations (for abstract/native methods).
 */
class IRMethodAnnotationOnlyVisitor extends MethodVisitor {
  private readonly methodIR: MethodIR;

  constructor(methodIR: MethodIR) {
    super(ASM9, null);
    this.methodIR = methodIR;
  }

  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    const av = new IRAnnotationVisitor();
    const methodIR = this.methodIR;
    return new AnnotationCollectorProxy(av, () => {
      methodIR.annotations.push({ descriptor, visible, values: av.entries });
    });
  }
}

/**
 * MethodVisitor that delegates to IRMethodVisitor for code AND captures annotations.
 */
class IRMethodVisitorWithAnnotations extends MethodVisitor {
  private readonly methodIR: MethodIR;

  constructor(methodIR: MethodIR) {
    super(ASM9, new IRMethodVisitor(methodIR));
    this.methodIR = methodIR;
  }

  visitAnnotation(descriptor: string, visible: boolean): AnnotationVisitor | null {
    const av = new IRAnnotationVisitor();
    const methodIR = this.methodIR;
    return new AnnotationCollectorProxy(av, () => {
      methodIR.annotations.push({ descriptor, visible, values: av.entries });
    });
  }
}
