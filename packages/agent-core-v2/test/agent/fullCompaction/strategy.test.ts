import { type Message } from '#/kosong/contract/message';
import { describe, expect, it } from 'vitest';

import { estimateTokensForMessages } from '#/kosong/contract/tokens';
import {
  DefaultCompactionStrategy,
  resolveReservedContextSize,
  RuntimeCompactionStrategy,
} from '#/agent/fullCompaction/strategy';
import type { ProfileModelContext } from '#/agent/profile/profile';

describe('DefaultCompactionStrategy', () => {
  it('keeps an oversized trailing user message as recent', () => {
    const strategy = testCompactionStrategy();
    const messages = [
      textMessage('user', 'old user'),
      textMessage('assistant', 'old assistant'),
      textMessage('user', `pending user ${'x'.repeat(1_200)}`),
    ];

    expect(strategy.computeCompactCount(messages, 'auto')).toBe(2);
  });

  it('keeps consecutive trailing user messages as recent', () => {
    const strategy = testCompactionStrategy();
    const messages = [
      textMessage('user', 'old user'),
      textMessage('assistant', 'old assistant'),
      textMessage('user', `pending user one ${'x'.repeat(1_200)}`),
      textMessage('user', `pending user two ${'x'.repeat(1_200)}`),
    ];

    expect(strategy.computeCompactCount(messages, 'auto')).toBe(2);
  });

  it('compacts the prefix when the trailing exchange itself is oversized', () => {
    const strategy = testCompactionStrategy();
    const messages = [
      textMessage('user', 'old user'),
      textMessage('assistant', 'old assistant'),
      textMessage('user', 'recent user'),
      textMessage('assistant', `recent assistant ${'x'.repeat(1_200)}`),
    ];

    expect(strategy.computeCompactCount(messages, 'auto')).toBe(2);
  });

  it('returns 0 when there is nothing to compact', () => {
    const strategy = testCompactionStrategy();
    expect(strategy.computeCompactCount([], 'auto')).toBe(0);
    expect(strategy.computeCompactCount([textMessage('user', 'only pending')], 'auto')).toBe(0);
    expect(
      strategy.computeCompactCount(
        [
          textMessage('user', 'a'),
          textMessage('user', 'b'),
          textMessage('user', 'c'),
        ],
        'auto',
      ),
    ).toBe(0);
  });

  it('returns 0 when no intermediate split exists and the last message is also unsplittable', () => {
    const strategy = testCompactionStrategy();
    const messages: Message[] = [
      textMessage('user', 'inspect'),
      {
        role: 'assistant',
        content: [],
        toolCalls: [{ type: 'function', id: 'call_a', name: 'Lookup', arguments: '{}' }],
      },
    ];

    expect(strategy.computeCompactCount(messages, 'auto')).toBe(0);
  });

  it('does not split inside a parallel tool exchange', () => {
    const strategy = testCompactionStrategy();
    const messages: Message[] = [
      textMessage('user', 'old user'),
      textMessage('assistant', 'old assistant'),
      textMessage('user', 'run both tools'),
      {
        role: 'assistant',
        content: [],
        toolCalls: [
          { type: 'function', id: 'call_a', name: 'Lookup', arguments: '{}' },
          { type: 'function', id: 'call_b', name: 'Lookup', arguments: '{}' },
        ],
      },
      { role: 'tool', content: [{ type: 'text', text: 'a' }], toolCalls: [], toolCallId: 'call_a' },
      { role: 'tool', content: [{ type: 'text', text: 'b' }], toolCalls: [], toolCallId: 'call_b' },
      textMessage('user', 'next prompt'),
    ];

    expect(strategy.computeCompactCount(messages, 'auto')).toBe(2);
  });

  it('shrinks auto compaction input to fit the model window', () => {
    const maxSize = 1_000;
    const strategy = testCompactionStrategy(maxSize);
    const messages = Array.from({ length: 30 }, (_, i) =>
      textMessage('assistant', `message ${i} ${'x'.repeat(400)}`),
    );

    const count = strategy.computeCompactCount(messages, 'auto');

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(messages.length);
    expect(estimateTokensForMessages(messages.slice(0, count))).toBeLessThanOrEqual(maxSize);
    expect(estimateTokensForMessages(messages.slice(0, count + 1))).toBeGreaterThan(maxSize);
  });

  it('shrinks manual compaction input to fit the model window', () => {
    const maxSize = 1_000;
    const strategy = testCompactionStrategy(maxSize);
    const messages = Array.from({ length: 30 }, (_, i) =>
      textMessage('assistant', `message ${i} ${'x'.repeat(400)}`),
    );

    const count = strategy.computeCompactCount(messages, 'manual');

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(messages.length);
    expect(estimateTokensForMessages(messages.slice(0, count))).toBeLessThanOrEqual(maxSize);
    expect(estimateTokensForMessages(messages.slice(0, count + 1))).toBeGreaterThan(maxSize);
  });

  it('degrades to count-based recency and skips window fitting under a zero estimator', () => {
    const zeroed = new DefaultCompactionStrategy(
      () => 1_000,
      {
        triggerRatio: 0.85,
        blockRatio: 0.85,
        reservedContextSize: 0,
        maxCompactionPerTurn: 3,
        maxOverflowCompactionAttempts: 3,
        maxRecentMessages: 2,
        maxRecentUserMessages: Infinity,
        maxRecentSizeRatio: 0.2,
        minOverflowReductionRatio: 0.05,
      },
      () => 0,
    );
    const messages = [
      textMessage('user', `old user ${'x'.repeat(1_200)}`),
      textMessage('assistant', `old assistant ${'x'.repeat(1_200)}`),
      textMessage('user', `older user ${'x'.repeat(1_200)}`),
      textMessage('assistant', `older assistant ${'x'.repeat(1_200)}`),
      textMessage('user', 'pending user'),
      textMessage('assistant', 'pending assistant'),
    ];

    expect(zeroed.computeCompactCount(messages, 'auto')).toBe(4);
    expect(testCompactionStrategy(1_000).computeCompactCount(messages, 'auto')).toBe(2);
  });

  it('reserves response context by default before the ratio threshold is reached', () => {
    const strategy = new DefaultCompactionStrategy(() => 256_000);

    expect(strategy.shouldCompact(210_000)).toBe(true);
    expect(strategy.shouldBlock(210_000)).toBe(true);
  });

  it('ignores reserved context when the reserve is not smaller than the model window', () => {
    const strategy = new DefaultCompactionStrategy(() => 32_000, {
      triggerRatio: 0.85,
      blockRatio: 0.85,
      reservedContextSize: 50_000,
      maxCompactionPerTurn: 3,
      maxOverflowCompactionAttempts: 3,
      maxRecentMessages: 3,
      maxRecentUserMessages: Infinity,
      maxRecentSizeRatio: 0.2,
      minOverflowReductionRatio: 0.05,
    });

    expect(strategy.shouldCompact(1)).toBe(false);
    expect(strategy.shouldBlock(1)).toBe(false);
    expect(strategy.shouldCompact(28_000)).toBe(true);
    expect(strategy.shouldBlock(28_000)).toBe(true);
  });
});

describe('RuntimeCompactionStrategy window-scaled reserve', () => {
  it('scales the reserve with the window between the floor and the ceiling', () => {
    expect(resolveReservedContextSize(0)).toBe(20_000);
    expect(resolveReservedContextSize(131_072)).toBe(20_000);
    expect(resolveReservedContextSize(200_000)).toBe(30_000);
    expect(resolveReservedContextSize(333_333)).toBe(50_000);
    expect(resolveReservedContextSize(1_048_576)).toBe(50_000);
  });

  it('compacts a 128k window near the ratio threshold instead of far below it', () => {
    const strategy = new RuntimeCompactionStrategy(() => modelContext(131_072));

    expect(strategy.shouldCompact(81_072)).toBe(false);
    expect(strategy.shouldCompact(111_071)).toBe(false);
    expect(strategy.shouldCompact(111_072)).toBe(true);
  });

  it('keeps loop control as an absolute override of the scaled reserve', () => {
    const strategy = new RuntimeCompactionStrategy(() => ({
      ...modelContext(131_072),
      reservedContextSize: 90_000,
    }));

    expect(strategy.shouldCompact(41_072)).toBe(true);
  });
});

function modelContext(maxContextTokens: number): ProfileModelContext {
  return {
    modelAlias: 'model',
    modelCapabilities: {
      image_in: false,
      video_in: false,
      audio_in: false,
      thinking: false,
      tool_use: true,
      max_context_tokens: maxContextTokens,
    },
    maxOutputSize: undefined,
    alwaysThinking: undefined,
    thinkingLevel: 'off',
    reservedContextSize: undefined,
    compactionTriggerRatio: undefined,
    compactionRetentionRatio: undefined,
  };
}

function testCompactionStrategy(maxSize: number = 1_000): DefaultCompactionStrategy {
  return new DefaultCompactionStrategy(() => maxSize, {
    triggerRatio: 0.85,
    blockRatio: 0.85,
    reservedContextSize: 0,
    maxCompactionPerTurn: 3,
    maxOverflowCompactionAttempts: 3,
    maxRecentMessages: 10,
    maxRecentUserMessages: Infinity,
    maxRecentSizeRatio: 0.2,
    minOverflowReductionRatio: 0.05,
  });
}

function overflowOnlyCompactionStrategy(maxSize: number = 14): DefaultCompactionStrategy {
  return new DefaultCompactionStrategy(() => maxSize, {
    triggerRatio: Infinity,
    blockRatio: Infinity,
    reservedContextSize: 0,
    maxCompactionPerTurn: 3,
    maxOverflowCompactionAttempts: 3,
    maxRecentMessages: 3,
    maxRecentUserMessages: Infinity,
    maxRecentSizeRatio: 0.2,
    minOverflowReductionRatio: 0.05,
  });
}

function textMessage(role: 'user' | 'assistant', text: string): Message {
  return {
    role,
    content: [{ type: 'text', text }],
    toolCalls: [],
  };
}
