export class JavaSourceWriter {
  private readonly lines: string[] = [];
  private indentLevel = 0;

  public indent(): void {
    this.indentLevel++;
  }

  public dedent(): void {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }

  public writeLine(line: string = ''): void {
    const prefix = this.indentLevel > 0 ? '  '.repeat(this.indentLevel) : '';
    this.lines.push(prefix + line);
  }

  public toString(): string {
    return this.lines.join('\n');
  }
}

