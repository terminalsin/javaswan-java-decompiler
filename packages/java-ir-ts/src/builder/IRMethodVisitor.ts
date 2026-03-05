import { MethodVisitor, Type, Handle, Label, ASM9 } from '@blkswn/java-asm';
import * as Opcodes from '@blkswn/java-asm';
import { MethodIR } from '../ir/MethodIR';
import { ControlFlowGraph, type ExceptionHandler } from '../ir/ControlFlowGraph';
import { BasicBlock } from '../ir/BasicBlock';
import { StackSimulator } from './StackSimulator';

// Statements
import { NopStmt } from '../stmt/NopStmt';
import { PopStmt } from '../stmt/PopStmt';
import { ThrowStmt } from '../stmt/ThrowStmt';
import { ReturnStmt } from '../stmt/ReturnStmt';
import { MonitorStmt, MonitorKind } from '../stmt/MonitorStmt';
import { VarStoreStmt } from '../stmt/VarStoreStmt';
import { ArrayStoreStmt } from '../stmt/ArrayStoreStmt';
import { FieldStoreStmt } from '../stmt/FieldStoreStmt';
import { ConditionalJumpStmt, ConditionalOp } from '../stmt/ConditionalJumpStmt';
import { UnconditionalJumpStmt } from '../stmt/UnconditionalJumpStmt';
import { SwitchStmt, type SwitchCase } from '../stmt/SwitchStmt';
import { LineNumberStmt } from '../stmt/LineNumberStmt';
import { FrameStmt, FrameType } from '../stmt/FrameStmt';
import { ConstantExpr } from '../expr/ConstantExpr';

/**
 * A method visitor that builds IR from bytecode.
 * 
 * Handles stack propagation between blocks by:
 * 1. Tracking the stack state at block boundaries
 * 2. Using frame information to initialize/validate stack state
 * 3. Propagating stack from predecessors when entering a new block
 * 4. Initializing exception handler entries with the caught exception
 */
export class IRMethodVisitor extends MethodVisitor {
    private readonly methodIR: MethodIR;
    private readonly cfg: ControlFlowGraph;
    private readonly stack: StackSimulator;

    private currentBlock: BasicBlock;
    private readonly labelToBlock: Map<Label, number> = new Map();
    private readonly pendingLabels: Label[] = [];
    private readonly tryCatchBlocks: Array<{
        start: Label;
        end: Label;
        handler: Label;
        type: string | null;
    }> = [];

    /**
     * Tracks blocks that are exception handler entries.
     */
    private readonly exceptionHandlerBlocks: Set<number> = new Set();

    /**
     * Whether we've just processed a frame instruction.
     * Used to avoid clearing stack from frame info.
     */
    private justProcessedFrame: boolean = false;

    /**
     * Maps blocks to their expected stack size from frames.
     * Used to validate stack state.
     */
    private readonly blockExpectedStackSize: Map<number, number> = new Map();

    /**
     * Maps blocks to their predecessor blocks.
     * Used for Phi expressions.
     */
    private readonly blockPredecessors: Map<number, number[]> = new Map();

    /**
     * Maps labels to their exception handler info.
     * This is populated lazily when visitTryCatchBlock is called.
     */
    private readonly labelExceptionInfo: Map<Label, { type: string | null }> = new Map();

    /**
     * Labels we've seen that might be exception handlers.
     * These are labels that don't have known stack state from predecessors.
     */
    private readonly potentialHandlerLabels: Set<Label> = new Set();

    /**
     * Labels associated with the current block (set before processing instructions).
     */
    private currentBlockLabels: Label[] = [];

    constructor(methodIR: MethodIR) {
        super(ASM9, null);
        this.methodIR = methodIR;
        this.cfg = new ControlFlowGraph();
        this.methodIR.cfg = this.cfg;
        this.stack = new StackSimulator();

        // Create entry block
        this.currentBlock = this.cfg.createBlock();
        this.stack.setCurrentBlock(this.currentBlock.index);
        this.stack.saveEntryState(this.currentBlock.index);
    }

    /**
     * Gets the method IR being built.
     */
    public getMethodIR(): MethodIR {
        return this.methodIR;
    }

    // -------------------------------------------------------------------------
    // Label handling
    // -------------------------------------------------------------------------

    private getOrCreateBlock(label: Label): number {
        let blockIndex = this.labelToBlock.get(label);
        if (blockIndex === undefined) {
            blockIndex = this.cfg.createBlock().index;
            this.labelToBlock.set(label, blockIndex);
        }
        return blockIndex;
    }

    /**
     * Adds a predecessor to a block's predecessor list.
     */
    private addBlockPredecessor(blockIndex: number, predecessorIndex: number): void {
        let preds = this.blockPredecessors.get(blockIndex);
        if (!preds) {
            preds = [];
            this.blockPredecessors.set(blockIndex, preds);
        }
        if (!preds.includes(predecessorIndex)) {
            preds.push(predecessorIndex);
        }
        // Also update the stack simulator
        this.stack.addPredecessor(blockIndex, predecessorIndex);
    }

    /**
     * Gets the predecessors of a block.
     */
    private getBlockPredecessors(blockIndex: number): number[] {
        return this.blockPredecessors.get(blockIndex) ?? [];
    }

    /**
     * Checks if the current block might be an exception handler entry.
     * If so, initializes the stack with a caught exception.
     * 
     * This is needed because visitTryCatchBlock is called AFTER the handler
     * label is visited in ASM, so we need to detect handlers proactively.
     */
    private ensureStackInitialized(): void {
        const DEBUG = false; // Set to true to debug

        if (DEBUG) {
            console.log(`ensureStackInitialized: block ${this.currentBlock.index}, stackSize=${this.stack.size()}, labels=${this.currentBlockLabels.length}`);
        }

        // If stack is already non-empty, we're fine
        if (this.stack.size() > 0) {
            return;
        }

        const entryState = this.stack.getEntryState(this.currentBlock.index);
        if (entryState && entryState.initialized && entryState.stack.length > 0) {
            // Restore from entry state
            if (DEBUG) {
                console.log(`  Restoring from entry state with ${entryState.stack.length} items`);
            }
            this.stack.setStack(entryState.stack);
            return;
        }

        // Check if we've seen this block's label as an exception handler
        for (const label of this.currentBlockLabels) {
            const exceptionInfo = this.labelExceptionInfo.get(label);
            if (exceptionInfo) {
                if (DEBUG) {
                    console.log(`  Found exception info for label, type=${exceptionInfo.type}`);
                }
                // This is an exception handler - initialize with caught exception
                const predecessors = this.getBlockPredecessors(this.currentBlock.index);
                this.stack.initializeExceptionHandler(
                    this.currentBlock.index,
                    exceptionInfo.type,
                    predecessors
                );
                this.exceptionHandlerBlocks.add(this.currentBlock.index);
                return;
            }
        }

        // If this block has no predecessors and no entry state,
        // it might be an exception handler we haven't seen yet.
        // Mark it as a potential handler and add a placeholder.
        const preds = this.getBlockPredecessors(this.currentBlock.index);
        if (DEBUG) {
            console.log(`  preds.length=${preds.length}, currentBlockLabels.length=${this.currentBlockLabels.length}`);
        }
        if (preds.length === 0 && this.currentBlockLabels.length > 0) {
            for (const label of this.currentBlockLabels) {
                this.potentialHandlerLabels.add(label);
            }
            if (DEBUG) {
                console.log(`  Initializing as potential exception handler`);
            }
            // Initialize with a generic caught exception
            // This will be corrected in visitEnd if needed
            this.stack.initializeExceptionHandler(
                this.currentBlock.index,
                null,  // Unknown type for now
                []
            );
            this.exceptionHandlerBlocks.add(this.currentBlock.index);
        }
    }

    private switchToBlock(blockIndex: number, saveCurrentExit: boolean = true): void {
        // Save current block's exit state
        if (saveCurrentExit) {
            this.stack.saveExitState(this.currentBlock.index);
        }

        const block = this.cfg.getBlock(blockIndex);
        if (!block) {
            throw new Error(`Block ${blockIndex} not found`);
        }

        this.currentBlock = block;
        this.stack.setCurrentBlock(blockIndex);

        // Check if this is an exception handler - they always start with exception on stack
        if (this.exceptionHandlerBlocks.has(blockIndex)) {
            // Entry state already set by initializeExceptionHandler
            const entryState = this.stack.getEntryState(blockIndex);
            if (entryState) {
                this.stack.setStack(entryState.stack);
            }
        } else if (!this.justProcessedFrame) {
            // If we haven't just processed a frame, try to propagate from predecessor
            // For now, we'll be conservative and only propagate from direct fallthrough
            const entryState = this.stack.getEntryState(blockIndex);
            if (entryState && entryState.initialized) {
                this.stack.setStack(entryState.stack);
            }
        }

        this.justProcessedFrame = false;
    }

    public visitLabel(label: Label): void {
        this.pendingLabels.push(label);

        // If we already have a block for this label, switch to it
        const existingBlockIndex = this.labelToBlock.get(label);
        if (existingBlockIndex !== undefined) {
            const existingBlock = this.cfg.getBlock(existingBlockIndex);
            if (existingBlock) {
                // Add fallthrough edge if current block doesn't end with jump
                if (!this.currentBlockEndsWithJump()) {
                    this.cfg.addEdge(this.currentBlock.index, existingBlockIndex);
                    this.addBlockPredecessor(existingBlockIndex, this.currentBlock.index);
                    // Propagate stack state to the target block
                    this.stack.saveExitState(this.currentBlock.index);

                    // Set the entry state of the target block from our current stack
                    // unless it's an exception handler
                    if (!this.exceptionHandlerBlocks.has(existingBlockIndex)) {
                        // Don't overwrite if already initialized (from frame)
                        const existing = this.stack.getEntryState(existingBlockIndex);
                        if (!existing || !existing.initialized) {
                            this.stack.saveEntryState(existingBlockIndex);
                        }
                    }
                }
                this.switchToBlock(existingBlockIndex);
                return;
            }
        }

        // Create new block if current block is not empty
        if (!this.currentBlock.isEmpty() && !this.currentBlockEndsWithJump()) {
            // Save current stack as exit state
            this.stack.saveExitState(this.currentBlock.index);

            const newBlock = this.cfg.createBlock();
            this.cfg.addEdge(this.currentBlock.index, newBlock.index);
            this.addBlockPredecessor(newBlock.index, this.currentBlock.index);
            this.labelToBlock.set(label, newBlock.index);

            // Propagate stack to new block (unless exception handler)
            if (!this.exceptionHandlerBlocks.has(newBlock.index)) {
                // Copy current stack to new block's entry
                const currentStack = this.stack.getStack();
                this.stack.setCurrentBlock(newBlock.index);
                this.stack.setStack(currentStack);
                this.stack.saveEntryState(newBlock.index);
            }

            this.currentBlock = newBlock;
            this.stack.setCurrentBlock(newBlock.index);
        } else if (this.currentBlock.isEmpty()) {
            this.labelToBlock.set(label, this.currentBlock.index);
        } else {
            // Current block ends with jump, start fresh
            this.stack.saveExitState(this.currentBlock.index);

            const newBlock = this.cfg.createBlock();
            this.labelToBlock.set(label, newBlock.index);
            this.currentBlock = newBlock;
            this.stack.setCurrentBlock(newBlock.index);
            // Stack will be set from frame or exception handler
        }
    }

    private currentBlockEndsWithJump(): boolean {
        const terminator = this.currentBlock.getTerminator();
        if (!terminator) return false;
        return terminator instanceof ConditionalJumpStmt ||
            terminator instanceof UnconditionalJumpStmt ||
            terminator instanceof SwitchStmt ||
            terminator instanceof ReturnStmt ||
            terminator instanceof ThrowStmt;
    }

    private processPendingLabels(): void {
        // Save labels for this block before clearing
        this.currentBlockLabels = [...this.pendingLabels];

        for (const label of this.pendingLabels) {
            if (!this.labelToBlock.has(label)) {
                this.labelToBlock.set(label, this.currentBlock.index);
            }
        }

        // Ensure stack is initialized (handles exception handlers)
        this.ensureStackInitialized();

        this.pendingLabels.length = 0;
    }

    // -------------------------------------------------------------------------
    // Instructions
    // -------------------------------------------------------------------------

    public visitInsn(opcode: number): void {
        this.processPendingLabels();

        switch (opcode) {
            case Opcodes.NOP:
                this.currentBlock.addStatement(new NopStmt());
                break;

            // Constants
            case Opcodes.ACONST_NULL:
            case Opcodes.ICONST_M1:
            case Opcodes.ICONST_0:
            case Opcodes.ICONST_1:
            case Opcodes.ICONST_2:
            case Opcodes.ICONST_3:
            case Opcodes.ICONST_4:
            case Opcodes.ICONST_5:
            case Opcodes.LCONST_0:
            case Opcodes.LCONST_1:
            case Opcodes.FCONST_0:
            case Opcodes.FCONST_1:
            case Opcodes.FCONST_2:
            case Opcodes.DCONST_0:
            case Opcodes.DCONST_1:
                this.stack.handleConstant(opcode);
                break;

            // Array loads
            case Opcodes.IALOAD:
            case Opcodes.LALOAD:
            case Opcodes.FALOAD:
            case Opcodes.DALOAD:
            case Opcodes.AALOAD:
            case Opcodes.BALOAD:
            case Opcodes.CALOAD:
            case Opcodes.SALOAD:
                this.stack.handleArrayLoad(opcode);
                break;

            // Array stores
            case Opcodes.IASTORE:
            case Opcodes.LASTORE:
            case Opcodes.FASTORE:
            case Opcodes.DASTORE:
            case Opcodes.AASTORE:
            case Opcodes.BASTORE:
            case Opcodes.CASTORE:
            case Opcodes.SASTORE: {
                const value = this.stack.pop();
                const index = this.stack.pop();
                const array = this.stack.pop();
                let elementType: Type;
                switch (opcode) {
                    case Opcodes.IASTORE:
                        elementType = Type.INT_TYPE;
                        break;
                    case Opcodes.LASTORE:
                        elementType = Type.LONG_TYPE;
                        break;
                    case Opcodes.FASTORE:
                        elementType = Type.FLOAT_TYPE;
                        break;
                    case Opcodes.DASTORE:
                        elementType = Type.DOUBLE_TYPE;
                        break;
                    case Opcodes.AASTORE:
                        elementType = Type.getObjectType('java/lang/Object');
                        break;
                    case Opcodes.BASTORE:
                        // BASTORE is used for both boolean[] and byte[].
                        elementType = Type.BYTE_TYPE;
                        break;
                    case Opcodes.CASTORE:
                        elementType = Type.CHAR_TYPE;
                        break;
                    case Opcodes.SASTORE:
                        elementType = Type.SHORT_TYPE;
                        break;
                    default:
                        elementType = Type.getObjectType('java/lang/Object');
                }
                this.currentBlock.addStatement(new ArrayStoreStmt(array, index, value, elementType));
                break;
            }

            // Stack manipulation
            case Opcodes.POP: {
                const value = this.stack.pop();
                this.currentBlock.addStatement(new PopStmt(value));
                break;
            }
            case Opcodes.POP2: {
                // POP2 pops 1 or 2 values depending on type
                const value = this.stack.pop();
                this.currentBlock.addStatement(new PopStmt(value));
                // For simplicity, we'll handle this as a single pop
                // A more accurate implementation would check the type
                break;
            }
            case Opcodes.DUP:
                this.stack.dup();
                break;
            case Opcodes.DUP_X1:
                this.stack.dupX1();
                break;
            case Opcodes.DUP_X2:
                this.stack.dupX2();
                break;
            case Opcodes.DUP2:
                this.stack.dup2();
                break;
            case Opcodes.DUP2_X1:
                this.stack.dup2X1();
                break;
            case Opcodes.DUP2_X2:
                this.stack.dup2X2();
                break;
            case Opcodes.SWAP:
                this.stack.swap();
                break;

            // Arithmetic
            case Opcodes.IADD: case Opcodes.LADD: case Opcodes.FADD: case Opcodes.DADD:
            case Opcodes.ISUB: case Opcodes.LSUB: case Opcodes.FSUB: case Opcodes.DSUB:
            case Opcodes.IMUL: case Opcodes.LMUL: case Opcodes.FMUL: case Opcodes.DMUL:
            case Opcodes.IDIV: case Opcodes.LDIV: case Opcodes.FDIV: case Opcodes.DDIV:
            case Opcodes.IREM: case Opcodes.LREM: case Opcodes.FREM: case Opcodes.DREM:
            case Opcodes.ISHL: case Opcodes.LSHL:
            case Opcodes.ISHR: case Opcodes.LSHR:
            case Opcodes.IUSHR: case Opcodes.LUSHR:
            case Opcodes.IAND: case Opcodes.LAND:
            case Opcodes.IOR: case Opcodes.LOR:
            case Opcodes.IXOR: case Opcodes.LXOR:
                this.stack.handleArithmetic(opcode);
                break;

            // Negation
            case Opcodes.INEG:
            case Opcodes.LNEG:
            case Opcodes.FNEG:
            case Opcodes.DNEG:
                this.stack.handleNegation(opcode);
                break;

            // Conversions
            case Opcodes.I2L: case Opcodes.I2F: case Opcodes.I2D:
            case Opcodes.L2I: case Opcodes.L2F: case Opcodes.L2D:
            case Opcodes.F2I: case Opcodes.F2L: case Opcodes.F2D:
            case Opcodes.D2I: case Opcodes.D2L: case Opcodes.D2F:
            case Opcodes.I2B: case Opcodes.I2C: case Opcodes.I2S:
                this.stack.handleConversion(opcode);
                break;

            // Comparisons
            case Opcodes.LCMP:
            case Opcodes.FCMPL:
            case Opcodes.FCMPG:
            case Opcodes.DCMPL:
            case Opcodes.DCMPG:
                this.stack.handleComparison(opcode);
                break;

            // Returns
            case Opcodes.IRETURN:
            case Opcodes.LRETURN:
            case Opcodes.FRETURN:
            case Opcodes.DRETURN:
            case Opcodes.ARETURN: {
                const returnValue = this.stack.pop();
                this.currentBlock.addStatement(new ReturnStmt(returnValue));
                break;
            }
            case Opcodes.RETURN:
                this.currentBlock.addStatement(new ReturnStmt(null));
                break;

            // Array length
            case Opcodes.ARRAYLENGTH:
                this.stack.handleArrayLength();
                break;

            // Throw
            case Opcodes.ATHROW: {
                const exception = this.stack.pop();
                this.currentBlock.addStatement(new ThrowStmt(exception));
                break;
            }

            // Monitor
            case Opcodes.MONITORENTER: {
                const obj = this.stack.pop();
                this.currentBlock.addStatement(new MonitorStmt(obj, MonitorKind.ENTER));
                break;
            }
            case Opcodes.MONITOREXIT: {
                const obj = this.stack.pop();
                this.currentBlock.addStatement(new MonitorStmt(obj, MonitorKind.EXIT));
                break;
            }
        }
    }

    public visitIntInsn(opcode: number, operand: number): void {
        this.processPendingLabels();

        if (opcode === Opcodes.BIPUSH || opcode === Opcodes.SIPUSH) {
            this.stack.handleIntInsn(opcode, operand);
        } else if (opcode === Opcodes.NEWARRAY) {
            this.stack.handleNewArray(operand);
        }
    }

    public visitVarInsn(opcode: number, varIndex: number): void {
        this.processPendingLabels();
        const varName = this.methodIR.getVariableName(varIndex, this.currentBlock.index);

        switch (opcode) {
            case Opcodes.ILOAD:
            case Opcodes.LLOAD:
            case Opcodes.FLOAD:
            case Opcodes.DLOAD:
            case Opcodes.ALOAD:
                this.stack.handleVarLoad(opcode, varIndex, varName);
                break;

            case Opcodes.ISTORE:
            case Opcodes.LSTORE:
            case Opcodes.FSTORE:
            case Opcodes.DSTORE:
            case Opcodes.ASTORE: {
                const value = this.stack.pop();
                this.currentBlock.addStatement(new VarStoreStmt(varIndex, value, varName));
                break;
            }
        }
    }

    public visitTypeInsn(opcode: number, type: string): void {
        this.processPendingLabels();
        this.stack.handleTypeInsn(opcode, type);
    }

    public visitFieldInsn(opcode: number, owner: string, name: string, descriptor: string): void {
        this.processPendingLabels();

        if (opcode === Opcodes.GETSTATIC || opcode === Opcodes.GETFIELD) {
            this.stack.handleFieldGet(opcode, owner, name, descriptor);
        } else {
            // PUTSTATIC or PUTFIELD
            const value = this.stack.pop();
            const isStatic = opcode === Opcodes.PUTSTATIC;
            const instance = isStatic ? null : this.stack.pop();
            this.currentBlock.addStatement(new FieldStoreStmt(owner, name, descriptor, instance, value, isStatic));
        }
    }

    public visitMethodInsn(
        opcode: number,
        owner: string,
        name: string,
        descriptor: string,
        isInterface: boolean
    ): void {
        this.processPendingLabels();

        const expr = this.stack.handleMethodInsn(opcode, owner, name, descriptor, isInterface);

        // If the method returns void, the expression was not pushed to stack
        // but we still want to record the invocation as a statement
        const returnType = Type.getReturnType(descriptor);
        if (returnType.getSort() === 0) { // VOID
            this.currentBlock.addStatement(new PopStmt(expr));
        }
    }

    public visitInvokeDynamicInsn(
        name: string,
        descriptor: string,
        bootstrapMethodHandle: Handle,
        ...bootstrapMethodArguments: unknown[]
    ): void {
        this.processPendingLabels();

        const expr = this.stack.handleInvokeDynamic(name, descriptor, bootstrapMethodHandle, bootstrapMethodArguments);

        const returnType = Type.getReturnType(descriptor);
        if (returnType.getSort() === 0) { // VOID
            this.currentBlock.addStatement(new PopStmt(expr));
        }
    }

    public visitJumpInsn(opcode: number, label: Label): void {
        this.processPendingLabels();

        const targetBlock = this.getOrCreateBlock(label);

        if (opcode === Opcodes.GOTO) {
            this.currentBlock.addStatement(new UnconditionalJumpStmt(targetBlock));
            this.cfg.addEdge(this.currentBlock.index, targetBlock);
            this.addBlockPredecessor(targetBlock, this.currentBlock.index);

            // Save exit state and propagate to target
            this.stack.saveExitState(this.currentBlock.index);
            if (!this.exceptionHandlerBlocks.has(targetBlock)) {
                const existing = this.stack.getEntryState(targetBlock);
                if (!existing || !existing.initialized) {
                    this.stack.saveEntryState(targetBlock);
                }
            }
        } else {
            // Conditional jump
            const fallthroughBlock = this.cfg.createBlock().index;
            let op: ConditionalOp;
            let left = this.stack.pop();
            let right: typeof left | null = null;

            switch (opcode) {
                case Opcodes.IFEQ:
                    op = ConditionalOp.EQ;
                    break;
                case Opcodes.IFNE:
                    op = ConditionalOp.NE;
                    break;
                case Opcodes.IFLT:
                    op = ConditionalOp.LT;
                    break;
                case Opcodes.IFGE:
                    op = ConditionalOp.GE;
                    break;
                case Opcodes.IFGT:
                    op = ConditionalOp.GT;
                    break;
                case Opcodes.IFLE:
                    op = ConditionalOp.LE;
                    break;
                case Opcodes.IFNULL:
                    op = ConditionalOp.EQ;
                    break;
                case Opcodes.IFNONNULL:
                    op = ConditionalOp.NE;
                    break;
                case Opcodes.IF_ICMPEQ:
                case Opcodes.IF_ACMPEQ:
                    right = left;
                    left = this.stack.pop();
                    op = ConditionalOp.EQ;
                    break;
                case Opcodes.IF_ICMPNE:
                case Opcodes.IF_ACMPNE:
                    right = left;
                    left = this.stack.pop();
                    op = ConditionalOp.NE;
                    break;
                case Opcodes.IF_ICMPLT:
                    right = left;
                    left = this.stack.pop();
                    op = ConditionalOp.LT;
                    break;
                case Opcodes.IF_ICMPGE:
                    right = left;
                    left = this.stack.pop();
                    op = ConditionalOp.GE;
                    break;
                case Opcodes.IF_ICMPGT:
                    right = left;
                    left = this.stack.pop();
                    op = ConditionalOp.GT;
                    break;
                case Opcodes.IF_ICMPLE:
                    right = left;
                    left = this.stack.pop();
                    op = ConditionalOp.LE;
                    break;
                default:
                    throw new Error(`Unknown jump opcode: ${opcode}`);
            }

            this.currentBlock.addStatement(new ConditionalJumpStmt(left, right, op, targetBlock, fallthroughBlock));
            this.cfg.addEdge(this.currentBlock.index, targetBlock);
            this.cfg.addEdge(this.currentBlock.index, fallthroughBlock);
            this.addBlockPredecessor(targetBlock, this.currentBlock.index);
            this.addBlockPredecessor(fallthroughBlock, this.currentBlock.index);

            // Save exit state
            this.stack.saveExitState(this.currentBlock.index);

            // Propagate stack to both targets (unless exception handlers)
            const currentStack = this.stack.getStack();

            if (!this.exceptionHandlerBlocks.has(targetBlock)) {
                const existing = this.stack.getEntryState(targetBlock);
                if (!existing || !existing.initialized) {
                    this.stack.setCurrentBlock(targetBlock);
                    this.stack.setStack(currentStack);
                    this.stack.saveEntryState(targetBlock);
                }
            }

            if (!this.exceptionHandlerBlocks.has(fallthroughBlock)) {
                this.stack.setCurrentBlock(fallthroughBlock);
                this.stack.setStack(currentStack);
                this.stack.saveEntryState(fallthroughBlock);
            }

            // Switch to fallthrough block
            const block = this.cfg.getBlock(fallthroughBlock);
            if (block) {
                this.currentBlock = block;
                this.stack.setCurrentBlock(fallthroughBlock);
                this.stack.setStack(currentStack);
            }
        }
    }

    public visitLdcInsn(value: unknown): void {
        this.processPendingLabels();
        this.stack.handleLdc(value);
    }

    public visitIincInsn(varIndex: number, increment: number): void {
        this.processPendingLabels();

        // IINC is equivalent to: var = var + increment
        const varName = this.methodIR.getVariableName(varIndex, this.currentBlock.index);
        this.stack.handleVarLoad(Opcodes.ILOAD, varIndex, varName);
        this.stack.push(ConstantExpr.int(increment));
        this.stack.handleArithmetic(Opcodes.IADD);
        const newValue = this.stack.pop();
        this.currentBlock.addStatement(new VarStoreStmt(varIndex, newValue, varName));
    }

    public visitTableSwitchInsn(min: number, max: number, dflt: Label, ...labels: Label[]): void {
        this.processPendingLabels();

        const key = this.stack.pop();
        const defaultTarget = this.getOrCreateBlock(dflt);
        const cases: SwitchCase[] = [];

        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            if (label) {
                const target = this.getOrCreateBlock(label);
                cases.push({ key: min + i, target });
                this.cfg.addEdge(this.currentBlock.index, target);
                this.addBlockPredecessor(target, this.currentBlock.index);
            }
        }

        this.currentBlock.addStatement(new SwitchStmt(key, cases, defaultTarget));
        this.cfg.addEdge(this.currentBlock.index, defaultTarget);
        this.addBlockPredecessor(defaultTarget, this.currentBlock.index);

        // Save exit state
        this.stack.saveExitState(this.currentBlock.index);
    }

    public visitLookupSwitchInsn(dflt: Label, keys: number[], labels: Label[]): void {
        this.processPendingLabels();

        const key = this.stack.pop();
        const defaultTarget = this.getOrCreateBlock(dflt);
        const cases: SwitchCase[] = [];

        for (let i = 0; i < keys.length; i++) {
            const keyValue = keys[i];
            const label = labels[i];
            if (keyValue !== undefined && label) {
                const target = this.getOrCreateBlock(label);
                cases.push({ key: keyValue, target });
                this.cfg.addEdge(this.currentBlock.index, target);
                this.addBlockPredecessor(target, this.currentBlock.index);
            }
        }

        this.currentBlock.addStatement(new SwitchStmt(key, cases, defaultTarget));
        this.cfg.addEdge(this.currentBlock.index, defaultTarget);
        this.addBlockPredecessor(defaultTarget, this.currentBlock.index);

        // Save exit state
        this.stack.saveExitState(this.currentBlock.index);
    }

    public visitMultiANewArrayInsn(descriptor: string, numDimensions: number): void {
        this.processPendingLabels();
        this.stack.handleMultiANewArray(descriptor, numDimensions);
    }

    public visitTryCatchBlock(start: Label, end: Label, handler: Label, type: string | null): void {
        this.tryCatchBlocks.push({ start, end, handler, type });

        // Store exception info for this handler label
        this.labelExceptionInfo.set(handler, { type });

        // Pre-create the handler block and mark it as an exception handler
        const handlerBlockIndex = this.getOrCreateBlock(handler);
        this.exceptionHandlerBlocks.add(handlerBlockIndex);

        // Initialize the exception handler with the caught exception on stack
        // Predecessors will be added later in visitEnd when we know the try region blocks
        this.stack.initializeExceptionHandler(handlerBlockIndex, type, []);

        // If the handler was already visited as a potential handler, update it
        if (this.potentialHandlerLabels.has(handler)) {
            this.potentialHandlerLabels.delete(handler);
        }
    }

    public visitLineNumber(line: number, start: Label): void {
        // Add line number statement at the beginning of the block
        this.currentBlock.addStatement(new LineNumberStmt(line));
    }

    public visitFrame(
        type: number,
        numLocal: number,
        local: Array<string | number | Label | null> | null,
        numStack: number,
        stack: Array<string | number | Label | null> | null
    ): void {
        this.processPendingLabels();

        let frameType: FrameType;
        switch (type) {
            case Opcodes.F_NEW:
            case Opcodes.F_FULL:
                frameType = FrameType.FULL;
                break;
            case Opcodes.F_SAME:
                frameType = FrameType.SAME;
                break;
            case Opcodes.F_SAME1:
                frameType = FrameType.SAME1;
                break;
            case Opcodes.F_APPEND:
                frameType = FrameType.APPEND;
                break;
            case Opcodes.F_CHOP:
                frameType = FrameType.CHOP;
                break;
            default:
                frameType = FrameType.FULL;
        }

        // Convert frame data to simple format
        const localTypes: (string | number)[] = [];
        const stackTypes: (string | number)[] = [];

        if (local) {
            for (const item of local) {
                if (typeof item === 'string' || typeof item === 'number') {
                    localTypes.push(item);
                }
            }
        }

        if (stack) {
            for (const item of stack) {
                if (typeof item === 'string' || typeof item === 'number') {
                    stackTypes.push(item);
                }
            }
        }

        this.currentBlock.addStatement(new FrameStmt(frameType, localTypes, stackTypes));

        // Use frame information to initialize stack state
        // This is authoritative - it tells us exactly what should be on the stack
        if (!this.exceptionHandlerBlocks.has(this.currentBlock.index)) {
            const predecessors = this.getBlockPredecessors(this.currentBlock.index);
            this.stack.initializeFromFrame(type, stack, this.currentBlock.index, predecessors);
            this.stack.saveEntryState(this.currentBlock.index);
        }

        // Record expected stack size for validation
        this.blockExpectedStackSize.set(this.currentBlock.index, numStack);

        this.justProcessedFrame = true;
    }

    public visitLocalVariable(
        name: string,
        descriptor: string,
        signature: string | null,
        start: Label,
        end: Label,
        index: number
    ): void {
        // We need to resolve the labels to block indices
        // This will be done in visitEnd when all labels are resolved
        const startBlock = this.labelToBlock.get(start) ?? 0;
        const endBlock = this.labelToBlock.get(end) ?? this.cfg.size;

        this.methodIR.addLocalVariable({
            name,
            descriptor,
            signature,
            index,
            startBlock,
            endBlock,
        });
    }

    public visitMaxs(maxStack: number, maxLocals: number): void {
        this.methodIR.maxStack = maxStack;
        this.methodIR.maxLocals = maxLocals;
    }

    public visitEnd(): void {
        // Save final block's exit state
        this.stack.saveExitState(this.currentBlock.index);

        // Process try-catch blocks
        for (const tc of this.tryCatchBlocks) {
            const startBlock = this.labelToBlock.get(tc.start);
            const endBlock = this.labelToBlock.get(tc.end);
            const handlerBlock = this.labelToBlock.get(tc.handler);

            if (startBlock !== undefined && endBlock !== undefined && handlerBlock !== undefined) {
                const handler: ExceptionHandler = {
                    startBlock,
                    endBlock,
                    handlerBlock,
                    exceptionType: tc.type,
                };
                this.cfg.addExceptionHandler(handler);

                // Add edges from all blocks in the try region to the handler
                // Also track these as predecessors for the phi expression
                const predecessors: number[] = [];
                for (let i = startBlock; i < endBlock; i++) {
                    this.cfg.addEdge(i, handlerBlock);
                    this.addBlockPredecessor(handlerBlock, i);
                    predecessors.push(i);
                }

                // Re-initialize the exception handler with the actual predecessors
                this.stack.initializeExceptionHandler(handlerBlock, tc.type, predecessors);
            }
        }
    }
}
