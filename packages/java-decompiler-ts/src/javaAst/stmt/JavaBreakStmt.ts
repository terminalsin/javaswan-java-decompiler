import type { JavaStmt } from './JavaStmt';

export class JavaBreakStmt implements JavaStmt {
  public readonly label: string | null;

  constructor(label: string | null = null) {
    this.label = label;
  }
}

