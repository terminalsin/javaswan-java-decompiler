import type { ByteVector } from './ByteVector';

/**
 * A label represents a position in the bytecode of a method.
 * Labels are used for jump instructions, exception handlers, and debug information.
 */
export class Label {
  // Label status flags
  static readonly FLAG_DEBUG_ONLY = 1;
  static readonly FLAG_JUMP_TARGET = 2;
  static readonly FLAG_RESOLVED = 4;
  static readonly FLAG_REACHABLE = 8;
  static readonly FLAG_SUBROUTINE_CALLER = 16;
  static readonly FLAG_SUBROUTINE_START = 32;
  static readonly FLAG_SUBROUTINE_END = 64;
  static readonly FLAG_LINE_NUMBER = 128;

  /** Flags for this label. */
  flags: number = 0;

  /** The offset of this label in the bytecode of its method, or -1 if not resolved. */
  bytecodeOffset: number = -1;

  /** Line numbers associated with this label (if FLAG_LINE_NUMBER is set). */
  private lineNumbers: number[] = [];

  /** 
   * Forward references to this label.
   * For unresolved references we record both:
   * - sourceInsnBytecodeOffset: the bytecode offset of the *instruction opcode* that contains the reference
   * - referenceOffset: the offset in the code array where the relative offset bytes start (right after the opcode/padding)
   * This is required to correctly patch both short jumps and wide references (e.g. switch tables).
   */
  private forwardReferences: Array<{
    sourceInsnBytecodeOffset: number;
    referenceOffset: number;
    isWide: boolean;
  }> = [];

  /** 
   * Information about the input stack map frame of this label (computed by frame analysis).
   * This is used during stack map frame generation.
   */
  frame: unknown = null;

  /** The next basic block in the basic block list. */
  nextBasicBlock: Label | null = null;

  /** The number of elements in the input stack (for frame computation). */
  inputStackSize: number = 0;

  /** The output stack size (for max stack computation). */
  outputStackSize: number = 0;

  /** The output stack max size (for max stack computation). */
  outputStackMax: number = 0;

  /** Short for subroutine (only used for subroutine analysis). */
  subroutineId: number = 0;

  /**
   * Constructs a new label.
   */
  constructor() {}

  /**
   * Returns the offset of this label in the bytecode.
   * @returns the offset, or -1 if not yet resolved
   */
  getOffset(): number {
    return this.bytecodeOffset;
  }

  /**
   * Adds a line number to this label.
   * @param lineNumber the line number
   */
  addLineNumber(lineNumber: number): void {
    this.flags |= Label.FLAG_LINE_NUMBER;
    this.lineNumbers.push(lineNumber);
  }

  /**
   * Returns the line numbers associated with this label.
   * @returns the line numbers array
   */
  getLineNumbers(): readonly number[] {
    return this.lineNumbers;
  }

  /**
   * Puts a reference to this label in the bytecode of a method.
   * If the label has been resolved, the offset is written directly.
   * Otherwise, a forward reference is recorded.
   * 
   * @param code the bytecode of the method
   * @param sourceInsnBytecodeOffset the bytecode offset of the source instruction
   * @param wideReference true for 4-byte reference, false for 2-byte
   */
  put(code: ByteVector, sourceInsnBytecodeOffset: number, wideReference: boolean): void {
    if ((this.flags & Label.FLAG_RESOLVED) !== 0) {
      // Label is already resolved, write the offset directly
      const offset = this.bytecodeOffset - sourceInsnBytecodeOffset;
      if (wideReference) {
        code.putInt(offset);
      } else {
        code.putShort(offset);
      }
    } else {
      // Label not yet resolved, record a forward reference
      const referenceOffset = code.length;
      this.forwardReferences.push({
        sourceInsnBytecodeOffset,
        referenceOffset,
        isWide: wideReference,
      });

      if (wideReference) {
        // For wide references, reserve 4 bytes.
        code.putInt(-1); // placeholder
      } else {
        // For short references, reserve 2 bytes.
        code.putShort(-1); // placeholder
      }
    }
  }

  /**
   * Resolves all forward references to this label.
   * 
   * @param code the bytecode of the method
   * @param _stackMapTableEntries optional stack map table entries
   * @param codeLength the current length of the bytecode
   * @returns true if forward references were resolved with a wide offset
   */
  resolve(code: Uint8Array, _stackMapTableEntries: ByteVector | null, codeLength: number): boolean {
    this.flags |= Label.FLAG_RESOLVED;
    this.bytecodeOffset = codeLength;

    let hasWideForwardReferences = false;

    for (const ref of this.forwardReferences) {
      const offset = this.bytecodeOffset - ref.sourceInsnBytecodeOffset;
      const referenceOffset = ref.referenceOffset;

      if (ref.isWide) {
        // Write 4-byte offset
        code[referenceOffset] = (offset >>> 24) & 0xFF;
        code[referenceOffset + 1] = (offset >>> 16) & 0xFF;
        code[referenceOffset + 2] = (offset >>> 8) & 0xFF;
        code[referenceOffset + 3] = offset & 0xFF;
      } else {
        // Check if we need a wide offset
        if (offset < -32768 || offset > 32767) {
          hasWideForwardReferences = true;
        }
        // Write 2-byte offset
        code[referenceOffset] = (offset >>> 8) & 0xFF;
        code[referenceOffset + 1] = offset & 0xFF;
      }
    }

    // Clear forward references as they're now resolved
    this.forwardReferences = [];

    return hasWideForwardReferences;
  }

  /**
   * Accepts a visitor for this label.
   * @param methodVisitor the method visitor
   * @param visitLineNumbers whether to visit line numbers
   */
  accept(methodVisitor: { visitLabel(label: Label): void; visitLineNumber?(line: number, start: Label): void }, visitLineNumbers: boolean): void {
    methodVisitor.visitLabel(this);
    if (visitLineNumbers && (this.flags & Label.FLAG_LINE_NUMBER) !== 0) {
      for (const lineNumber of this.lineNumbers) {
        methodVisitor.visitLineNumber?.(lineNumber, this);
      }
    }
  }

  /**
   * Returns the canonical instance of this label.
   * For labels at the same bytecode offset, this ensures we use a single instance.
   */
  getCanonicalInstance(): Label {
    return this;
  }

  /**
   * Returns a string representation of this label.
   */
  toString(): string {
    return `L${this.bytecodeOffset >= 0 ? this.bytecodeOffset : '?'}`;
  }
}

/**
 * Creates a new label.
 * @returns a new Label instance
 */
export function createLabel(): Label {
  return new Label();
}
