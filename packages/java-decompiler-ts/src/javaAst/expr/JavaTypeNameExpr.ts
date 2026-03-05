import type { JavaExpr } from './JavaExpr';

/**
 * A reference to a Java type name (used for static field/method access).
 */
export class JavaTypeNameExpr implements JavaExpr {
    public readonly typeName: string;

    constructor(typeName: string) {
        this.typeName = typeName;
    }
}

