import type { MethodIR } from '@blkswn/java-ir';
import { JavaBlockStmt } from '../../stmt/JavaBlockStmt';
import { JavaCommentStmt } from '../../stmt/JavaCommentStmt';
import type { IrStatementToJavaAstContext } from '../../ir/IrStatementToJavaAstConverter';
import { LabelSwitchControlFlowAstDecompiler } from './LabelSwitchControlFlowAstDecompiler';

export class UnstructuredControlFlowFallbackAstEmitter {
    private readonly labelSwitch = new LabelSwitchControlFlowAstDecompiler();

    public emit(method: MethodIR, stmtCtx: IrStatementToJavaAstContext): JavaBlockStmt {
        if (!method.cfg) {
            return new JavaBlockStmt([new JavaCommentStmt('abstract or native')]);
        }

        return this.labelSwitch.decompile(method, method.cfg, stmtCtx);
    }
}

