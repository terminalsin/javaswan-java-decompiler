import type { AnnotationIR, AnnotationEntry, AnnotationValue } from '@blkswn/java-ir';
import type { JavaSourceWriter } from './printing/JavaSourceWriter';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from './formatting/JavaTypeNameFormatter';
import { Type } from '@blkswn/java-asm';

/**
 * Emits annotation declarations above class/field/method declarations.
 */
export class JavaAnnotationSourceEmitter {
  private readonly typeNameFormatter = new JavaTypeNameFormatter();

  /**
   * Annotations to skip because they're redundant or compiler-internal.
   */
  private static readonly SKIP_ANNOTATIONS = new Set([
    'Ljava/lang/annotation/Documented;',
    'Ljava/lang/annotation/Retention;',
    'Ljava/lang/annotation/Target;',
  ]);

  public emit(
    annotations: readonly AnnotationIR[] | undefined,
    writer: JavaSourceWriter,
    typeContext: JavaTypeNameFormattingContext
  ): void {
    if (!annotations) return;
    for (const ann of annotations) {
      if (JavaAnnotationSourceEmitter.SKIP_ANNOTATIONS.has(ann.descriptor)) continue;

      const typeName = this.formatAnnotationTypeName(ann.descriptor, typeContext);
      const values = this.formatAnnotationValues(ann.values, typeContext);

      if (values) {
        writer.writeLine(`@${typeName}(${values})`);
      } else {
        writer.writeLine(`@${typeName}`);
      }
    }
  }

  private formatAnnotationTypeName(descriptor: string, ctx: JavaTypeNameFormattingContext): string {
    // Descriptor is like "Ljava/lang/Override;" — convert to internal name
    if (descriptor.startsWith('L') && descriptor.endsWith(';')) {
      const internalName = descriptor.slice(1, -1);
      return this.typeNameFormatter.formatInternalName(internalName, ctx);
    }
    return descriptor;
  }

  private formatAnnotationValues(entries: readonly AnnotationEntry[], ctx: JavaTypeNameFormattingContext): string | null {
    if (entries.length === 0) return null;

    // Single unnamed value: @Annotation(value)
    if (entries.length === 1 && entries[0]!.name === 'value') {
      return this.formatValue(entries[0]!.value, ctx);
    }

    // Multiple named values: @Annotation(key1 = value1, key2 = value2)
    return entries
      .map(e => {
        const val = this.formatValue(e.value, ctx);
        return e.name ? `${e.name} = ${val}` : val;
      })
      .join(', ');
  }

  private formatValue(value: AnnotationValue, ctx: JavaTypeNameFormattingContext): string {
    if (typeof value === 'string') return `"${this.escapeString(value)}"`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);

    if (typeof value === 'object' && value !== null) {
      if (value.type === 'class') {
        try {
          const type = Type.getType(value.descriptor);
          return `${this.typeNameFormatter.formatType(type, ctx)}.class`;
        } catch {
          return `${value.descriptor}.class`;
        }
      }
      if (value.type === 'enum') {
        const enumType = this.formatAnnotationTypeName(value.descriptor, ctx);
        return `${enumType}.${value.value}`;
      }
      if (value.type === 'annotation') {
        const typeName = this.formatAnnotationTypeName(value.descriptor, ctx);
        const nested = this.formatAnnotationValues(value.values, ctx);
        return nested ? `@${typeName}(${nested})` : `@${typeName}`;
      }
      if (value.type === 'array') {
        if (value.values.length === 1) {
          return this.formatValue(value.values[0]!, ctx);
        }
        const elems = value.values.map(v => this.formatValue(v, ctx)).join(', ');
        return `{${elems}}`;
      }
    }

    return String(value);
  }

  private escapeString(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
