import type { MethodIR } from '@blkswn/java-ir';
import { JavaIdentifierSanitizer } from './JavaIdentifierSanitizer';

export class JavaMethodParameterNameResolver {
    private readonly sanitizer = new JavaIdentifierSanitizer();

    public resolve(method: MethodIR): string[] {
        const names: string[] = [];
        const used = new Set<string>();

        let localSlot = method.isStatic() ? 0 : 1; // slot 0 is `this` for instance methods
        for (let i = 0; i < method.parameterTypes.length; i++) {
            const paramType = method.parameterTypes[i]!;
            const debugName = method.getVariableName(localSlot, 0);
            let name = this.sanitizer.sanitize(debugName ?? `arg${i}`);

            if (used.has(name)) {
                let suffix = 2;
                while (used.has(`${name}_${suffix}`)) {
                    suffix++;
                }
                name = `${name}_${suffix}`;
            }

            used.add(name);
            names.push(name);

            localSlot += paramType.getSize();
        }

        return names;
    }
}

