import type { JavaExpr } from './JavaExpr';

export class JavaIdentifierExpr implements JavaExpr {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }
}

