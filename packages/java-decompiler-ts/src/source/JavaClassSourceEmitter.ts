import type { ClassIR, MethodIR, FieldIR, InnerClassInfo } from '@blkswn/java-ir';
import { FieldStoreStmt, PopStmt, VirtualInvocationExpr, VirtualInvocationKind, NewExpr } from '@blkswn/java-ir';
import { JavaSourceWriter } from './printing/JavaSourceWriter';
import { JavaClassName } from './naming/JavaClassName';
import { JavaAccessFlagFormatter } from './formatting/JavaAccessFlagFormatter';
import { JavaTypeNameFormatter, type JavaTypeNameFormattingContext } from './formatting/JavaTypeNameFormatter';
import { JavaSignatureFormatter } from './formatting/JavaSignatureFormatter';
import { JavaFieldSourceEmitter } from './JavaFieldSourceEmitter';
import { JavaMethodSourceEmitter } from './JavaMethodSourceEmitter';
import { JavaAnnotationSourceEmitter } from './JavaAnnotationSourceEmitter';
import { IrExpressionToJavaAstConverter } from '../javaAst/ir/IrExpressionToJavaAstConverter';
import { JavaAstPrinter } from '../javaAst/printing/JavaAstPrinter';
import type { JavaClassSourceEmitterOptions } from './JavaClassSourceEmitterOptions';
import type { JavaClassDecompilationContext } from './context/JavaClassDecompilationContext';

export class JavaClassSourceEmitter {
  private readonly accessFormatter = new JavaAccessFlagFormatter();
  private readonly typeNameFormatter = new JavaTypeNameFormatter();
  private readonly signatureFormatter = new JavaSignatureFormatter();
  private readonly fieldEmitter = new JavaFieldSourceEmitter();
  private readonly methodEmitter = new JavaMethodSourceEmitter();
  private readonly annotationEmitter = new JavaAnnotationSourceEmitter();
  private readonly exprConverter = new IrExpressionToJavaAstConverter();

  public emit(classIR: ClassIR, options: JavaClassSourceEmitterOptions): { source: string; inlinedInnerClasses: string[] } {
    const className = JavaClassName.fromInternalName(classIR.name);
    const writer = new JavaSourceWriter();
    const importCollector = new Set<string>();

    // Build inner class name map for type resolution
    const innerClassSimpleNames = new Map<string, string>();
    for (const ic of classIR.innerClasses) {
      if (ic.outerName === classIR.name && ic.innerName) {
        innerClassSimpleNames.set(ic.name, ic.innerName);
      }
    }

    const classCtx: JavaClassDecompilationContext = {
      currentClassInternalName: classIR.name,
      currentSuperInternalName: classIR.superName,
      currentPackageName: className.packageName,
      isEnum: classIR.isEnum(),
      isInterface: classIR.isInterface(),
      innerClassSimpleNames: innerClassSimpleNames.size > 0 ? innerClassSimpleNames : undefined,
      classIR,
      importCollector,
    };

    const modifiers = this.accessFormatter.formatClassModifiers(classIR.access);

    const kind = classIR.isAnnotation()
      ? '@interface'
      : classIR.isEnum()
        ? 'enum'
        : classIR.isInterface()
          ? 'interface'
          : 'class';

    // Try to parse generic class signature for type parameters and generic extends/implements
    const typeContext = {
      currentPackageName: classCtx.currentPackageName,
      preferSimpleJavaLang: true,
      innerClassSimpleNames: classCtx.innerClassSimpleNames,
      importCollector: classCtx.importCollector,
    };
    const classSig = classIR.signature
      ? this.signatureFormatter.formatClassSignature(classIR.signature, typeContext)
      : null;

    const typeParamsStr = classSig?.typeParams ?? '';
    const extendsClause = this.formatExtendsClause(classIR, classCtx, classSig);
    const implementsClause = this.formatImplementsClause(classIR, classCtx, classSig);

    this.annotationEmitter.emit(classIR.annotations, writer, typeContext);
    writer.writeLine(`${modifiers}${kind} ${className.simpleName}${typeParamsStr}${extendsClause}${implementsClause} {`);
    writer.indent();

    // Compute visible methods FIRST (needed to know if enum has other members)
    const visibleMethods = classIR.methods.filter(m => {
      // Suppress default constructor: <init>() with only super() call
      if (m.isConstructor()) {
        const effectiveParams = classIR.isEnum() ? m.parameterTypes.length - 2 : m.parameterTypes.length;
        if (effectiveParams === 0 && this.isDefaultConstructor(m)) {
          return false;
        }
        // Suppress synthetic bridge constructors for enums
        if (classIR.isEnum() && (m.access & 0x1000) !== 0) {
          return false;
        }
      }
      // Suppress synthetic enum methods: values() and valueOf(String)
      if (classIR.isEnum() && (m.access & 0x1000) !== 0) { // ACC_SYNTHETIC
        if (m.name === 'values' || m.name === 'valueOf') return false;
      }
      // Suppress values()/valueOf() even without ACC_SYNTHETIC (some compilers)
      if (classIR.isEnum()) {
        if (m.name === 'values' && m.parameterTypes.length === 0) return false;
        if (m.name === 'valueOf' && m.parameterTypes.length === 1) return false;
      }
      // Suppress <clinit> for enum classes
      if (classIR.isEnum() && m.isStaticInitializer()) {
        return false;
      }
      // Suppress synthetic lambda methods
      if ((m.access & 0x1000) !== 0 && m.name.startsWith('lambda$')) {
        return false;
      }
      return true;
    });

    // Partition fields for enums
    const isEnum = classIR.isEnum();
    const enumConstantFields = isEnum
      ? classIR.fields.filter(f => f.isEnum())
      : [];
    const regularFields = isEnum
      ? classIR.fields.filter(f => !f.isEnum() && !this.isEnumSyntheticField(f, classIR))
      : classIR.fields;

    // Emit enum constant declarations
    const inlinedInnerClasses: string[] = [];
    if (isEnum && enumConstantFields.length > 0) {
      const typeContext: JavaTypeNameFormattingContext = {
        currentPackageName: classCtx.currentPackageName,
        preferSimpleJavaLang: true,
        innerClassSimpleNames: classCtx.innerClassSimpleNames,
        importCollector: classCtx.importCollector,
      };
      const enumConstants = this.extractEnumConstantArgs(classIR, enumConstantFields, typeContext);

      // Check if any constants have inner class bodies
      const anyInnerClasses = enumConstants.some(c => c.innerClassName !== null);
      const hasOtherMembers = regularFields.length > 0 || visibleMethods.length > 0 || anyInnerClasses;

      for (let i = 0; i < enumConstants.length; i++) {
        const c = enumConstants[i]!;
        const isLast = i === enumConstants.length - 1;
        const separator = isLast ? (hasOtherMembers ? ';' : '') : ',';
        const argsStr = c.args.length > 0 ? `(${c.args.join(', ')})` : '';

        if (c.innerClassName && options.classIRMap) {
          const innerClassIR = options.classIRMap.get(c.innerClassName);
          if (innerClassIR) {
            inlinedInnerClasses.push(c.innerClassName);
            const innerMethods = this.getInlinableInnerClassMethods(innerClassIR);

            if (innerMethods.length > 0) {
              writer.writeLine(`${c.name}${argsStr} {`);
              writer.indent();

              const innerClassName = JavaClassName.fromInternalName(innerClassIR.name);
              const innerCtx: JavaClassDecompilationContext = {
                currentClassInternalName: innerClassIR.name,
                currentSuperInternalName: innerClassIR.superName,
                currentPackageName: innerClassName.packageName,
                isEnum: false,
                classIR: innerClassIR,
                importCollector: classCtx.importCollector,
              };

              for (let j = 0; j < innerMethods.length; j++) {
                this.methodEmitter.emit(innerMethods[j]!, writer, innerCtx, innerClassName.simpleName, false);
                if (j < innerMethods.length - 1) {
                  writer.writeLine();
                }
              }

              writer.dedent();
              writer.writeLine(`}${separator}`);
              continue;
            }
          }
        }

        writer.writeLine(`${c.name}${argsStr}${separator}`);
      }

      if (hasOtherMembers) {
        writer.writeLine();
      }
    }

    // Regular fields
    if (regularFields.length > 0) {
      for (const field of regularFields) {
        this.fieldEmitter.emit(field, writer, classCtx);
      }
      if (visibleMethods.length > 0) {
        writer.writeLine();
      }
    }

    // Methods
    for (let i = 0; i < visibleMethods.length; i++) {
      const method = visibleMethods[i]!;
      this.methodEmitter.emit(method, writer, classCtx, className.simpleName, options.includeDebugComments);
      if (i !== visibleMethods.length - 1) {
        writer.writeLine();
      }
    }

    // Inline named inner classes
    if (options.classIRMap) {
      const namedInnerClasses = classIR.innerClasses.filter(
        ic => ic.outerName === classIR.name && ic.innerName
      );
      for (const ic of namedInnerClasses) {
        const innerClassIR = options.classIRMap.get(ic.name);
        if (!innerClassIR) continue;

        inlinedInnerClasses.push(ic.name);
        writer.writeLine();
        this.emitInnerClass(innerClassIR, ic, writer, classCtx, options);
      }
    }

    writer.dedent();
    writer.writeLine('}');

    // Build final source with package declaration and imports
    const parts: string[] = [];
    if (options.emitPackageDeclaration && className.packageName) {
      parts.push(`package ${className.packageName};`);
      parts.push('');
    }

    if (options.includeDebugComments) {
      parts.push(`// Source: ${classIR.sourceFile ?? 'unknown'}`);
      parts.push(`// Version: ${classIR.getMajorVersion()}.${classIR.getMinorVersion()}`);
    }

    const imports = this.generateImports(importCollector);
    if (imports.length > 0) {
      for (const imp of imports) {
        parts.push(`import ${imp};`);
      }
      parts.push('');
    }

    parts.push(writer.toString());

    return { source: parts.join('\n'), inlinedInnerClasses };
  }

  /**
   * Gets methods from an anonymous enum inner class that should be inlined.
   * Skips constructors, static initializers, and synthetic bridge methods.
   */
  private getInlinableInnerClassMethods(innerClassIR: ClassIR): MethodIR[] {
    return innerClassIR.methods.filter(m => {
      if (m.isConstructor()) return false;
      if (m.isStaticInitializer()) return false;
      // Skip synthetic bridge methods (ACC_SYNTHETIC=0x1000 or ACC_BRIDGE=0x0040)
      if ((m.access & 0x1000) !== 0 || (m.access & 0x0040) !== 0) return false;
      return true;
    });
  }

  /**
   * Emits a named inner class declaration inline within the outer class body.
   */
  private emitInnerClass(
    innerClassIR: ClassIR,
    innerClassInfo: InnerClassInfo,
    writer: JavaSourceWriter,
    outerClassCtx: JavaClassDecompilationContext,
    options: JavaClassSourceEmitterOptions
  ): void {
    const innerName = innerClassInfo.innerName!;

    // Use InnerClassInfo.access for source-level modifiers (not the .class file access)
    const modifiers = this.accessFormatter.formatClassModifiers(innerClassInfo.access);

    const kind = innerClassIR.isInterface() ? 'interface' : 'class';

    // Build inner class context, inheriting the outer class's inner class name map
    const innerCtx: JavaClassDecompilationContext = {
      currentClassInternalName: innerClassIR.name,
      currentSuperInternalName: innerClassIR.superName,
      currentPackageName: outerClassCtx.currentPackageName,
      isEnum: innerClassIR.isEnum(),
      isInterface: innerClassIR.isInterface(),
      innerClassSimpleNames: outerClassCtx.innerClassSimpleNames,
      classIR: innerClassIR,
      importCollector: outerClassCtx.importCollector,
    };

    const typeContext = {
      currentPackageName: outerClassCtx.currentPackageName,
      preferSimpleJavaLang: true,
      innerClassSimpleNames: outerClassCtx.innerClassSimpleNames,
      importCollector: outerClassCtx.importCollector,
    };

    // Extends clause
    let extendsClause = '';
    if (innerClassIR.superName && innerClassIR.superName !== 'java/lang/Object') {
      const superName = this.typeNameFormatter.formatInternalName(innerClassIR.superName, typeContext);
      extendsClause = ` extends ${superName}`;
    }

    // Implements clause
    let implementsClause = '';
    if (innerClassIR.interfaces && innerClassIR.interfaces.length > 0) {
      const list = innerClassIR.interfaces.map(i =>
        this.typeNameFormatter.formatInternalName(i, typeContext)
      );
      implementsClause = innerClassIR.isInterface()
        ? ` extends ${list.join(', ')}`
        : ` implements ${list.join(', ')}`;
    }

    writer.writeLine(`${modifiers}${kind} ${innerName}${extendsClause}${implementsClause} {`);
    writer.indent();

    // Fields
    const fields = innerClassIR.fields;
    for (const field of fields) {
      this.fieldEmitter.emit(field, writer, innerCtx);
    }

    // Methods — filter out synthetic/default constructors
    const visibleMethods = innerClassIR.methods.filter(m => {
      if (m.isStaticInitializer()) return false;
      if (m.isConstructor() && m.parameterTypes.length === 0 && this.isDefaultConstructor(m)) return false;
      // Skip synthetic methods
      if ((m.access & 0x1000) !== 0 && m.name.startsWith('lambda$')) return false;
      return true;
    });

    if (fields.length > 0 && visibleMethods.length > 0) {
      writer.writeLine();
    }

    for (let i = 0; i < visibleMethods.length; i++) {
      this.methodEmitter.emit(visibleMethods[i]!, writer, innerCtx, innerName, options.includeDebugComments);
      if (i !== visibleMethods.length - 1) {
        writer.writeLine();
      }
    }

    writer.dedent();
    writer.writeLine('}');
  }

  /**
   * Extracts enum constant names and their constructor arguments from <clinit>.
   *
   * The IR represents enum constant initialization as:
   *   PopStmt(VirtualInvocationExpr(SPECIAL, <init>, receiver=NewExpr, args=[name, ordinal, ...userArgs]))
   *   FieldStoreStmt(fieldName, value=NewExpr)
   *
   * We look at the PopStmt preceding each FieldStoreStmt to extract constructor args,
   * stripping the first 2 synthetic args (String name, int ordinal).
   */
  private extractEnumConstantArgs(
    classIR: ClassIR,
    enumFields: FieldIR[],
    typeContext: JavaTypeNameFormattingContext
  ): { name: string; args: string[]; innerClassName: string | null }[] {
    const clinit = classIR.methods.find(m => m.isStaticInitializer());
    if (!clinit?.cfg) {
      return enumFields.map(f => ({ name: f.name, args: [], innerClassName: null }));
    }

    const enumFieldNames = new Set(enumFields.map(f => f.name));
    const result = new Map<string, { args: string[]; innerClassName: string | null }>();

    const exprCtx = {
      methodIsStatic: true,
      currentClassInternalName: classIR.name,
      currentSuperInternalName: classIR.superName,
      typeContext,
    };

    const printer = new JavaAstPrinter(new JavaSourceWriter());

    for (const block of clinit.cfg.blocks) {
      const stmts = block.statements;
      for (let i = 0; i < stmts.length; i++) {
        const stmt = stmts[i]!;
        if (!(stmt instanceof FieldStoreStmt)) continue;
        if (!stmt.isStatic || stmt.owner !== classIR.name) continue;
        if (!enumFieldNames.has(stmt.fieldName)) continue;

        // Look for the PopStmt with constructor call preceding this FieldStoreStmt
        for (let j = i - 1; j >= 0; j--) {
          const prev = stmts[j]!;
          if (!(prev instanceof PopStmt)) continue;

          const value = prev.value;
          if (
            value instanceof VirtualInvocationExpr &&
            value.kind === VirtualInvocationKind.SPECIAL &&
            value.methodName === '<init>' &&
            value.receiver instanceof NewExpr
          ) {
            // Skip first 2 synthetic args (String name, int ordinal)
            const userArgs = value.args.slice(2);
            const argStrings = userArgs.map(a => {
              const javaExpr = this.exprConverter.convert(a, exprCtx);
              return printer.printExpression(javaExpr);
            });
            // When the owner differs from the enum class, it's an anonymous inner class
            const innerClassName = value.owner !== classIR.name ? value.owner : null;
            result.set(stmt.fieldName, { args: argStrings, innerClassName });
          }
          break; // Only check the closest PopStmt
        }
      }
    }

    return enumFields.map(f => ({
      name: f.name,
      args: result.get(f.name)?.args ?? [],
      innerClassName: result.get(f.name)?.innerClassName ?? null,
    }));
  }

  /**
   * Checks if a field is the synthetic $VALUES array in an enum.
   */
  private isEnumSyntheticField(field: FieldIR, classIR: ClassIR): boolean {
    if (field.isSynthetic()) return true;
    // Fallback: match by name (some compilers use $VALUES or ENUM$VALUES)
    if (field.name === '$VALUES' || field.name === 'ENUM$VALUES') return true;
    // Match by descriptor: array of the enum type
    if (field.descriptor === `[L${classIR.name};`) return true;
    return false;
  }

  private generateImports(importCollector: Set<string>): string[] {
    if (importCollector.size === 0) return [];

    // Detect simple name collisions: if two FQNs map to the same simple name,
    // we can only import one — skip them all and they'll stay fully qualified.
    const simpleNameToFQNs = new Map<string, string[]>();
    for (const fqn of importCollector) {
      const lastDot = fqn.lastIndexOf('.');
      const simple = lastDot >= 0 ? fqn.substring(lastDot + 1) : fqn;
      const list = simpleNameToFQNs.get(simple) ?? [];
      list.push(fqn);
      simpleNameToFQNs.set(simple, list);
    }

    const imports: string[] = [];
    for (const [, fqns] of simpleNameToFQNs) {
      if (fqns.length === 1) {
        imports.push(fqns[0]!);
      }
      // If multiple FQNs share a simple name, don't import any —
      // they remain fully qualified in the output.
    }

    return imports.sort();
  }

  private formatExtendsClause(
    classIR: ClassIR,
    classCtx: JavaClassDecompilationContext,
    classSig?: { typeParams: string | null; superType: string; interfaces: string[] } | null
  ): string {
    if (!classIR.superName) return '';
    if (classIR.superName === 'java/lang/Object') return '';

    // Interfaces/annotations extend interfaces, not classes.
    if (classIR.isInterface() || classIR.isAnnotation()) {
      return '';
    }

    // Enums implicitly extend java.lang.Enum - suppress it
    if (classIR.isEnum() && classIR.superName === 'java/lang/Enum') {
      return '';
    }

    // Use generic signature super type if available, unless it's just 'Object'
    if (classSig && classSig.superType !== 'Object') {
      return ` extends ${classSig.superType}`;
    }

    const superName = this.typeNameFormatter.formatInternalName(classIR.superName, {
      currentPackageName: classCtx.currentPackageName,
      preferSimpleJavaLang: true,
      importCollector: classCtx.importCollector,
    });
    return ` extends ${superName}`;
  }

  private formatImplementsClause(
    classIR: ClassIR,
    classCtx: JavaClassDecompilationContext,
    classSig?: { typeParams: string | null; superType: string; interfaces: string[] } | null
  ): string {
    if (!classIR.interfaces || classIR.interfaces.length === 0) return '';

    // Filter out java/lang/annotation/Annotation for @interface types - it's implicit
    const filtered = classIR.isAnnotation()
      ? classIR.interfaces.filter(i => i !== 'java/lang/annotation/Annotation')
      : classIR.interfaces;

    if (filtered.length === 0) return '';

    // Use generic signature interfaces if available and count matches
    if (classSig && classSig.interfaces.length === filtered.length) {
      const keyword = (classIR.isInterface() || classIR.isAnnotation()) ? 'extends' : 'implements';
      return ` ${keyword} ${classSig.interfaces.join(', ')}`;
    }

    const list = filtered.map(i =>
      this.typeNameFormatter.formatInternalName(i, {
        currentPackageName: classCtx.currentPackageName,
        preferSimpleJavaLang: true,
        importCollector: classCtx.importCollector,
      })
    );

    if (classIR.isInterface() || classIR.isAnnotation()) {
      // Interfaces extend interfaces in source.
      return ` extends ${list.join(', ')}`;
    }

    return ` implements ${list.join(', ')}`;
  }

  /**
   * Checks if a constructor is a compiler-generated default constructor.
   * Default constructors have no user parameters and only call super().
   */
  private isDefaultConstructor(method: MethodIR): boolean {
    if (!method.hasCode()) return false;
    // Check if the method body consists of only: line comments + super() + return
    // A default constructor's CFG has a single block with just super() and return
    const cfg = method.cfg;
    if (!cfg) return false;

    let stmtCount = 0;
    for (const block of cfg.blocks) {
      stmtCount += block.statements.length;
    }
    // Default constructors typically have 2-5 statements (line numbers, super, return, frame)
    return stmtCount <= 5;
  }
}
