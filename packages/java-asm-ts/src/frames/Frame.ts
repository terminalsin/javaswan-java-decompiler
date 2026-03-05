import {
  F_NEW,
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
import type { Label } from '../core/Label';

/**
 * Frame types for StackMapTable attribute parsing/writing.
 */
export const SAME_FRAME = 0;
export const SAME_LOCALS_1_STACK_ITEM_FRAME = 64;
export const RESERVED = 128;
export const SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED = 247;
export const CHOP_FRAME = 248;
export const SAME_FRAME_EXTENDED = 251;
export const APPEND_FRAME = 252;
export const FULL_FRAME = 255;

/**
 * Verification type info tags.
 */
export const ITEM_TOP = 0;
export const ITEM_INTEGER = 1;
export const ITEM_FLOAT = 2;
export const ITEM_DOUBLE = 3;
export const ITEM_LONG = 4;
export const ITEM_NULL = 5;
export const ITEM_UNINITIALIZED_THIS = 6;
export const ITEM_OBJECT = 7;
export const ITEM_UNINITIALIZED = 8;

/**
 * Represents a stack map frame element.
 * Can be a primitive type (TOP, INTEGER, FLOAT, DOUBLE, LONG, NULL, UNINITIALIZED_THIS),
 * an object type (internal name string), or an uninitialized type (Label).
 */
export type FrameElement = number | string | Label;

/**
 * Represents a stack map frame for reading/writing purposes only.
 * This does NOT include any frame computation logic.
 */
export class Frame {
  /** The frame type (F_NEW, F_FULL, F_APPEND, F_CHOP, F_SAME, F_SAME1). */
  readonly type: number;

  /** The number of local variable types in this frame. */
  readonly numLocal: number;

  /** The local variable types (or null for F_SAME, F_SAME1). */
  readonly local: FrameElement[] | null;

  /** The number of stack element types in this frame. */
  readonly numStack: number;

  /** The stack element types (or null for F_SAME, F_CHOP, F_APPEND). */
  readonly stack: FrameElement[] | null;

  /**
   * Constructs a new Frame.
   * @param type the frame type
   * @param numLocal the number of local variables
   * @param local the local variable types
   * @param numStack the number of stack elements
   * @param stack the stack element types
   */
  constructor(
    type: number,
    numLocal: number,
    local: FrameElement[] | null,
    numStack: number,
    stack: FrameElement[] | null
  ) {
    this.type = type;
    this.numLocal = numLocal;
    this.local = local;
    this.numStack = numStack;
    this.stack = stack;
  }

  /**
   * Creates a SAME frame.
   */
  static same(): Frame {
    return new Frame(F_SAME, 0, null, 0, null);
  }

  /**
   * Creates a SAME1 frame with a single stack element.
   * @param stackType the single stack element type
   */
  static same1(stackType: FrameElement): Frame {
    return new Frame(F_SAME1, 0, null, 1, [stackType]);
  }

  /**
   * Creates an APPEND frame with additional local variables.
   * @param locals the additional local variable types (1-3 elements)
   */
  static append(locals: FrameElement[]): Frame {
    if (locals.length < 1 || locals.length > 3) {
      throw new Error('APPEND frame must have 1-3 additional locals');
    }
    return new Frame(F_APPEND, locals.length, locals, 0, null);
  }

  /**
   * Creates a CHOP frame that removes local variables.
   * @param count the number of locals to remove (1-3)
   */
  static chop(count: number): Frame {
    if (count < 1 || count > 3) {
      throw new Error('CHOP frame must remove 1-3 locals');
    }
    return new Frame(F_CHOP, count, null, 0, null);
  }

  /**
   * Creates a FULL frame with complete local and stack info.
   * @param locals the local variable types
   * @param stack the stack element types
   */
  static full(locals: FrameElement[], stack: FrameElement[]): Frame {
    return new Frame(F_FULL, locals.length, locals, stack.length, stack);
  }

  /**
   * Creates a NEW frame (expanded form, used internally).
   * @param locals the local variable types
   * @param stack the stack element types
   */
  static newFrame(locals: FrameElement[], stack: FrameElement[]): Frame {
    return new Frame(F_NEW, locals.length, locals, stack.length, stack);
  }

  /**
   * Converts a verification type info tag to its corresponding frame element.
   * @param tag the verification type info tag
   * @returns the corresponding frame element
   */
  static tagToElement(tag: number): number {
    switch (tag) {
      case ITEM_TOP:
        return TOP;
      case ITEM_INTEGER:
        return INTEGER;
      case ITEM_FLOAT:
        return FRAME_FLOAT;
      case ITEM_DOUBLE:
        return FRAME_DOUBLE;
      case ITEM_LONG:
        return FRAME_LONG;
      case ITEM_NULL:
        return NULL;
      case ITEM_UNINITIALIZED_THIS:
        return UNINITIALIZED_THIS;
      default:
        throw new Error('Unknown verification type tag: ' + tag);
    }
  }

  /**
   * Converts a frame element to its verification type info tag.
   * @param element the frame element
   * @returns the verification type info tag
   */
  static elementToTag(element: FrameElement): number {
    if (typeof element === 'number') {
      switch (element) {
        case TOP:
          return ITEM_TOP;
        case INTEGER:
          return ITEM_INTEGER;
        case FRAME_FLOAT:
          return ITEM_FLOAT;
        case FRAME_DOUBLE:
          return ITEM_DOUBLE;
        case FRAME_LONG:
          return ITEM_LONG;
        case NULL:
          return ITEM_NULL;
        case UNINITIALIZED_THIS:
          return ITEM_UNINITIALIZED_THIS;
        default:
          throw new Error('Unknown frame element value: ' + element);
      }
    }
    if (typeof element === 'string') {
      return ITEM_OBJECT;
    }
    // Label - uninitialized type
    return ITEM_UNINITIALIZED;
  }

  /**
   * Returns a string representation of this frame.
   */
  toString(): string {
    const typeName = this.getTypeName();
    const locals = this.local ? this.local.map(e => this.elementToString(e)).join(', ') : '';
    const stack = this.stack ? this.stack.map(e => this.elementToString(e)).join(', ') : '';
    return `Frame(${typeName}, locals=[${locals}], stack=[${stack}])`;
  }

  private getTypeName(): string {
    switch (this.type) {
      case F_NEW:
        return 'NEW';
      case F_FULL:
        return 'FULL';
      case F_APPEND:
        return 'APPEND';
      case F_CHOP:
        return 'CHOP';
      case F_SAME:
        return 'SAME';
      case F_SAME1:
        return 'SAME1';
      default:
        return String(this.type);
    }
  }

  private elementToString(element: FrameElement): string {
    if (typeof element === 'number') {
      switch (element) {
        case TOP:
          return 'TOP';
        case INTEGER:
          return 'INTEGER';
        case FRAME_FLOAT:
          return 'FLOAT';
        case FRAME_DOUBLE:
          return 'DOUBLE';
        case FRAME_LONG:
          return 'LONG';
        case NULL:
          return 'NULL';
        case UNINITIALIZED_THIS:
          return 'UNINITIALIZED_THIS';
        default:
          return String(element);
      }
    }
    if (typeof element === 'string') {
      return element;
    }
    // Label
    return element.toString();
  }
}

/**
 * Frame type constants
 */
export const FrameType = {
  F_NEW,
  F_FULL,
  F_APPEND,
  F_CHOP,
  F_SAME,
  F_SAME1,
} as const;

/**
 * Frame element type constants
 */
export const FrameElementType = {
  TOP,
  INTEGER,
  FLOAT: FRAME_FLOAT,
  DOUBLE: FRAME_DOUBLE,
  LONG: FRAME_LONG,
  FRAME_FLOAT,
  FRAME_DOUBLE,
  FRAME_LONG,
  NULL,
  UNINITIALIZED_THIS,
} as const;
