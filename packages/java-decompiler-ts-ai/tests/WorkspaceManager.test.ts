import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import {
  classNameToFilePath,
  filePathToClassName,
  createWorkspace,
  writeSourceFiles,
  readSourceFiles,
  cleanupWorkspace,
  listJavaFiles,
} from '../src/WorkspaceManager';

describe('classNameToFilePath', () => {
  it('converts a simple class name', () => {
    expect(classNameToFilePath('Foo')).toBe('Foo.java');
  });

  it('converts a fully qualified class name', () => {
    expect(classNameToFilePath('com/example/Foo')).toBe('com/example/Foo.java');
  });

  it('converts an inner class name', () => {
    expect(classNameToFilePath('com/example/Foo$Bar')).toBe('com/example/Foo$Bar.java');
  });
});

describe('filePathToClassName', () => {
  it('converts a simple file path', () => {
    expect(filePathToClassName('Foo.java')).toBe('Foo');
  });

  it('converts a fully qualified file path', () => {
    expect(filePathToClassName('com/example/Foo.java')).toBe('com/example/Foo');
  });
});

describe('workspace lifecycle', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    for (const dir of createdDirs) {
      await cleanupWorkspace(dir).catch(() => {});
    }
    createdDirs.length = 0;
  });

  it('creates a workspace directory', async () => {
    const dir = await createWorkspace();
    createdDirs.push(dir);

    const stats = await stat(dir);
    expect(stats.isDirectory()).toBe(true);
    expect(dir).toContain('java-decompiler-ai-');
  });

  it('writes and reads back source files', async () => {
    const dir = await createWorkspace();
    createdDirs.push(dir);

    const sources = new Map<string, string>([
      ['com/example/Foo', 'public class Foo {}'],
      ['com/example/Bar', 'public class Bar {}'],
      ['DefaultPackageClass', 'class DefaultPackageClass {}'],
    ]);

    await writeSourceFiles(dir, sources);

    // Verify files were written
    const fooContent = await readFile(join(dir, 'com/example/Foo.java'), 'utf-8');
    expect(fooContent).toBe('public class Foo {}');

    const defaultContent = await readFile(join(dir, 'DefaultPackageClass.java'), 'utf-8');
    expect(defaultContent).toBe('class DefaultPackageClass {}');

    // Read them back
    const result = await readSourceFiles(dir, sources);
    expect(result.size).toBe(3);
    expect(result.get('com/example/Foo')).toBe('public class Foo {}');
    expect(result.get('com/example/Bar')).toBe('public class Bar {}');
    expect(result.get('DefaultPackageClass')).toBe('class DefaultPackageClass {}');
  });

  it('falls back to original source for missing files', async () => {
    const dir = await createWorkspace();
    createdDirs.push(dir);

    const original = new Map<string, string>([
      ['com/example/Exists', 'class Exists {}'],
      ['com/example/Missing', 'class Missing {}'],
    ]);

    // Only write one file
    await writeSourceFiles(dir, new Map([['com/example/Exists', 'class Exists { /* modified */ }']]));

    const result = await readSourceFiles(dir, original);
    expect(result.get('com/example/Exists')).toBe('class Exists { /* modified */ }');
    expect(result.get('com/example/Missing')).toBe('class Missing {}');
  });

  it('handles empty source map', async () => {
    const dir = await createWorkspace();
    createdDirs.push(dir);

    const sources = new Map<string, string>();
    await writeSourceFiles(dir, sources);

    const result = await readSourceFiles(dir, sources);
    expect(result.size).toBe(0);
  });

  it('cleans up workspace directory', async () => {
    const dir = await createWorkspace();

    await writeSourceFiles(dir, new Map([['Foo', 'class Foo {}']]));
    await cleanupWorkspace(dir);

    await expect(stat(dir)).rejects.toThrow();
  });

  it('lists java files recursively', async () => {
    const dir = await createWorkspace();
    createdDirs.push(dir);

    await writeSourceFiles(
      dir,
      new Map([
        ['com/example/Foo', 'class Foo {}'],
        ['com/example/sub/Bar', 'class Bar {}'],
        ['Root', 'class Root {}'],
      ]),
    );

    const files = await listJavaFiles(dir);
    expect(files.sort()).toEqual([
      'Root.java',
      join('com/example/Foo.java'),
      join('com/example/sub/Bar.java'),
    ].sort());
  });
});
