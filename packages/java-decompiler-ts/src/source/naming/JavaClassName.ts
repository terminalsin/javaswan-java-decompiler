export class JavaClassName {
  public readonly internalName: string;
  public readonly packageName: string | null;
  public readonly simpleName: string;
  public readonly qualifiedName: string;

  constructor(internalName: string) {
    this.internalName = internalName;
    const dotted = internalName.replace(/\//g, '.');
    this.qualifiedName = dotted;

    const lastDot = dotted.lastIndexOf('.');
    if (lastDot === -1) {
      this.packageName = null;
      this.simpleName = dotted;
    } else {
      this.packageName = dotted.slice(0, lastDot);
      this.simpleName = dotted.slice(lastDot + 1);
    }
  }

  public static fromInternalName(internalName: string): JavaClassName {
    return new JavaClassName(internalName);
  }
}

