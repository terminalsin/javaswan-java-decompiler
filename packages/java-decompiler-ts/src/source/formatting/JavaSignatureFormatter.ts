import { SignatureReader, SignatureVisitor, ASM9 } from '@blkswn/java-asm';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from './JavaTypeNameFormatter';

/**
 * Formats JVM generic type signatures into Java source-level type strings.
 *
 * Uses ASM's SignatureReader + SignatureVisitor to parse the signature,
 * then reconstructs readable Java types with generic parameters.
 */
export class JavaSignatureFormatter {
  private readonly typeNameFormatter = new JavaTypeNameFormatter();

  /**
   * Formats a field/local variable type signature.
   * E.g. `Ljava/util/List<Ljava/lang/String;>;` → `List<String>`
   */
  public formatTypeSignature(signature: string, ctx: JavaTypeNameFormattingContext): string | null {
    try {
      const reader = new SignatureReader(signature);
      let result = '';
      const visitor = new TypeFormattingVisitorForBound(this.typeNameFormatter, ctx, (r) => { result = r; });
      reader.acceptType(visitor);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Formats a method signature, returning parameter types and return type with generics.
   * E.g. `(Ljava/util/List<Ljava/lang/String;>;)Ljava/util/Map<Ljava/lang/String;Ljava/lang/Integer;>;`
   * → { params: ['List<String>'], returnType: 'Map<String, Integer>', typeParams: null }
   */
  public formatMethodSignature(
    signature: string,
    ctx: JavaTypeNameFormattingContext
  ): { typeParams: string | null; params: string[]; returnType: string } | null {
    try {
      const reader = new SignatureReader(signature);
      const visitor = new MethodSignatureFormattingVisitor(this.typeNameFormatter, ctx);
      // SignatureReader.accept handles both class and method signatures via '(' detection
      reader.accept(visitor);
      return visitor.getResult();
    } catch {
      return null;
    }
  }

  /**
   * Formats a class signature, returning super type and interface types with generics,
   * plus any type parameters declared on the class.
   * E.g. `<T:Ljava/lang/Object;>Ljava/lang/Object;Ljava/lang/Comparable<TT;>;`
   * → { typeParams: '<T>', superType: 'Object', interfaces: ['Comparable<T>'] }
   */
  public formatClassSignature(
    signature: string,
    ctx: JavaTypeNameFormattingContext
  ): { typeParams: string | null; superType: string; interfaces: string[] } | null {
    try {
      const reader = new SignatureReader(signature);
      const visitor = new ClassSignatureFormattingVisitor(this.typeNameFormatter, ctx);
      reader.accept(visitor);
      return visitor.getResult();
    } catch {
      return null;
    }
  }
}

// Base type descriptor → Java keyword
const BASE_TYPE_NAMES: Record<string, string> = {
  Z: 'boolean',
  B: 'byte',
  C: 'char',
  S: 'short',
  I: 'int',
  F: 'float',
  J: 'long',
  D: 'double',
  V: 'void',
};

/**
 * Visitor for method signatures.
 */
class MethodSignatureFormattingVisitor extends SignatureVisitor {
  private readonly formatter: JavaTypeNameFormatter;
  private readonly ctx: JavaTypeNameFormattingContext;

  private formalTypeParams: string[] = [];
  private currentBounds: string[] = [];
  private currentParamName = '';

  private params: string[] = [];
  private returnType = 'void';
  private phase: 'typeParams' | 'params' | 'return' = 'typeParams';

  constructor(formatter: JavaTypeNameFormatter, ctx: JavaTypeNameFormattingContext) {
    super(ASM9);
    this.formatter = formatter;
    this.ctx = ctx;
  }

  getResult(): { typeParams: string | null; params: string[]; returnType: string } {
    this.finishCurrentTypeParam();
    const typeParams = this.formalTypeParams.length > 0
      ? `<${this.formalTypeParams.join(', ')}>`
      : null;
    return { typeParams, params: this.params, returnType: this.returnType };
  }

  visitFormalTypeParameter(name: string): void {
    this.finishCurrentTypeParam();
    this.currentParamName = name;
    this.currentBounds = [];
  }

  visitClassBound(): SignatureVisitor {
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      if (result !== 'Object') {
        this.currentBounds.push(result);
      }
    });
  }

  visitInterfaceBound(): SignatureVisitor {
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      this.currentBounds.push(result);
    });
  }

  visitParameterType(): SignatureVisitor {
    this.finishCurrentTypeParam();
    this.phase = 'params';
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      this.params.push(result);
    });
  }

  visitReturnType(): SignatureVisitor {
    this.finishCurrentTypeParam();
    this.phase = 'return';
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      this.returnType = result;
    });
  }

  private finishCurrentTypeParam(): void {
    if (this.currentParamName) {
      const bounds = this.currentBounds.length > 0
        ? ` extends ${this.currentBounds.join(' & ')}`
        : '';
      this.formalTypeParams.push(`${this.currentParamName}${bounds}`);
      this.currentParamName = '';
      this.currentBounds = [];
    }
  }
}

/**
 * Visitor for class signatures.
 */
class ClassSignatureFormattingVisitor extends SignatureVisitor {
  private readonly formatter: JavaTypeNameFormatter;
  private readonly ctx: JavaTypeNameFormattingContext;

  private formalTypeParams: string[] = [];
  private currentBounds: string[] = [];
  private currentParamName = '';

  private superType = 'Object';
  private interfaces: string[] = [];

  constructor(formatter: JavaTypeNameFormatter, ctx: JavaTypeNameFormattingContext) {
    super(ASM9);
    this.formatter = formatter;
    this.ctx = ctx;
  }

  getResult(): { typeParams: string | null; superType: string; interfaces: string[] } {
    this.finishCurrentTypeParam();
    const typeParams = this.formalTypeParams.length > 0
      ? `<${this.formalTypeParams.join(', ')}>`
      : null;
    return { typeParams, superType: this.superType, interfaces: this.interfaces };
  }

  visitFormalTypeParameter(name: string): void {
    this.finishCurrentTypeParam();
    this.currentParamName = name;
    this.currentBounds = [];
  }

  visitClassBound(): SignatureVisitor {
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      if (result !== 'Object') {
        this.currentBounds.push(result);
      }
    });
  }

  visitInterfaceBound(): SignatureVisitor {
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      this.currentBounds.push(result);
    });
  }

  visitSuperclass(): SignatureVisitor {
    this.finishCurrentTypeParam();
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      this.superType = result;
    });
  }

  visitInterface(): SignatureVisitor {
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      this.interfaces.push(result);
    });
  }

  private finishCurrentTypeParam(): void {
    if (this.currentParamName) {
      const bounds = this.currentBounds.length > 0
        ? ` extends ${this.currentBounds.join(' & ')}`
        : '';
      this.formalTypeParams.push(`${this.currentParamName}${bounds}`);
      this.currentParamName = '';
      this.currentBounds = [];
    }
  }
}

/**
 * A self-contained type visitor that calls a callback with the formatted result on visitEnd.
 */
class TypeFormattingVisitorForBound extends SignatureVisitor {
  private readonly formatter: JavaTypeNameFormatter;
  private readonly ctx: JavaTypeNameFormattingContext;
  private readonly onResult: (result: string) => void;

  private typeName = '';
  private arrayDepth = 0;
  private typeArgs: string[] = [];
  private hasTypeArgs = false;

  constructor(
    formatter: JavaTypeNameFormatter,
    ctx: JavaTypeNameFormattingContext,
    onResult: (result: string) => void
  ) {
    super(ASM9);
    this.formatter = formatter;
    this.ctx = ctx;
    this.onResult = onResult;
  }

  visitBaseType(descriptor: string): void {
    this.typeName = BASE_TYPE_NAMES[descriptor] ?? descriptor;
    this.onResult(this.typeName + '[]'.repeat(this.arrayDepth));
  }

  visitTypeVariable(name: string): void {
    this.typeName = name;
    this.onResult(this.typeName + '[]'.repeat(this.arrayDepth));
  }

  visitArrayType(): SignatureVisitor {
    this.arrayDepth++;
    return this;
  }

  visitClassType(name: string): void {
    this.typeName = this.formatter.formatInternalName(name, this.ctx);
    this.typeArgs = [];
    this.hasTypeArgs = false;
  }

  visitTypeArgument(): void {
    this.hasTypeArgs = true;
    this.typeArgs.push('?');
  }

  visitTypeArgumentWildcard(wildcard: string): SignatureVisitor {
    this.hasTypeArgs = true;
    return new TypeFormattingVisitorForBound(this.formatter, this.ctx, (result) => {
      if (wildcard === SignatureVisitor.EXTENDS) {
        this.typeArgs.push(`? extends ${result}`);
      } else if (wildcard === SignatureVisitor.SUPER) {
        this.typeArgs.push(`? super ${result}`);
      } else {
        this.typeArgs.push(result);
      }
    });
  }

  visitInnerClassType(name: string): void {
    // Finish current class type, then start inner class
    if (this.hasTypeArgs) {
      this.typeName += `<${this.typeArgs.join(', ')}>`;
    }
    this.typeName += `.${name}`;
    this.typeArgs = [];
    this.hasTypeArgs = false;
  }

  visitEnd(): void {
    if (this.hasTypeArgs) {
      this.typeName += `<${this.typeArgs.join(', ')}>`;
    }
    this.onResult(this.typeName + '[]'.repeat(this.arrayDepth));
  }
}
