import type { JavaStmt } from './JavaStmt';

export class JavaCommentStmt implements JavaStmt {
  public readonly text: string;

  constructor(text: string) {
    this.text = text;
  }
}

