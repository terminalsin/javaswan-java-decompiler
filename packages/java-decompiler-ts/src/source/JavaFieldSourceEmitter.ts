import type { FieldIR } from '@blkswn/java-ir';
import { Type } from '@blkswn/java-asm';
import type { JavaSourceWriter } from './printing/JavaSourceWriter';
import { JavaAccessFlagFormatter } from './formatting/JavaAccessFlagFormatter';
import { JavaTypeNameFormatter } from './formatting/JavaTypeNameFormatter';
import { JavaSignatureFormatter } from './formatting/JavaSignatureFormatter';
import { JavaLiteralFormatter } from './formatting/JavaLiteralFormatter';
import { JavaIdentifierSanitizer } from './naming/JavaIdentifierSanitizer';
import { JavaAnnotationSourceEmitter } from './JavaAnnotationSourceEmitter';
import type { JavaClassDecompilationContext } from './context/JavaClassDecompilationContext';

export class JavaFieldSourceEmitter {
  private readonly accessFormatter = new JavaAccessFlagFormatter();
  private readonly typeNameFormatter = new JavaTypeNameFormatter();
  private readonly signatureFormatter = new JavaSignatureFormatter();
  private readonly literalFormatter = new JavaLiteralFormatter();
  private readonly sanitizer = new JavaIdentifierSanitizer();
  private readonly annotationEmitter = new JavaAnnotationSourceEmitter();

  public emit(field: FieldIR, writer: JavaSourceWriter, classCtx: JavaClassDecompilationContext): void {
    this.annotationEmitter.emit(field.annotations, writer, {
      currentPackageName: classCtx.currentPackageName,
      preferSimpleJavaLang: true,
      innerClassSimpleNames: classCtx.innerClassSimpleNames,
      importCollector: classCtx.importCollector,
    });
    const modifiers = this.accessFormatter.formatFieldModifiers(field.access);
    const typeContext = {
      currentPackageName: classCtx.currentPackageName,
      preferSimpleJavaLang: true,
      innerClassSimpleNames: classCtx.innerClassSimpleNames,
      importCollector: classCtx.importCollector,
    };
    // Prefer generic signature when available
    const typeName = (field.signature && this.signatureFormatter.formatTypeSignature(field.signature, typeContext))
      ?? this.typeNameFormatter.formatType(field.type, typeContext);
    const name = this.sanitizer.sanitize(field.name);

    const init = this.formatInitializer(field.initialValue, field.type, classCtx);
    writer.writeLine(`${modifiers}${typeName} ${name}${init};`);
  }

  private formatInitializer(value: unknown, typeHint: import('@blkswn/java-asm').Type, classCtx: JavaClassDecompilationContext): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (value instanceof Type) {
      const t = this.typeNameFormatter.formatType(value, {
        currentPackageName: classCtx.currentPackageName,
        preferSimpleJavaLang: true,
        innerClassSimpleNames: classCtx.innerClassSimpleNames,
        importCollector: classCtx.importCollector,
      });
      return ` = ${t}.class`;
    }

    return ` = ${this.literalFormatter.format(value, typeHint)}`;
  }
}

