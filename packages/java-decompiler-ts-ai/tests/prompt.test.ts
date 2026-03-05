import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserMessage } from '../src/prompt';

describe('buildSystemPrompt', () => {
  it('returns default prompt when no options', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Java code cleanup specialist');
    expect(prompt).toContain('Preserve logical behavior');
    expect(prompt).toContain('Fix formatting');
    expect(prompt).toContain('Improve variable names');
  });

  it('uses custom system prompt when provided', () => {
    const custom = 'You are a custom agent.';
    const prompt = buildSystemPrompt({ systemPrompt: custom });
    expect(prompt).toBe(custom);
  });

  it('appends additional instructions to default prompt', () => {
    const prompt = buildSystemPrompt({
      additionalInstructions: 'Also add Javadoc to public methods.',
    });
    expect(prompt).toContain('Java code cleanup specialist');
    expect(prompt).toContain('Additional Instructions');
    expect(prompt).toContain('Also add Javadoc to public methods.');
  });

  it('ignores additionalInstructions when systemPrompt is provided', () => {
    const prompt = buildSystemPrompt({
      systemPrompt: 'Custom prompt.',
      additionalInstructions: 'Should be ignored.',
    });
    expect(prompt).toBe('Custom prompt.');
    expect(prompt).not.toContain('Should be ignored.');
  });
});

describe('buildUserMessage', () => {
  it('includes workspace path and file list', () => {
    const message = buildUserMessage('/tmp/workspace', [
      'com/example/Foo.java',
      'com/example/Bar.java',
    ]);

    expect(message).toContain('/tmp/workspace');
    expect(message).toContain('- com/example/Foo.java');
    expect(message).toContain('- com/example/Bar.java');
    expect(message).toContain('clean up');
  });

  it('handles empty file list', () => {
    const message = buildUserMessage('/tmp/workspace', []);
    expect(message).toContain('/tmp/workspace');
  });
});
