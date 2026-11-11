import { describe, expect, it } from 'vitest';

import type { Message } from '#/llm/message';
import { lowerMessage } from '#/llm/builtin/protocol/openai/lower';

const lower = {
  reasoningKey: 'reasoning_content',
  preserveThinking: false,
  toolMessageConversion: undefined,
} as const;

function assistant(content: Message['content']): Message {
  return { role: 'assistant', content, toolCalls: [] };
}

describe('openai lowerMessage', () => {
  it('folds adjacent text parts into a single string', () => {
    const [native] = lowerMessage(
      assistant([
        { type: 'text', text: '我先说' },
        { type: 'text', text: '结论' },
        { type: 'text', text: '，再说' },
        { type: 'text', text: '细节。' },
      ]),
      lower,
    );

    expect(native?.content).toBe('我先说结论，再说细节。');
  });

  it('keeps a media array when a non-text part is present', () => {
    const [native] = lowerMessage(
      assistant([
        { type: 'text', text: '看图' },
        { type: 'image_url', imageUrl: { url: 'https://example.test/a.png' } },
      ]),
      lower,
    );

    expect(Array.isArray(native?.content)).toBe(true);
    expect(native?.content).toEqual([
      { type: 'text', text: '看图' },
      { type: 'image_url', image_url: { url: 'https://example.test/a.png' } },
    ]);
  });

  it('drops thinking parts and still folds the text', () => {
    const [native] = lowerMessage(
      assistant([
        { type: 'think', think: '想一想' },
        { type: 'text', text: '第一段' },
        { type: 'text', text: '第二段' },
      ]),
      lower,
    );

    expect(native?.content).toBe('第一段第二段');
    expect(native?.reasoning_content).toBe('想一想');
  });
});
