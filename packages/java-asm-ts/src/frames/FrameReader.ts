import { Label } from '../core/Label';
import {
  Frame,
  FrameElement,
  SAME_LOCALS_1_STACK_ITEM_FRAME,
  SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED,
  SAME_FRAME_EXTENDED,
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

/**
 * Context for reading frames from a StackMapTable attribute.
 */
export interface FrameReaderContext {
  /** The class file buffer. */
  classFileBuffer: Uint8Array;
  
  /** Current offset in the StackMapTable attribute. */
  currentOffset: number;
  
  /** Labels array for the method. */
  labels: Array<Label | null>;
  
  /** Read a class constant from the constant pool. */
  readClass(cpIndex: number): string;
  
  /** Read an unsigned short from the buffer. */
  readUnsignedShort(offset: number): number;
}

/**
 * Reads stack map frames from a StackMapTable attribute.
 * Does NOT compute frames - only reads existing frame data.
 */
export class FrameReader {
  private context: FrameReaderContext;
  private currentOffset: number;
  private previousFrameOffset: number;
  private currentLocals: FrameElement[];

  /**
   * Constructs a new FrameReader.
   * @param context the reading context
   * @param initialLocals the initial local variable types (from method descriptor)
   */
  constructor(context: FrameReaderContext, initialLocals: FrameElement[]) {
    this.context = context;
    this.currentOffset = context.currentOffset;
    this.previousFrameOffset = -1;
    this.currentLocals = [...initialLocals];
  }

  /**
   * Gets or creates a label at the given bytecode offset.
   * @param bytecodeOffset the bytecode offset
   * @returns the label at that offset
   */
  private getLabel(bytecodeOffset: number): Label {
    let label = this.context.labels[bytecodeOffset];
    if (label === null || label === undefined) {
      label = new Label();
      this.context.labels[bytecodeOffset] = label;
    }
    return label;
  }

  /**
   * Reads the next frame from the StackMapTable.
   * @returns the frame, or null if no more frames
   */
  readFrame(): Frame | null {
    const buffer = this.context.classFileBuffer;
    const offset = this.currentOffset;

    // Read frame type byte
    const frameType = buffer[offset]!;
    let newOffset = offset + 1;

    // Calculate bytecode offset
    let bytecodeOffsetDelta: number;
    let frameKind: number;
    let numLocal: number;
    let numStack: number;
    let locals: FrameElement[] | null = null;
    let stack: FrameElement[] | null = null;

    if (frameType < SAME_LOCALS_1_STACK_ITEM_FRAME) {
      // SAME frame (frame_type in [0, 63])
      bytecodeOffsetDelta = frameType;
      frameKind = F_SAME;
      numLocal = 0;
      numStack = 0;
    } else if (frameType < SAME_LOCALS_1_STACK_ITEM_FRAME + 64) {
      // SAME_LOCALS_1_STACK_ITEM frame (frame_type in [64, 127])
      bytecodeOffsetDelta = frameType - SAME_LOCALS_1_STACK_ITEM_FRAME;
      frameKind = F_SAME1;
      numLocal = 0;
      numStack = 1;
      const [stackElement, nextOffset] = this.readVerificationTypeInfo(newOffset);
      stack = [stackElement];
      newOffset = nextOffset;
    } else if (frameType < SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED) {
      // Reserved for future use
      throw new Error('Invalid frame type: ' + frameType);
    } else if (frameType === SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED) {
      // SAME_LOCALS_1_STACK_ITEM_EXTENDED frame
      bytecodeOffsetDelta = this.readUnsignedShort(newOffset);
      newOffset += 2;
      frameKind = F_SAME1;
      numLocal = 0;
      numStack = 1;
      const [stackElement, nextOffset] = this.readVerificationTypeInfo(newOffset);
      stack = [stackElement];
      newOffset = nextOffset;
    } else if (frameType < SAME_FRAME_EXTENDED) {
      // CHOP frame (frame_type in [248, 250])
      bytecodeOffsetDelta = this.readUnsignedShort(newOffset);
      newOffset += 2;
      frameKind = F_CHOP;
      numLocal = SAME_FRAME_EXTENDED - frameType;
      numStack = 0;
      // Remove locals from currentLocals
      this.currentLocals = this.currentLocals.slice(0, this.currentLocals.length - numLocal);
    } else if (frameType === SAME_FRAME_EXTENDED) {
      // SAME_EXTENDED frame
      bytecodeOffsetDelta = this.readUnsignedShort(newOffset);
      newOffset += 2;
      frameKind = F_SAME;
      numLocal = 0;
      numStack = 0;
    } else if (frameType < FULL_FRAME) {
      // APPEND frame (frame_type in [252, 254])
      bytecodeOffsetDelta = this.readUnsignedShort(newOffset);
      newOffset += 2;
      frameKind = F_APPEND;
      numLocal = frameType - SAME_FRAME_EXTENDED;
      numStack = 0;
      locals = [];
      for (let i = 0; i < numLocal; i++) {
        const [local, nextOffset] = this.readVerificationTypeInfo(newOffset);
        locals.push(local);
        newOffset = nextOffset;
      }
      // Add to currentLocals
      this.currentLocals = [...this.currentLocals, ...locals];
    } else {
      // FULL frame
      bytecodeOffsetDelta = this.readUnsignedShort(newOffset);
      newOffset += 2;
      frameKind = F_FULL;
      
      numLocal = this.readUnsignedShort(newOffset);
      newOffset += 2;
      locals = [];
      for (let i = 0; i < numLocal; i++) {
        const [local, nextOffset] = this.readVerificationTypeInfo(newOffset);
        locals.push(local);
        newOffset = nextOffset;
      }
      this.currentLocals = [...locals];

      numStack = this.readUnsignedShort(newOffset);
      newOffset += 2;
      stack = [];
      for (let i = 0; i < numStack; i++) {
        const [stackElement, nextOffset] = this.readVerificationTypeInfo(newOffset);
        stack.push(stackElement);
        newOffset = nextOffset;
      }
    }

    // Calculate actual bytecode offset
    const bytecodeOffset = this.previousFrameOffset + bytecodeOffsetDelta + 1;
    this.previousFrameOffset = bytecodeOffset;

    // Create label at bytecode offset
    this.getLabel(bytecodeOffset);

    // Update current offset
    this.currentOffset = newOffset;

    return new Frame(frameKind, numLocal, locals, numStack, stack);
  }

  /**
   * Reads a verification type info.
   * @param offset the current offset
   * @returns the frame element and the new offset
   */
  private readVerificationTypeInfo(offset: number): [FrameElement, number] {
    const buffer = this.context.classFileBuffer;
    const tag = buffer[offset]!;
    let newOffset = offset + 1;

    switch (tag) {
      case ITEM_TOP:
        return [TOP, newOffset];
      case ITEM_INTEGER:
        return [INTEGER, newOffset];
      case ITEM_FLOAT:
        return [FRAME_FLOAT, newOffset];
      case ITEM_DOUBLE:
        return [FRAME_DOUBLE, newOffset];
      case ITEM_LONG:
        return [FRAME_LONG, newOffset];
      case ITEM_NULL:
        return [NULL, newOffset];
      case ITEM_UNINITIALIZED_THIS:
        return [UNINITIALIZED_THIS, newOffset];
      case ITEM_OBJECT: {
        const classIndex = this.readUnsignedShort(newOffset);
        newOffset += 2;
        const className = this.context.readClass(classIndex);
        return [className, newOffset];
      }
      case ITEM_UNINITIALIZED: {
        const bytecodeOffset = this.readUnsignedShort(newOffset);
        newOffset += 2;
        const label = this.getLabel(bytecodeOffset);
        return [label, newOffset];
      }
      default:
        throw new Error('Unknown verification type info tag: ' + tag);
    }
  }

  /**
   * Reads an unsigned short from the buffer.
   */
  private readUnsignedShort(offset: number): number {
    const buffer = this.context.classFileBuffer;
    return ((buffer[offset]! << 8) | buffer[offset + 1]!) & 0xFFFF;
  }

  /**
   * Returns the current offset in the StackMapTable.
   */
  getCurrentOffset(): number {
    return this.currentOffset;
  }
}

/**
 * Parses the initial local variable types from a method descriptor.
 * @param access the method access flags
 * @param descriptor the method descriptor
 * @param thisClass the internal name of the class (or null for static methods)
 * @returns the initial local variable types
 */
export function parseInitialLocals(
  access: number,
  descriptor: string,
  thisClass: string | null
): FrameElement[] {
  const locals: FrameElement[] = [];

  // Add 'this' for instance methods
  const ACC_STATIC = 0x0008;
  if ((access & ACC_STATIC) === 0 && thisClass !== null) {
    locals.push(thisClass);
  }

  // Parse method parameters
  let i = 1; // Skip '('
  while (descriptor.charAt(i) !== ')') {
    const char = descriptor.charAt(i);
    switch (char) {
      case 'B':
      case 'C':
      case 'I':
      case 'S':
      case 'Z':
        locals.push(INTEGER);
        i++;
        break;
      case 'F':
        locals.push(FRAME_FLOAT);
        i++;
        break;
      case 'J':
        locals.push(FRAME_LONG);
        i++;
        break;
      case 'D':
        locals.push(FRAME_DOUBLE);
        i++;
        break;
      case 'L': {
        const end = descriptor.indexOf(';', i);
        const className = descriptor.substring(i + 1, end);
        locals.push(className);
        i = end + 1;
        break;
      }
      case '[': {
        let arrayStart = i;
        while (descriptor.charAt(i) === '[') {
          i++;
        }
        if (descriptor.charAt(i) === 'L') {
          i = descriptor.indexOf(';', i) + 1;
        } else {
          i++;
        }
        const arrayType = descriptor.substring(arrayStart, i);
        locals.push(arrayType);
        break;
      }
      default:
        throw new Error('Invalid descriptor character: ' + char);
    }
  }

  return locals;
}
