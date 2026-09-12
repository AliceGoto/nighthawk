import { APIError as OpenAIAPIError } from 'openai';
import { describe, expect, it, vi } from 'vitest';

import {
  APIProviderQuotaExhaustedError,
  isRetryableGenerateError,
} from '#/kosong/contract/errors';
import type { Message } from '#/kosong/contract/message';
import type { Tool } from '#/kosong/contract/tool';
import type { ProtocolTrait, TraitContext } from '#/kosong/protocol/protocolTrait';
import { NighthawkFiles } from '#/kosong/provider/providers/nighthawk/nighthawk-files';
import {
  convertNighthawkTool,
  nighthawkAnthropicTrait,
  nighthawkOpenAITrait,
} from '#/kosong/provider/providers/nighthawk/nighthawk.contrib';

const context: TraitContext = {
  config: { protocol: 'openai', providerType: 'nighthawk', modelName: 'kimi-k2' },
  providerId: 'nighthawk',
};

function call<T>(hook: ((...args: never[]) => T) | undefined, ...args: unknown[]): T | undefined {
  return hook === undefined ? undefined : hook(...(args as never[]));
}

describe('nighthawkOpenAITrait.convertTool', () => {
  it('converts $-prefixed tools to builtin_function declarations', () => {
    const tool: Tool = { name: '$web_search', description: 'search', parameters: {} };
    expect(call(nighthawkOpenAITrait.convertTool, tool, context)).toEqual({
      type: 'builtin_function',
      function: { name: '$web_search' },
    });
  });

  it('normalizes the schema dialect of regular tools', () => {
    const tool: Tool = {
      name: 'read_file',
      description: 'read',
      parameters: {
        $defs: { path: { type: 'string' } },
        properties: { path: { $ref: '#/$defs/path' } },
      },
    };
    expect(convertNighthawkTool(tool)).toEqual({
      type: 'function',
      function: {
        name: 'read_file',
        description: 'read',
        parameters: { properties: { path: { type: 'string' } } },
      },
    });
  });
});

describe('nighthawkOpenAITrait.convertMessage', () => {
  const assistantToolMessage: Message = {
    role: 'assistant',
    content: [{ type: 'text', text: '   ' }],
    toolCalls: [
      { type: 'function', id: 'call_1', name: 'read_file', arguments: '{}', extras: { a: 1 } },
      { type: 'function', id: 'call_2', name: 'write_file', arguments: null },
    ],
  };

  it('deletes effectively-empty content on assistant tool messages', () => {
    const converted: Record<string, unknown> = {
      role: 'assistant',
      content: '   ',
      tool_calls: [
        { type: 'function', id: 'call_1', function: { name: 'read_file', arguments: '{}' } },
        { type: 'function', id: 'call_2', function: { name: 'write_file', arguments: null } },
      ],
    };
    const out = call(nighthawkOpenAITrait.convertMessage, assistantToolMessage, converted, context);
    expect(out).not.toHaveProperty('content');
  });

  it('round-trips tool_calls extras by index', () => {
    const converted: Record<string, unknown> = {
      role: 'assistant',
      tool_calls: [
        { type: 'function', id: 'call_1', function: { name: 'read_file', arguments: '{}' } },
        { type: 'function', id: 'call_2', function: { name: 'write_file', arguments: null } },
      ],
    };
    const out = call(
      nighthawkOpenAITrait.convertMessage,
      assistantToolMessage,
      converted,
      context,
    ) as Record<string, unknown>;
    const toolCalls = out['tool_calls'] as Record<string, unknown>[];
    expect(toolCalls[0]?.['extras']).toEqual({ a: 1 });
    expect(toolCalls[1]).not.toHaveProperty('extras');
  });

  it('keeps non-empty content untouched', () => {
    const message: Message = {
      role: 'assistant',
      content: [{ type: 'text', text: 'working on it' }],
      toolCalls: [{ type: 'function', id: 'c', name: 't', arguments: null }],
    };
    const converted: Record<string, unknown> = { role: 'assistant', content: 'working on it' };
    const out = call(nighthawkOpenAITrait.convertMessage, message, converted, context);
    expect(out).toHaveProperty('content', 'working on it');
  });

  it('embeds message-level tools', () => {
    const message: Message = {
      role: 'assistant',
      content: [],
      toolCalls: [],
      tools: [{ name: '$web_search', description: '', parameters: {} }],
    };
    const converted: Record<string, unknown> = { role: 'assistant' };
    const out = call(nighthawkOpenAITrait.convertMessage, message, converted, context);
    expect(out?.['tools']).toEqual([
      { type: 'builtin_function', function: { name: '$web_search' } },
    ]);
  });
});

describe('nighthawkOpenAITrait reasoning hooks', () => {
  it('does not pin a reasoning field — the base detects the endpoint dialect', () => {
    expect(nighthawkOpenAITrait.reasoningKey).toBeUndefined();
  });

  it('force-replays reasoning only in keep:all sessions with thinking enabled', () => {
    const keepAll = {
      extra_body: { thinking: { type: 'enabled', keep: 'all' } },
    };
    expect(call(nighthawkOpenAITrait.preserveThinking, keepAll, context)).toBe(true);

    const keepAllDisabled = {
      extra_body: { thinking: { type: 'disabled', keep: 'all' } },
    };
    expect(call(nighthawkOpenAITrait.preserveThinking, keepAllDisabled, context)).toBeUndefined();

    const keepSome = {
      extra_body: { thinking: { type: 'enabled', keep: 'some' } },
    };
    expect(call(nighthawkOpenAITrait.preserveThinking, keepSome, context)).toBeUndefined();
    expect(call(nighthawkOpenAITrait.preserveThinking, {}, context)).toBeUndefined();
  });
});

describe('nighthawkOpenAITrait.extractUsage', () => {
  it('finds usage at the top level', () => {
    const usage = { prompt_tokens: 10, completion_tokens: 2 };
    expect(call(nighthawkOpenAITrait.extractUsage, { usage }, context)).toBe(usage);
  });

  it('finds usage inside choices[0].usage', () => {
    const usage = { prompt_tokens: 5, completion_tokens: 1 };
    expect(call(nighthawkOpenAITrait.extractUsage, { choices: [{ usage }] }, context)).toBe(usage);
  });

  it('defers to the base default when the chunk carries no usage', () => {
    expect(call(nighthawkOpenAITrait.extractUsage, { choices: [] }, context)).toBeUndefined();
    expect(call(nighthawkOpenAITrait.extractUsage, { choices: [{}] }, context)).toBeUndefined();
  });
});

describe('nighthawkOpenAITrait request params', () => {
  it('declares the NIGHTHAWK_API_KEY / NIGHTHAWK_BASE_URL fallback chain and default base URL', () => {
    expect(call(nighthawkOpenAITrait.endpoint, context)).toEqual({
      apiKeyEnv: 'NIGHTHAWK_API_KEY',
      baseUrlEnv: 'NIGHTHAWK_BASE_URL',
      defaultBaseUrl: 'https://api.nighthawk.com/v1',
    });
  });

  it('encodes the cache key as prompt_cache_key', () => {
    expect(call(nighthawkOpenAITrait.cacheKey, 'session-1', context)).toEqual({
      prompt_cache_key: 'session-1',
    });
  });

  it('encodes thinking into extra_body.thinking, carrying keep', () => {
    expect(call(nighthawkOpenAITrait.withThinking, 'high', {}, {}, context)).toEqual({
      extra_body: { thinking: { type: 'enabled', effort: 'high' } },
    });
    expect(call(nighthawkOpenAITrait.withThinking, 'on', {}, {}, context)).toEqual({
      extra_body: { thinking: { type: 'enabled' } },
    });
    expect(call(nighthawkOpenAITrait.withThinking, 'off', {}, {}, context)).toEqual({
      extra_body: { thinking: { type: 'disabled' } },
    });
    expect(call(nighthawkOpenAITrait.withThinking, 'high', { keep: 'all' }, {}, context)).toEqual({
      extra_body: { thinking: { type: 'enabled', effort: 'high', keep: 'all' } },
    });
  });

  it('clamps max completion tokens to the 128k ceiling in withMaxCompletionTokens', () => {
    expect(call(nighthawkOpenAITrait.withMaxCompletionTokens, 200_000, context)).toEqual({
      max_completion_tokens: 131072,
    });
    expect(call(nighthawkOpenAITrait.withMaxCompletionTokens, 32_000, context)).toEqual({
      max_completion_tokens: 32_000,
    });
  });

  it('buildParams backfills max_completion_tokens, drops max_tokens, expands extra_body last', () => {
    const out = call(
      nighthawkOpenAITrait.buildParams,
      {
        model: 'nighthawk-k2',
        max_tokens: 4096,
        extra_body: { thinking: { type: 'enabled', effort: 'high' }, custom_flag: true },
      },
      context,
    );
    expect(out).toEqual({
      model: 'nighthawk-k2',
      max_completion_tokens: 4096,
      reasoning_effort: 'high',
      custom_flag: true,
    });
  });

  it('buildParams keeps an explicit max_completion_tokens and lets extra_body win', () => {
    const out = call(
      nighthawkOpenAITrait.buildParams,
      {
        max_tokens: 1024,
        max_completion_tokens: 2048,
        temperature: 0.5,
        extra_body: { temperature: 0.9 },
      },
      context,
    );
    expect(out).toEqual({ max_completion_tokens: 2048, temperature: 0.9 });
  });
});

describe('nighthawkAnthropicTrait (the (nighthawk, anthropic) registration)', () => {
  const seeded = { betaFeatures: ['interleaved-thinking-2025-05-14', 'other-beta'] };

  it('encodes thinking:{type:enabled} + output_config.effort and strips the interleaved beta', () => {
    const out = call(nighthawkAnthropicTrait.withThinking, 'high', {}, seeded, context);
    expect(out).toEqual({
      thinking: { type: 'enabled' },
      output_config: { effort: 'high' },
      betaFeatures: ['other-beta'],
    });
  });

  it('omits output_config for on', () => {
    expect(call(nighthawkAnthropicTrait.withThinking, 'on', {}, seeded, context)).toEqual({
      thinking: { type: 'enabled' },
      output_config: undefined,
      betaFeatures: ['other-beta'],
    });
  });

  it('encodes off as disabled', () => {
    expect(call(nighthawkAnthropicTrait.withThinking, 'off', {}, seeded, context)).toEqual({
      thinking: { type: 'disabled' },
      output_config: undefined,
      betaFeatures: ['other-beta'],
    });
  });
});

describe('trait objects are plain declarations', () => {
  it('exposes exactly the hooks appendix A assigns to them, plus metadata markers', () => {
    const hookNames = (trait: ProtocolTrait): string[] => Object.keys(trait);
    expect(hookNames(nighthawkOpenAITrait).toSorted()).toEqual([
      'buildParams',
      'cacheKey',
      'convertError',
      'convertMessage',
      'convertTool',
      'endpoint',
      'extractUsage',
      'preserveThinking',
      'strictThinkingValidation',
      'uploadVideo',
      'withMaxCompletionTokens',
      'withThinking',
    ]);
    expect(hookNames(nighthawkAnthropicTrait).toSorted()).toEqual(['convertError', 'withThinking']);
  });

  it('marks only the native-transport thinking trait as strict-validation (v1 parity)', () => {
    expect(nighthawkOpenAITrait.strictThinkingValidation).toBe(true);
    expect(nighthawkAnthropicTrait.strictThinkingValidation).toBeUndefined();
  });
});

describe('NighthawkFiles upload error conversion', () => {
  it('fails fast on a NightHawk quota-exhausted 429 from the files API', async () => {
    const quotaError = new OpenAIAPIError(
      429,
      {
        message: 'Your account is suspended due to insufficient balance, please recharge',
        type: 'exceeded_current_quota_error',
      },
      '429 quota exhausted',
      new Headers(),
    );
    const files = new NighthawkFiles({
      baseUrl: 'https://api.example/v1',
      clientFactory: () => ({ files: { create: vi.fn().mockRejectedValue(quotaError) } }) as never,
    });

    const caught = await files
      .uploadVideo(
        { data: Buffer.from([1, 2, 3]), mimeType: 'video/mp4' },
        { auth: { apiKey: 'request-token' } },
      )
      .then(
        () => undefined,
        (error: unknown) => error,
      );
    expect(caught).toBeInstanceOf(APIProviderQuotaExhaustedError);
    expect(isRetryableGenerateError(caught)).toBe(false);
  });
});
