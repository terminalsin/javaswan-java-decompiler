import { describe, it, expect } from 'vitest';
import {
    Frame,
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
    ITEM_UNINITIALIZED
} from '../../src/frames/Frame';
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
} from '../../src/core/Opcodes';
import { Label } from '../../src/core/Label';

describe('Frame', () => {
    describe('Frame constants', () => {
        it('should have correct frame type values', () => {
            expect(SAME_FRAME).toBe(0);
            expect(SAME_LOCALS_1_STACK_ITEM_FRAME).toBe(64);
            expect(SAME_LOCALS_1_STACK_ITEM_FRAME_EXTENDED).toBe(247);
            expect(CHOP_FRAME).toBe(248);
            expect(SAME_FRAME_EXTENDED).toBe(251);
            expect(APPEND_FRAME).toBe(252);
            expect(FULL_FRAME).toBe(255);
        });

        it('should have correct item type values', () => {
            expect(ITEM_TOP).toBe(0);
            expect(ITEM_INTEGER).toBe(1);
            expect(ITEM_FLOAT).toBe(2);
            expect(ITEM_DOUBLE).toBe(3);
            expect(ITEM_LONG).toBe(4);
            expect(ITEM_NULL).toBe(5);
            expect(ITEM_UNINITIALIZED_THIS).toBe(6);
            expect(ITEM_OBJECT).toBe(7);
            expect(ITEM_UNINITIALIZED).toBe(8);
        });
    });

    describe('Frame construction', () => {
        it('should create a SAME frame', () => {
            const frame = new Frame(F_SAME, 0, [], 0, []);
            expect(frame.type).toBe(F_SAME);
            expect(frame.numLocal).toBe(0);
            expect(frame.local).toEqual([]);
            expect(frame.numStack).toBe(0);
            expect(frame.stack).toEqual([]);
        });

        it('should create a FULL frame', () => {
            const locals = [INTEGER, FRAME_LONG, 'java/lang/Object'];
            const stack = [INTEGER];
            const frame = new Frame(F_FULL, 3, locals, 1, stack);

            expect(frame.type).toBe(F_FULL);
            expect(frame.numLocal).toBe(3);
            expect(frame.local).toEqual(locals);
            expect(frame.numStack).toBe(1);
            expect(frame.stack).toEqual(stack);
        });

        it('should create an APPEND frame', () => {
            const locals = [INTEGER, FRAME_FLOAT];
            const frame = new Frame(F_APPEND, 2, locals, 0, []);

            expect(frame.type).toBe(F_APPEND);
            expect(frame.numLocal).toBe(2);
            expect(frame.local).toEqual(locals);
        });

        it('should create a CHOP frame', () => {
            const frame = new Frame(F_CHOP, 2, [], 0, []);

            expect(frame.type).toBe(F_CHOP);
            expect(frame.numLocal).toBe(2);
        });

        it('should create a SAME1 frame', () => {
            const stack = [INTEGER];
            const frame = new Frame(F_SAME1, 0, [], 1, stack);

            expect(frame.type).toBe(F_SAME1);
            expect(frame.numStack).toBe(1);
            expect(frame.stack).toEqual(stack);
        });
    });

    describe('tagToElement', () => {
        it('should convert ITEM_TOP to TOP', () => {
            expect(Frame.tagToElement(ITEM_TOP)).toBe(TOP);
        });

        it('should convert ITEM_INTEGER to INTEGER', () => {
            expect(Frame.tagToElement(ITEM_INTEGER)).toBe(INTEGER);
        });

        it('should convert ITEM_FLOAT to FRAME_FLOAT', () => {
            expect(Frame.tagToElement(ITEM_FLOAT)).toBe(FRAME_FLOAT);
        });

        it('should convert ITEM_DOUBLE to FRAME_DOUBLE', () => {
            expect(Frame.tagToElement(ITEM_DOUBLE)).toBe(FRAME_DOUBLE);
        });

        it('should convert ITEM_LONG to FRAME_LONG', () => {
            expect(Frame.tagToElement(ITEM_LONG)).toBe(FRAME_LONG);
        });

        it('should convert ITEM_NULL to NULL', () => {
            expect(Frame.tagToElement(ITEM_NULL)).toBe(NULL);
        });

        it('should convert ITEM_UNINITIALIZED_THIS to UNINITIALIZED_THIS', () => {
            expect(Frame.tagToElement(ITEM_UNINITIALIZED_THIS)).toBe(UNINITIALIZED_THIS);
        });

        it('should throw for unknown tag', () => {
            expect(() => Frame.tagToElement(99)).toThrow('Unknown verification type tag');
        });
    });

    describe('elementToTag', () => {
        it('should convert TOP to ITEM_TOP', () => {
            expect(Frame.elementToTag(TOP)).toBe(ITEM_TOP);
        });

        it('should convert INTEGER to ITEM_INTEGER', () => {
            expect(Frame.elementToTag(INTEGER)).toBe(ITEM_INTEGER);
        });

        it('should convert FRAME_FLOAT to ITEM_FLOAT', () => {
            expect(Frame.elementToTag(FRAME_FLOAT)).toBe(ITEM_FLOAT);
        });

        it('should convert FRAME_DOUBLE to ITEM_DOUBLE', () => {
            expect(Frame.elementToTag(FRAME_DOUBLE)).toBe(ITEM_DOUBLE);
        });

        it('should convert FRAME_LONG to ITEM_LONG', () => {
            expect(Frame.elementToTag(FRAME_LONG)).toBe(ITEM_LONG);
        });

        it('should convert NULL to ITEM_NULL', () => {
            expect(Frame.elementToTag(NULL)).toBe(ITEM_NULL);
        });

        it('should convert UNINITIALIZED_THIS to ITEM_UNINITIALIZED_THIS', () => {
            expect(Frame.elementToTag(UNINITIALIZED_THIS)).toBe(ITEM_UNINITIALIZED_THIS);
        });

        it('should convert string (class name) to ITEM_OBJECT', () => {
            expect(Frame.elementToTag('java/lang/Object')).toBe(ITEM_OBJECT);
        });

        it('should convert Label to ITEM_UNINITIALIZED', () => {
            const label = new Label();
            expect(Frame.elementToTag(label)).toBe(ITEM_UNINITIALIZED);
        });

        it('should throw for unknown numeric element', () => {
            expect(() => Frame.elementToTag(999)).toThrow('Unknown frame element');
        });
    });

    describe('toString', () => {
        it('should represent SAME frame', () => {
            const frame = new Frame(F_SAME, 0, [], 0, []);
            const str = frame.toString();
            expect(str).toContain('SAME');
        });

        it('should represent FULL frame', () => {
            const frame = new Frame(F_FULL, 2, [INTEGER, 'java/lang/String'], 1, [NULL]);
            const str = frame.toString();
            expect(str).toContain('FULL');
            expect(str).toContain('INTEGER');
            expect(str).toContain('java/lang/String');
            expect(str).toContain('NULL');
        });

        it('should represent frame element types correctly', () => {
            const frame = new Frame(F_FULL, 6, [TOP, INTEGER, FRAME_FLOAT, FRAME_DOUBLE, FRAME_LONG, NULL], 1, [UNINITIALIZED_THIS]);
            const str = frame.toString();
            expect(str).toContain('TOP');
            expect(str).toContain('INTEGER');
            expect(str).toContain('FLOAT');
            expect(str).toContain('DOUBLE');
            expect(str).toContain('LONG');
            expect(str).toContain('NULL');
            expect(str).toContain('UNINITIALIZED_THIS');
        });
    });
});
