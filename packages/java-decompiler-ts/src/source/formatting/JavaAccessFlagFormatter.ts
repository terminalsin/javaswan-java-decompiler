export class JavaAccessFlagFormatter {
  public formatClassModifiers(access: number): string {
    return this.formatCommonModifiers(access, { isClass: true, isField: false, isMethod: false });
  }

  public formatFieldModifiers(access: number): string {
    return this.formatCommonModifiers(access, { isClass: false, isField: true, isMethod: false });
  }

  public formatMethodModifiers(access: number): string {
    return this.formatCommonModifiers(access, { isClass: false, isField: false, isMethod: true });
  }

  private formatCommonModifiers(
    access: number,
    ctx: { readonly isClass: boolean; readonly isField: boolean; readonly isMethod: boolean }
  ): string {
    const modifiers: string[] = [];

    if ((access & 0x0001) !== 0) modifiers.push('public');
    if ((access & 0x0002) !== 0) modifiers.push('private');
    if ((access & 0x0004) !== 0) modifiers.push('protected');
    if ((access & 0x0008) !== 0) modifiers.push('static');
    if ((access & 0x0010) !== 0) {
      // 'final' is implicit for enum classes — suppress it
      const isEnum = ctx.isClass && (access & 0x4000) !== 0;
      if (!isEnum) modifiers.push('final');
    }

    if (ctx.isMethod && (access & 0x0020) !== 0) modifiers.push('synchronized');
    if (ctx.isField && (access & 0x0040) !== 0) modifiers.push('volatile');
    if (ctx.isField && (access & 0x0080) !== 0) modifiers.push('transient');

    if (ctx.isMethod && (access & 0x0100) !== 0) modifiers.push('native');

    // 'abstract' is implicit for interfaces, annotations, and enums — suppress it
    if ((access & 0x0400) !== 0) {
      const isInterfaceOrAnnotation = ctx.isClass && ((access & 0x0200) !== 0);
      const isEnum = ctx.isClass && (access & 0x4000) !== 0;
      if (!isInterfaceOrAnnotation && !isEnum) {
        modifiers.push('abstract');
      }
    }

    if (ctx.isMethod && (access & 0x0800) !== 0) modifiers.push('strictfp');

    return modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
  }
}

