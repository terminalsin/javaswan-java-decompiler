import type { MethodIR } from '@blkswn/java-ir';
import type { JavaSourceWriter } from './printing/JavaSourceWriter';
import { JavaAccessFlagFormatter } from './formatting/JavaAccessFlagFormatter';
import { JavaTypeNameFormatter } from './formatting/JavaTypeNameFormatter';
import { JavaSignatureFormatter } from './formatting/JavaSignatureFormatter';
import { JavaIdentifierSanitizer } from './naming/JavaIdentifierSanitizer';
import { JavaMethodParameterNameResolver } from './naming/JavaMethodParameterNameResolver';
import { JavaMethodBodySourceEmitter } from './JavaMethodBodySourceEmitter';
import { JavaAnnotationSourceEmitter } from './JavaAnnotationSourceEmitter';
import type { JavaClassDecompilationContext } from './context/JavaClassDecompilationContext';

export class JavaMethodSourceEmitter {
  private readonly accessFormatter = new JavaAccessFlagFormatter();
  private readonly typeNameFormatter = new JavaTypeNameFormatter();
  private readonly signatureFormatter = new JavaSignatureFormatter();
  private readonly sanitizer = new JavaIdentifierSanitizer();
  private readonly parameterNameResolver = new JavaMethodParameterNameResolver();
  private readonly bodyEmitter = new JavaMethodBodySourceEmitter();
  private readonly annotationEmitter = new JavaAnnotationSourceEmitter();

  public emit(
    method: MethodIR,
    writer: JavaSourceWriter,
    classCtx: JavaClassDecompilationContext,
    classSimpleName: string,
    includeDebugComments: boolean
  ): void {
    // Static initializer
    if (method.isStaticInitializer()) {
      writer.writeLine('static {');
      writer.indent();
      this.bodyEmitter.emit(method, writer, classCtx, includeDebugComments);
      writer.dedent();
      writer.writeLine('}');
      return;
    }

    this.annotationEmitter.emit(method.annotations, writer, {
      currentPackageName: classCtx.currentPackageName,
      preferSimpleJavaLang: true,
      innerClassSimpleNames: classCtx.innerClassSimpleNames,
      importCollector: classCtx.importCollector,
    });

    const modifiers = this.accessFormatter.formatMethodModifiers(method.access);
    const typeContext = {
      currentPackageName: classCtx.currentPackageName,
      preferSimpleJavaLang: true,
      innerClassSimpleNames: classCtx.innerClassSimpleNames,
      importCollector: classCtx.importCollector,
    };
    const throwsClause =
      method.exceptions.length > 0
        ? ` throws ${method.exceptions.map(e => this.typeNameFormatter.formatInternalName(e, typeContext)).join(', ')}`
        : '';

    const paramNames = this.parameterNameResolver.resolve(method);

    // Try to parse generic signature for parameter/return types
    const sigInfo = method.signature
      ? this.signatureFormatter.formatMethodSignature(method.signature, typeContext)
      : null;

    // Enum constructors have two synthetic leading params (String name, int ordinal) — skip them
    const enumParamOffset = (classCtx.isEnum && method.isConstructor()) ? 2 : 0;
    const params = method.parameterTypes
      .slice(enumParamOffset)
      .map((t, i) => {
        const typeName = sigInfo?.params[i + enumParamOffset]
          ?? this.typeNameFormatter.formatType(t, typeContext);
        const name = paramNames[i + enumParamOffset] ?? `arg${i}`;
        return `${typeName} ${name}`;
      })
      .join(', ');

    // Constructor
    if (method.isConstructor()) {
      // Enum constructors are implicitly private — suppress access modifiers
      const ctorModifiers = classCtx.isEnum ? '' : modifiers;
      const typeParamsStr = sigInfo?.typeParams ? `${sigInfo.typeParams} ` : '';
      const signature = `${ctorModifiers}${typeParamsStr}${classSimpleName}(${params})${throwsClause}`;
      if (!method.hasCode()) {
        writer.writeLine(signature + ';');
        return;
      }
      writer.writeLine(signature + ' {');
      writer.indent();
      this.bodyEmitter.emit(method, writer, classCtx, includeDebugComments);
      writer.dedent();
      writer.writeLine('}');
      return;
    }

    const returnType = sigInfo?.returnType
      ?? this.typeNameFormatter.formatType(method.returnType, typeContext);
    const methodName = this.sanitizer.sanitize(method.name);
    const typeParamsStr = sigInfo?.typeParams ? `${sigInfo.typeParams} ` : '';

    // Interface methods: suppress implicit 'public', add 'default' for methods with bodies
    let effectiveModifiers = modifiers;
    if (classCtx.isInterface) {
      // 'public' is implicit in interfaces — strip it
      effectiveModifiers = effectiveModifiers.replace(/^public /, '');
      // Non-abstract, non-static interface methods with a body are 'default' methods
      if (method.hasCode() && (method.access & 0x0008) === 0) { // not static
        effectiveModifiers = `default ${effectiveModifiers}`;
      }
    }

    const signature = `${effectiveModifiers}${typeParamsStr}${returnType} ${methodName}(${params})${throwsClause}`;

    if (!method.hasCode()) {
      writer.writeLine(signature + ';');
      return;
    }

    writer.writeLine(signature + ' {');
    writer.indent();
    this.bodyEmitter.emit(method, writer, classCtx, includeDebugComments);
    writer.dedent();
    writer.writeLine('}');
  }
}

