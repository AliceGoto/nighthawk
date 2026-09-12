import { describe, expect, it, vi } from 'vitest';

import {
  applyOpenPlatformConfig,
  capabilitiesForModel,
  fetchOpenPlatformModels,
  filterModelsByPrefix,
  getOpenPlatformById,
  isOpenPlatformId,
  OPEN_PLATFORMS,
  OpenPlatformApiError,
  removeOpenPlatformConfig,
  type ManagedNighthawkConfigShape,
} from '../src/open-platform';

function makeModelsResponse(): Response {
  return new Response(
    JSON.stringify({
      data: [
        {
          id: 'kimi-k2-0712-preview',
          context_length: 256000,
          supports_reasoning: true,
          supports_image_in: true,
          supports_video_in: true,
          display_name: 'K2 0712 Preview',
        },
        {
          id: 'kimi-k2-lite',
          context_length: 128000,
          supports_reasoning: false,
          supports_image_in: false,
          supports_video_in: false,
          supports_tool_use: false,
        },
        {
          id: 'non-nighthawk-model',
          context_length: 1000,
          supports_reasoning: false,
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('OPEN_PLATFORMS', () => {
  it('contains moonshot.cn and moonshot.ai', () => {
    expect(getOpenPlatformById('nighthawk-cn')).toMatchObject({
      name: 'OpenAI-compatible API · CN',
      baseUrl: 'https://api.nighthawk.com/v1',
      consoleUrl: 'https://github.com/AliceGoto/nighthawk',
      allowedPrefixes: ['nighthawk-'],
    });
    expect(getOpenPlatformById('nighthawk-ai')).toMatchObject({
      name: 'OpenAI-compatible API · Global',
      baseUrl: 'https://api.nighthawk.com/v1',
      consoleUrl: 'https://github.com/AliceGoto/nighthawk',
      allowedPrefixes: ['nighthawk-'],
    });
    expect(getOpenPlatformById('unknown')).toBeUndefined();
  });

  it('isOpenPlatformId works', () => {
    expect(isOpenPlatformId('nighthawk-cn')).toBe(true);
    expect(isOpenPlatformId('nighthawk-ai')).toBe(true);
    expect(isOpenPlatformId('nighthawk')).toBe(false);
  });
});

describe('fetchOpenPlatformModels', () => {
  it('lists and parses models from the platform endpoint', async () => {
    const fetchMock = vi.fn(async () => makeModelsResponse());
    const platform = getOpenPlatformById('nighthawk-cn')!;

    const models = await fetchOpenPlatformModels(platform, 'sk-test', fetchMock as unknown as typeof fetch);

    expect(models).toHaveLength(3);
    expect(models[0]).toMatchObject({
      id: 'kimi-k2-0712-preview',
      contextLength: 256000,
      supportsReasoning: true,
      supportsImageIn: true,
      supportsVideoIn: true,
      displayName: 'K2 0712 Preview',
    });
    expect(models[1]?.supportsToolUse).toBe(false);
    expect(models[2]?.id).toBe('non-nighthawk-model');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.nighthawk.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('surfaces API error messages and status on HTTP error', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'invalid API key' } }), { status: 401 }),
    );
    const platform = getOpenPlatformById('nighthawk-cn')!;

    const error = await fetchOpenPlatformModels(
      platform,
      'sk-bad',
      fetchMock as unknown as typeof fetch,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(OpenPlatformApiError);
    expect((error as OpenPlatformApiError).status).toBe(401);
    expect((error as Error).message).toBe('invalid API key');
  });

  it('throws on unexpected response shape', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const platform = getOpenPlatformById('nighthawk-cn')!;

    await expect(
      fetchOpenPlatformModels(platform, 'sk-test', fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/Unexpected models response/);
  });

  it('falls back to the built-in table then a default context length for OpenAI-standard models', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            object: 'list',
            data: [
              { id: 'deepseek-v4-flash', object: 'model', owned_by: 'deepseek' },
              { id: 'deepseek-chat', object: 'model', owned_by: 'deepseek', context_length: 64000 },
              { id: 'unknown-model-xyz', object: 'model', owned_by: 'deepseek' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const platform = { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' };

    const models = await fetchOpenPlatformModels(platform, 'sk-test', fetchMock as unknown as typeof fetch);

    expect(models).toHaveLength(3);
    // DeepSeek V4 is 1M in the built-in table — no more 128k default.
    expect(models[0]).toMatchObject({ id: 'deepseek-v4-flash', contextLength: 1_048_576 });
    expect(models[1]).toMatchObject({ id: 'deepseek-chat', contextLength: 64000 });
    // Unknown models keep the 128k default.
    expect(models[2]).toMatchObject({ id: 'unknown-model-xyz', contextLength: 131072 });
  });
});

describe('filterModelsByPrefix', () => {
  it('filters by allowedPrefixes when present', () => {
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      { id: 'nighthawk-k2-0712-preview', contextLength: 256000, supportsReasoning: true, supportsImageIn: true, supportsVideoIn: true },
      { id: 'gpt-4', contextLength: 1000, supportsReasoning: false, supportsImageIn: false, supportsVideoIn: false },
    ];

    const filtered = filterModelsByPrefix(models as unknown as import('../src/managed-nighthawk').ManagedNighthawkModelInfo[], platform);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('nighthawk-k2-0712-preview');
  });

  it('returns all models when allowedPrefixes is absent', () => {
    const platform: import('../src/open-platform').OpenPlatformDefinition = {
      id: 'custom',
      name: 'Custom',
      baseUrl: 'https://example.com/v1',
    };
    const models = [
      { id: 'model-a', contextLength: 1000, supportsReasoning: false, supportsImageIn: false, supportsVideoIn: false },
      { id: 'model-b', contextLength: 2000, supportsReasoning: false, supportsImageIn: false, supportsVideoIn: false },
    ];

    const filtered = filterModelsByPrefix(models as unknown as import('../src/managed-nighthawk').ManagedNighthawkModelInfo[], platform);
    expect(filtered).toHaveLength(2);
  });
});

describe('fetchOpenPlatformModels supports_thinking_type', () => {
  it('parses supports_thinking_type from the models endpoint', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'kimi-k2-deep',
                context_length: 256000,
                supports_reasoning: true,
                supports_thinking_type: 'only',
              },
              {
                id: 'kimi-k2-lite',
                context_length: 128000,
                supports_reasoning: false,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const platform = getOpenPlatformById('nighthawk-cn')!;

    const models = await fetchOpenPlatformModels(platform, 'sk-test', fetchMock as unknown as typeof fetch);

    expect(models[0]?.supportsThinkingType).toBe('only');
    expect(models[1]?.supportsThinkingType).toBeUndefined();
  });
});

describe('capabilitiesForModel', () => {
  it("locks thinking on for 'only' models", () => {
    const model = {
      id: 'deep',
      contextLength: 1000,
      supportsReasoning: true,
      supportsImageIn: false,
      supportsVideoIn: false,
      supportsToolUse: false,
      supportsThinkingType: 'only' as const,
    };
    expect(capabilitiesForModel(model)).toEqual(['thinking', 'always_thinking']);
  });

  it("lets 'no' override the legacy supports_reasoning boolean", () => {
    const model = {
      id: 'plain',
      contextLength: 1000,
      supportsReasoning: true,
      supportsImageIn: false,
      supportsVideoIn: false,
      supportsToolUse: false,
      supportsThinkingType: 'no' as const,
    };
    expect(capabilitiesForModel(model)).toBeUndefined();
  });

  it("emits a plain toggleable thinking capability for 'both'", () => {
    const model = {
      id: 'toggle',
      contextLength: 1000,
      supportsReasoning: false,
      supportsImageIn: false,
      supportsVideoIn: false,
      supportsToolUse: false,
      supportsThinkingType: 'both' as const,
    };
    expect(capabilitiesForModel(model)).toEqual(['thinking']);
  });

  it('returns undefined for a model with no capabilities', () => {
    const model = {
      id: 'plain',
      contextLength: 1000,
      supportsReasoning: false,
      supportsImageIn: false,
      supportsVideoIn: false,
      supportsToolUse: false,
    };
    expect(capabilitiesForModel(model)).toBeUndefined();
  });

  it('returns all caps for a full-featured model', () => {
    const model = {
      id: 'full',
      contextLength: 1000,
      supportsReasoning: true,
      supportsImageIn: true,
      supportsVideoIn: true,
      supportsToolUse: true,
    };
    expect(capabilitiesForModel(model)).toEqual(['thinking', 'image_in', 'video_in', 'tool_use']);
  });
});

describe('applyOpenPlatformConfig', () => {
  it('writes provider, models, and defaults', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {},
    };
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      { id: 'kimi-k2-0712-preview', contextLength: 256000, supportsReasoning: true, supportsImageIn: true, supportsVideoIn: true, displayName: 'K2 Coding' },
      { id: 'kimi-k2-lite', contextLength: 128000, supportsReasoning: false, supportsImageIn: false, supportsVideoIn: false },
    ];

    const result = applyOpenPlatformConfig(config, {
      platform,
      models,
      selectedModel: models[0]!,
      thinking: true,
      apiKey: 'sk-test',
    });

    expect(result).toEqual({
      defaultModel: 'nighthawk-cn/kimi-k2-0712-preview',
      defaultThinking: true,
    });

    expect(config.providers['nighthawk-cn']).toMatchObject({
      type: 'nighthawk',
      baseUrl: 'https://api.nighthawk.com/v1',
      apiKey: 'sk-test',
    });
    expect(config.models?.['nighthawk-cn/kimi-k2-0712-preview']).toMatchObject({
      provider: 'nighthawk-cn',
      model: 'kimi-k2-0712-preview',
      maxContextSize: 256000,
      capabilities: ['thinking', 'image_in', 'video_in', 'tool_use'],
      displayName: 'K2 Coding',
    });
    expect(config.defaultModel).toBe('nighthawk-cn/kimi-k2-0712-preview');
    expect(config.thinking?.enabled).toBe(true);
    expect(config.services).toBeUndefined();
  });

  it('clears stale models for the same provider', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        'nighthawk-cn': { type: 'nighthawk', baseUrl: 'https://api.nighthawk.com/v1', apiKey: 'sk-old' },
      },
      models: {
        'nighthawk-cn/stale': { provider: 'nighthawk-cn', model: 'stale', maxContextSize: 1000 },
        'other/model': { provider: 'other', model: 'other-model', maxContextSize: 1000 },
      },
    };
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      { id: 'kimi-k2-0712-preview', contextLength: 256000, supportsReasoning: true, supportsImageIn: true, supportsVideoIn: true },
    ];

    applyOpenPlatformConfig(config, {
      platform,
      models,
      selectedModel: models[0]!,
      thinking: false,
      apiKey: 'sk-new',
    });

    expect(config.models?.['nighthawk-cn/stale']).toBeUndefined();
    expect(config.models?.['other/model']).toBeDefined();
  });

  it('preserves hand-edited fields that upstream does not declare', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        'nighthawk-cn': { type: 'nighthawk', baseUrl: 'https://api.nighthawk.com/v1', apiKey: 'sk-old' },
      },
      models: {
        'nighthawk-cn/kimi-k2-0712-preview': {
          provider: 'nighthawk-cn',
          model: 'kimi-k2-0712-preview',
          maxContextSize: 256000,
          maxOutputSize: 8192,
          supportEfforts: ['low', 'high'],
        } as Record<string, unknown>,
      },
    };
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      {
        id: 'kimi-k2-0712-preview',
        contextLength: 256000,
        supportsReasoning: true,
        supportsImageIn: true,
        supportsVideoIn: true,
      },
    ];

    applyOpenPlatformConfig(config, {
      platform,
      models,
      selectedModel: models[0]!,
      thinking: false,
      apiKey: 'sk-new',
    });

    const alias = config.models?.['nighthawk-cn/kimi-k2-0712-preview'];
    expect(alias?.['maxOutputSize']).toBe(8192);
    expect(alias?.['supportEfforts']).toBeUndefined();
  });

  it('preserves open-platform overrides during refresh', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        'nighthawk-cn': { type: 'nighthawk', baseUrl: 'https://api.nighthawk.com/v1', apiKey: 'sk-old' },
      },
      models: {
        'nighthawk-cn/kimi-k2-0712-preview': {
          provider: 'nighthawk-cn',
          model: 'kimi-k2-0712-preview',
          maxContextSize: 256000,
          overrides: { supportEfforts: ['low'] },
        } as Record<string, unknown>,
      },
    };
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      {
        id: 'kimi-k2-0712-preview',
        contextLength: 256000,
        supportsReasoning: true,
        supportsImageIn: false,
        supportsVideoIn: false,
        supportEfforts: ['low', 'high'],
      },
    ];

    applyOpenPlatformConfig(config, {
      platform,
      models,
      selectedModel: models[0]!,
      thinking: false,
      apiKey: 'sk-new',
    });

    const alias = config.models?.['nighthawk-cn/kimi-k2-0712-preview'];
    expect(alias?.['supportEfforts']).toEqual(['low', 'high']);
    expect(alias?.['overrides']).toEqual({ supportEfforts: ['low'] });
  });

  it('writes a concrete effort into config.thinking when provided', () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      {
        id: 'kimi-k2-0712-preview',
        contextLength: 256000,
        supportsReasoning: true,
        supportsImageIn: false,
        supportsVideoIn: false,
      },
    ];

    applyOpenPlatformConfig(config, {
      platform,
      models,
      selectedModel: models[0]!,
      thinking: true,
      effort: 'high',
      apiKey: 'sk-test',
    });

    expect(config.thinking).toEqual({ enabled: true, effort: 'high' });
  });

  it('omits effort for a boolean on (no concrete effort)', () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };
    const platform = getOpenPlatformById('nighthawk-cn')!;
    const models = [
      {
        id: 'kimi-k2-0712-preview',
        contextLength: 256000,
        supportsReasoning: true,
        supportsImageIn: false,
        supportsVideoIn: false,
      },
    ];

    applyOpenPlatformConfig(config, {
      platform,
      models,
      selectedModel: models[0]!,
      thinking: true,
      apiKey: 'sk-test',
    });

    expect(config.thinking).toEqual({ enabled: true });
    expect(config.thinking?.effort).toBeUndefined();
  });
});

describe('removeOpenPlatformConfig', () => {
  it('removes provider, its models, and defaultModel when matched', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        'nighthawk-cn': { type: 'nighthawk', baseUrl: 'https://api.nighthawk.com/v1', apiKey: 'sk-test' },
        'other': { type: 'nighthawk', baseUrl: 'https://other.test/v1', apiKey: 'sk-other' },
      },
      models: {
        'nighthawk-cn/kimi-k2': { provider: 'nighthawk-cn', model: 'kimi-k2', maxContextSize: 256000 },
        'other/model': { provider: 'other', model: 'other-model', maxContextSize: 1000 },
      },
      defaultModel: 'nighthawk-cn/kimi-k2',
    };

    removeOpenPlatformConfig(config, 'nighthawk-cn');

    expect(config.providers['nighthawk-cn']).toBeUndefined();
    expect(config.providers['other']).toBeDefined();
    expect(config.models?.['nighthawk-cn/kimi-k2']).toBeUndefined();
    expect(config.models?.['other/model']).toBeDefined();
    expect(config.defaultModel).toBeUndefined();
  });

  it('leaves defaultModel intact when it belongs to another provider', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        'nighthawk-cn': { type: 'nighthawk', baseUrl: 'https://api.nighthawk.com/v1', apiKey: 'sk-test' },
      },
      models: {
        'nighthawk-cn/kimi-k2': { provider: 'nighthawk-cn', model: 'kimi-k2', maxContextSize: 256000 },
      },
      defaultModel: 'other/model',
    };

    removeOpenPlatformConfig(config, 'nighthawk-cn');

    expect(config.defaultModel).toBe('other/model');
  });
});
