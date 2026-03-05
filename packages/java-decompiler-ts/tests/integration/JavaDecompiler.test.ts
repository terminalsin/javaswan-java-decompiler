import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JavaDecompiler } from '../../src';

const WORKSPACE_DIR = path.join(__dirname, '../../../java-asm-ts/workspace');

describe('JavaDecompiler', () => {
  it('decompiles Test.class (empty methods)', () => {
    const bytes = fs.readFileSync(path.join(WORKSPACE_DIR, 'Test.class'));
    const decompiler = new JavaDecompiler();
    const src = decompiler.decompileClassFileBytes(bytes);

    expect(src).toContain('class Test');
    expect(src).toContain('test1');
    expect(src).toContain('test2');
  });

  it('decompiles Test4.class (simple arithmetic)', () => {
    const bytes = fs.readFileSync(path.join(WORKSPACE_DIR, 'Test4.class'));
    const decompiler = new JavaDecompiler();
    const src = decompiler.decompileClassFileBytes(bytes);

    expect(src).toContain('class Test4');
    expect(src).toContain('int test');
    expect(src).toContain('return');
  });

  it('decompiles Test6.class (switch)', () => {
    const bytes = fs.readFileSync(path.join(WORKSPACE_DIR, 'Test6.class'));
    const decompiler = new JavaDecompiler();
    const src = decompiler.decompileClassFileBytes(bytes);

    expect(src).toContain('class Test6');
    expect(src).toContain('switch (');
    expect(src).toContain('case 0:');
    expect(src).toContain('default:');
  });
});

