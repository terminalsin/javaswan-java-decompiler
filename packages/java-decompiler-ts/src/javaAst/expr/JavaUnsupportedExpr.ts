import type { JavaExpr } from './JavaExpr';

export class JavaUnsupportedExpr implements JavaExpr {
    public readonly comment: string;

    constructor(comment: string) {
        this.comment = comment;
    }
}

