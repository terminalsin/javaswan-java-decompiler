import { JavaBlockStmt } from './JavaBlockStmt';

export type JavaSwitchCaseLabel = number | 'default';

export class JavaSwitchCase {
  public readonly labels: readonly JavaSwitchCaseLabel[];
  public readonly body: JavaBlockStmt;

  constructor(labels: readonly JavaSwitchCaseLabel[], body: JavaBlockStmt) {
    this.labels = labels;
    this.body = body;
  }
}

