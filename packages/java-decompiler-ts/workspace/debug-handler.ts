import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, VarStoreStmt, PhiExpr } from '@blkswn/java-ir';
import * as fs from 'fs';
import * as JSZip from 'jszip';

async function main() {
    const jarBuffer = fs.readFileSync('/Users/terminalsin/Documents/blackswan-java/packages/java-decompiler-ts/workspace/test.jar');
    const zip = await JSZip.loadAsync(jarBuffer);

    const targets = [
        'dev/sim0n/app/test/impl/trycatch/TryCatchTest.class',
        'dev/sim0n/app/test/impl/flow/OpaqueConditionTest.class'
    ];

    for (const target of targets) {
        const entry = zip.file(target);
        if (!entry) continue;
        const buf = await entry.async('nodebuffer');
        const reader = new ClassReader(buf);
        const visitor = new IRClassVisitor();
        reader.accept(visitor);
        const classIR = visitor.getClassIR();

        console.log(`\n=== ${classIR.name} ===`);
        for (const method of classIR.methods) {
            if (!method.cfg || method.cfg.exceptionHandlers.length === 0) continue;
            console.log(`\nMethod: ${method.name}`);
            for (const h of method.cfg.exceptionHandlers) {
                console.log(`  Handler: block ${h.handlerBlock} (type: ${h.exceptionType})`);
                const block = method.cfg.blocks[h.handlerBlock];
                if (!block) continue;
                // Show first 5 statements
                for (let si = 0; si < Math.min(5, block.statements.length); si++) {
                    const s = block.statements[si]!;
                    console.log(`    [${si}] ${s.constructor.name}: ${s.toString()}`);
                    if (s instanceof VarStoreStmt) {
                        console.log(`        index=${s.index}, name=${s.name}, valueType=${s.value.constructor.name}`);
                        if (s.value instanceof PhiExpr) {
                            console.log(`        isExceptionPhi=${s.value.isExceptionPhi()}, exType=${s.value.exceptionType}`);
                        }
                    }
                }
            }
        }
    }
}

main().catch(console.error);
