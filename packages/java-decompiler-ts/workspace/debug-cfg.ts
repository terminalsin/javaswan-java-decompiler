import { ClassReader } from '@blkswn/java-asm';
import { IRClassVisitor, ConditionalJumpStmt, UnconditionalJumpStmt, ReturnStmt, ThrowStmt, SwitchStmt } from '@blkswn/java-ir';
import * as fs from 'fs';
import * as JSZip from 'jszip';

async function main() {
    const jarBuffer = fs.readFileSync('/Users/terminalsin/Documents/blackswan-java/packages/java-decompiler-ts/workspace/test.jar');
    const zip = await JSZip.loadAsync(jarBuffer);

    // Check all Blowfish classes
    const files = Object.keys(zip.files).filter(f => f.includes('Blowfish') && f.endsWith('.class'));

    for (const file of files) {
        const entry = zip.file(file);
        if (!entry) continue;
        const buf = await entry.async('nodebuffer');
        const reader = new ClassReader(buf);
        const visitor = new IRClassVisitor();
        reader.accept(visitor);
        const classIR = visitor.getClassIR();

        for (const method of classIR.methods) {
            if (!method.cfg) continue;
            const cfg = method.cfg;
            const blocks = cfg.blocks;
            const hasExceptionHandlers = cfg.exceptionHandlers.length > 0;

            // Check if this method would fail structured decompilation
            // Simple heuristic: count blocks, loops, exception handlers
            if (blocks.length < 3) continue;

            console.log(`\n=== ${classIR.name}.${method.name} ===`);
            console.log(`  Blocks: ${blocks.length}, Exception handlers: ${cfg.exceptionHandlers.length}`);

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                if (!block) continue;
                const last = block.statements[block.statements.length - 1];
                let termType = 'none';
                if (last instanceof ConditionalJumpStmt) termType = `cond(${last.trueTarget},${last.falseTarget})`;
                else if (last instanceof UnconditionalJumpStmt) termType = `goto(${last.target})`;
                else if (last instanceof ReturnStmt) termType = 'return';
                else if (last instanceof ThrowStmt) termType = 'throw';
                else if (last instanceof SwitchStmt) termType = 'switch';
                console.log(`  block${i}: stmts=${block.statements.length}, succs=[${[...block.successors]}], term=${termType}`);
            }

            if (hasExceptionHandlers) {
                for (const h of cfg.exceptionHandlers) {
                    console.log(`  handler: try[${h.startBlock},${h.endBlock}) -> block${h.handlerBlock} (${h.exceptionType || 'finally'})`);
                }
            }
        }
    }
}

main().catch(console.error);
