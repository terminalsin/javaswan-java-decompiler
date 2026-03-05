import { Type, TypeSort } from '@blkswn/java-asm';

export interface JavaTypeNameFormattingContext {
  readonly currentPackageName: string | null;
  readonly preferSimpleJavaLang: boolean;
  /** Maps inner class internal names to their simple names for resolution. */
  readonly innerClassSimpleNames?: ReadonlyMap<string, string>;
  /** When present, collects fully-qualified type names that need import statements. */
  readonly importCollector?: Set<string>;
}

const DEFAULT_CONTEXT: JavaTypeNameFormattingContext = {
  currentPackageName: null,
  preferSimpleJavaLang: true,
};

export class JavaTypeNameFormatter {
  public formatType(type: Type, context: Partial<JavaTypeNameFormattingContext> = {}): string {
    const ctx: JavaTypeNameFormattingContext = { ...DEFAULT_CONTEXT, ...context };

    const sort = type.getSort();
    if (sort === TypeSort.ARRAY) {
      return this.formatArrayType(type, ctx);
    }

    if (sort === TypeSort.OBJECT) {
      const internalName = type.getInternalName();
      if (ctx.innerClassSimpleNames?.has(internalName)) {
        return ctx.innerClassSimpleNames.get(internalName)!;
      }
      return this.simplifyQualifiedName(internalName.replace(/\//g, '.'), ctx);
    }

    // Primitive / void
    return type.getClassName();
  }

  public formatInternalName(internalName: string, context: Partial<JavaTypeNameFormattingContext> = {}): string {
    const ctx: JavaTypeNameFormattingContext = { ...DEFAULT_CONTEXT, ...context };
    if (ctx.innerClassSimpleNames?.has(internalName)) {
      return ctx.innerClassSimpleNames.get(internalName)!;
    }
    return this.simplifyQualifiedName(internalName.replace(/\//g, '.'), ctx);
  }

  private formatArrayType(type: Type, ctx: JavaTypeNameFormattingContext): string {
    const dims = type.getDimensions();
    const element = type.getElementType();
    const base = this.formatType(element, ctx);
    return base + '[]'.repeat(dims);
  }

  private simplifyQualifiedName(qualifiedName: string, ctx: JavaTypeNameFormattingContext): string {
    // java.lang direct members (e.g. java.lang.String, not java.lang.reflect.Method)
    if (ctx.preferSimpleJavaLang && qualifiedName.startsWith('java.lang.')) {
      const afterPrefix = qualifiedName.slice('java.lang.'.length);
      if (!afterPrefix.includes('.')) {
        return afterPrefix;
      }
    }

    // Same-package types
    if (ctx.currentPackageName && qualifiedName.startsWith(ctx.currentPackageName + '.')) {
      const afterPrefix = qualifiedName.slice(ctx.currentPackageName.length + 1);
      if (!afterPrefix.includes('.')) {
        return afterPrefix;
      }
    }

    // When import collector is present, simplify to simple name and collect FQN
    if (ctx.importCollector) {
      ctx.importCollector.add(qualifiedName);
      const lastDot = qualifiedName.lastIndexOf('.');
      return lastDot >= 0 ? qualifiedName.substring(lastDot + 1) : qualifiedName;
    }

    return qualifiedName;
  }
}

