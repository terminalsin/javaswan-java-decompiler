import { ByteVector } from '../core/ByteVector';
import { Label } from '../core/Label';
import {
  Frame,
  FrameElement,
  SAME_FRAME,
  SAME_LOCALS_1_STACK_ITEM_FRAME,
  SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED,
  CHOP_FRAME,
  SAME_FRAME_EXTENDED,
  APPEND_FRAME,
  FULL_FRAME,
  ITEM_TOP,
  ITEM_INTEGER,
  ITEM_FLOAT,
  ITEM_DOUBLE,
  ITEM_LONG,
  ITEM_NULL,
  ITEM_UNINITIALIZED_THIS,
  ITEM_OBJECT,
  ITEM_UNINITIALIZED,
} from './Frame';
import {
  F_FULL,
  F_APPEND,
  F_CHOP,
  F_SAME,
  F_SAME1,
  TOP,
  INTEGER,
  FRAME_FLOAT,
  FRAME_DOUBLE,
  FRAME_LONG,
  NULL,
  UNINITIALIZED_THIS,
} from '../core/Opcodes';
import type { SymbolTable } from '../core/SymbolTable';

/**
 * Writes stack map frames to a StackMapTable attribute.
 * Does NOT compute frames - only writes frame data.
 */
export class FrameWriter {
  private symbolTable: SymbolTable;
  private stackMapTableEntries: ByteVector;
  private previousFrameOffset: number;
  private frameCount: number;

  /**
   * Constructs a new FrameWriter.
   * @param symbolTable the symbol table for writing class references
   */
  constructor(symbolTable: SymbolTable) {
    this.symbolTable = symbolTable;
    this.stackMapTableEntries = new ByteVector();
    this.previousFrameOffset = -1;
    this.frameCount = 0;
  }

  /**
   * Writes a frame to the StackMapTable.
   * @param frame the frame to write
   * @param bytecodeOffset the bytecode offset of the frame
   */
  writeFrame(frame: Frame, bytecodeOffset: number): void {
    const offsetDelta = bytecodeOffset - this.previousFrameOffset - 1;
    this.previousFrameOffset = bytecodeOffset;
    this.frameCount++;

    switch (frame.type) {
      case F_SAME:
        this.writeSameFrame(offsetDelta);
        break;
      case F_SAME1:
        this.writeSame1Frame(offsetDelta, frame.stack![0]!);
        break;
      case F_APPEND:
        this.writeAppendFrame(offsetDelta, frame.local!);
        break;
      case F_CHOP:
        this.writeChopFrame(offsetDelta, frame.numLocal);
        break;
      case F_FULL:
        this.writeFullFrame(offsetDelta, frame.local!, frame.stack!);
        break;
      default:
        throw new Error('Unknown frame type: ' + frame.type);
    }
  }

  /**
   * Writes a SAME frame.
   */
  private writeSameFrame(offsetDelta: number): void {
    if (offsetDelta < 64) {
      this.stackMapTableEntries.putByte(SAME_FRAME + offsetDelta);
    } else {
      this.stackMapTableEntries.putByte(SAME_FRAME_EXTENDED);
      this.stackMapTableEntries.putShort(offsetDelta);
    }
  }

  /**
   * Writes a SAME_LOCALS_1_STACK_ITEM frame.
   */
  private writeSame1Frame(offsetDelta: number, stackElement: FrameElement): void {
    if (offsetDelta < 64) {
      this.stackMapTableEntries.putByte(SAME_LOCALS_1_STACK_ITEM_FRAME + offsetDelta);
    } else {
      this.stackMapTableEntries.putByte(SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED);
      this.stackMapTableEntries.putShort(offsetDelta);
    }
    this.writeVerificationTypeInfo(stackElement);
  }

  /**
   * Writes an APPEND frame.
   */
  private writeAppendFrame(offsetDelta: number, locals: FrameElement[]): void {
    this.stackMapTableEntries.putByte(APPEND_FRAME + locals.length - 1);
    this.stackMapTableEntries.putShort(offsetDelta);
    for (const local of locals) {
      this.writeVerificationTypeInfo(local);
    }
  }

  /**
   * Writes a CHOP frame.
   */
  private writeChopFrame(offsetDelta: number, chopCount: number): void {
    this.stackMapTableEntries.putByte(CHOP_FRAME + 3 - chopCount);
    this.stackMapTableEntries.putShort(offsetDelta);
  }

  /**
   * Writes a FULL frame.
   */
  private writeFullFrame(offsetDelta: number, locals: FrameElement[], stack: FrameElement[]): void {
    this.stackMapTableEntries.putByte(FULL_FRAME);
    this.stackMapTableEntries.putShort(offsetDelta);
    this.stackMapTableEntries.putShort(locals.length);
    for (const local of locals) {
      this.writeVerificationTypeInfo(local);
    }
    this.stackMapTableEntries.putShort(stack.length);
    for (const stackElement of stack) {
      this.writeVerificationTypeInfo(stackElement);
    }
  }

  /**
   * Writes a verification type info.
   */
  private writeVerificationTypeInfo(element: FrameElement): void {
    if (typeof element === 'number') {
      switch (element) {
        case TOP:
          this.stackMapTableEntries.putByte(ITEM_TOP);
          break;
        case INTEGER:
          this.stackMapTableEntries.putByte(ITEM_INTEGER);
          break;
        case FRAME_FLOAT:
          this.stackMapTableEntries.putByte(ITEM_FLOAT);
          break;
        case FRAME_DOUBLE:
          this.stackMapTableEntries.putByte(ITEM_DOUBLE);
          break;
        case FRAME_LONG:
          this.stackMapTableEntries.putByte(ITEM_LONG);
          break;
        case NULL:
          this.stackMapTableEntries.putByte(ITEM_NULL);
          break;
        case UNINITIALIZED_THIS:
          this.stackMapTableEntries.putByte(ITEM_UNINITIALIZED_THIS);
          break;
        default:
          throw new Error('Unknown frame element: ' + element);
      }
    } else if (typeof element === 'string') {
      this.stackMapTableEntries.putByte(ITEM_OBJECT);
      const classSymbol = this.symbolTable.addConstantClass(element);
      this.stackMapTableEntries.putShort(classSymbol.index);
    } else {
      // Label - uninitialized type
      const label = element as Label;
      this.stackMapTableEntries.putByte(ITEM_UNINITIALIZED);
      this.stackMapTableEntries.putShort(label.bytecodeOffset);
    }
  }

  /**
   * Returns the number of frames written.
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Returns the StackMapTable entries.
   */
  getStackMapTableEntries(): ByteVector {
    return this.stackMapTableEntries;
  }

  /**
   * Returns the total size of the StackMapTable attribute.
   */
  computeStackMapTableSize(): number {
    if (this.frameCount === 0) {
      return 0;
    }
    // attribute_name_index (2) + attribute_length (4) + number_of_entries (2) + entries
    return 8 + this.stackMapTableEntries.length;
  }

  /**
   * Writes the StackMapTable attribute to the output.
   * @param output the output byte vector
   * @param stackMapTableAttributeIndex the constant pool index of "StackMapTable"
   */
  putStackMapTableAttribute(output: ByteVector, stackMapTableAttributeIndex: number): void {
    if (this.frameCount === 0) {
      return;
    }
    output.putShort(stackMapTableAttributeIndex);
    output.putInt(2 + this.stackMapTableEntries.length);
    output.putShort(this.frameCount);
    output.putByteArray(this.stackMapTableEntries.data, 0, this.stackMapTableEntries.length);
  }
}

/**
 * Computes the frame type from F_* constants to StackMapTable byte representation.
 */
export function computeFrameType(
  frame: Frame,
  offsetDelta: number,
  _previousLocalsCount: number
): number {
  if (frame.type === F_SAME) {
    return offsetDelta < 64 ? offsetDelta : SAME_FRAME_EXTENDED;
  }
  if (frame.type === F_SAME1) {
    return offsetDelta < 64
      ? SAME_LOCALS_1_STACK_ITEM_FRAME + offsetDelta
      : SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED;
  }
  if (frame.type === F_APPEND) {
    return APPEND_FRAME + frame.numLocal - 1;
  }
  if (frame.type === F_CHOP) {
    return CHOP_FRAME + 3 - frame.numLocal;
  }
  return FULL_FRAME;
}
