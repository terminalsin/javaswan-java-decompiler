import type { JavaExpr } from './JavaExpr';

/**
 * A pre-formatted Java literal (e.g. `"hello"`, `123L`, `0.0f`, `null`).
 */
export class JavaLiteralExpr implements JavaExpr {
    public readonly text: string;

    constructor(text: string) {
        this.text = text;
    }
}

