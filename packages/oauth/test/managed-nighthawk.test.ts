import { describe, expect, it, vi } from 'vitest';

import {
  applyManagedApiKeyProviderModels,
  applyManagedNighthawkLogoutConfig,
  applyManagedNighthawkConfig,
  clearManagedNighthawkConfig,
  fetchManagedNighthawkModels,
  NIGHTHAWK_OAUTH_KEY,
  NIGHTHAWK_PROVIDER_NAME,
  ManagedNighthawkModelsAuthError,
  provisionManagedNighthawkConfig,
  resolveNighthawkLoginAuth,
  resolveNighthawkOAuthKey,
  resolveNighthawkOAuthRef,
  resolveNighthawkRuntimeAuth,
  type ManagedNighthawkModelInfo,
  type ManagedNighthawkConfigShape,
} from '../src/managed-nighthawk';
import { OAuthUnauthorizedError } from '../src/errors';

function makeModelsResponse(): Response {
  return new Response(
    JSON.stringify({
      data: [
        {
          id: 'nighthawk',
          context_length: 262144,
          supports_reasoning: true,
          supports_image_in: true,
          supports_video_in: true,
          display_name: 'NightHawk for Coding',
        },
        {
          id: 'kimi-k2.5',
          context_length: 250000,
          supports_reasoning: false,
          supports_image_in: false,
          supports_video_in: false,
          supports_tool_use: false,
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('provisionManagedNighthawkConfig', () => {
  it('keeps the legacy credential key for the default production environment', () => {
    expect(
      resolveNighthawkOAuthKey({
        oauthHost: 'https://auth.nighthawk.com/',
        baseUrl: 'https://api.nighthawk.com/v1/',
      }),
    ).toBe(NIGHTHAWK_OAUTH_KEY);
  });

  it('scopes credential keys for non-default OAuth hosts and API base URLs', () => {
    const devKey = resolveNighthawkOAuthKey({
      oauthHost: 'https://auth.dev.example.test',
      baseUrl: 'https://api.dev.example.test/coding/v1',
    });

    expect(devKey).not.toBe(NIGHTHAWK_OAUTH_KEY);
    expect(devKey).toMatch(/^oauth\/nighthawk-env-[a-f0-9]{16}$/);
    expect(
      resolveNighthawkOAuthKey({
        oauthHost: 'https://auth.dev.example.test/',
        baseUrl: 'https://api.dev.example.test/coding/v1/',
      }),
    ).toBe(devKey);
  });

  it('derives a full OAuth ref whose key and persisted host stay in sync', () => {
    // Default environment collapses to the legacy ref (no persisted host), so
    // existing production credentials keep resolving to `nighthawk.json`.
    expect(
      resolveNighthawkOAuthRef({
        oauthHost: 'https://auth.nighthawk.com/',
        baseUrl: 'https://api.nighthawk.com/v1/',
      }),
    ).toEqual({ storage: 'file', key: NIGHTHAWK_OAUTH_KEY, oauthHost: undefined });

    const defaultAuthCustomApiRef = resolveNighthawkOAuthRef({
      baseUrl: 'https://api.example.test/coding/v1',
    });
    expect(defaultAuthCustomApiRef).toEqual({
      storage: 'file',
      key: resolveNighthawkOAuthKey({
        oauthHost: 'https://auth.nighthawk.com',
        baseUrl: 'https://api.example.test/coding/v1',
      }),
      oauthHost: 'https://auth.nighthawk.com',
    });

    // A non-default environment yields a scoped key AND the normalized host,
    // both derived from the same input — login and runtime cannot drift apart.
    const devRef = resolveNighthawkOAuthRef({
      oauthHost: 'https://auth.dev.example.test/',
      baseUrl: 'https://api.dev.example.test/coding/v1',
    });
    expect(devRef).toEqual({
      storage: 'file',
      key: resolveNighthawkOAuthKey({
        oauthHost: 'https://auth.dev.example.test',
        baseUrl: 'https://api.dev.example.test/coding/v1',
      }),
      oauthHost: 'https://auth.dev.example.test',
    });
  });

  it('resolves runtime auth from environment overrides over persisted config', () => {
    const configuredBaseUrl = 'https://api.configured.example.test/coding/v1';
    const envBaseUrl = 'https://api.env.example.test/coding/v1/';
    const envOauthHost = 'https://auth.env.example.test/';
    const configuredOAuthRef = resolveNighthawkOAuthRef({
      baseUrl: configuredBaseUrl,
    });

    const auth = resolveNighthawkRuntimeAuth({
      configuredBaseUrl,
      configuredOAuthRef,
      env: {
        NIGHTHAWK_BASE_URL: envBaseUrl,
        NIGHTHAWK_OAUTH_HOST: envOauthHost,
      },
    });

    expect(auth.baseUrl).toBe('https://api.env.example.test/coding/v1');
    expect(auth.oauthRef).toEqual({
      storage: 'file',
      key: resolveNighthawkOAuthKey({
        oauthHost: 'https://auth.env.example.test',
        baseUrl: 'https://api.env.example.test/coding/v1',
      }),
      oauthHost: 'https://auth.env.example.test',
    });
  });

  it('preserves a matching configured runtime OAuth ref when env is not overridden', () => {
    const baseUrl = 'https://api.dev.example.test/coding/v1';
    const configuredOAuthRef = {
      storage: 'keyring' as const,
      key: resolveNighthawkOAuthKey({
        oauthHost: 'https://auth.dev.example.test',
        baseUrl,
      }),
      oauthHost: 'https://auth.dev.example.test',
    };

    expect(
      resolveNighthawkRuntimeAuth({
        configuredBaseUrl: baseUrl,
        configuredOAuthRef,
        env: {},
      }),
    ).toEqual({
      baseUrl,
      oauthRef: configuredOAuthRef,
    });
  });

  it('resolves login auth without reusing persisted refs under explicit or env overrides', () => {
    const configuredBaseUrl = 'https://api.configured.example.test/coding/v1';
    const configuredOAuthRef = resolveNighthawkOAuthRef({ baseUrl: configuredBaseUrl });

    expect(
      resolveNighthawkLoginAuth({
        configuredBaseUrl,
        configuredOAuthRef,
        requestedBaseUrl: 'https://api.requested.example.test/coding/v1/',
        env: {},
      }),
    ).toEqual({
      baseUrl: 'https://api.requested.example.test/coding/v1',
      oauthHost: undefined,
    });

    expect(
      resolveNighthawkLoginAuth({
        configuredBaseUrl,
        configuredOAuthRef,
        env: {},
      }),
    ).toEqual({
      baseUrl: configuredBaseUrl,
      oauthHost: undefined,
      oauthRef: configuredOAuthRef,
    });
  });

  it('writes the managed provider, models, services, and default model through an adapter', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
          baseUrl: 'https://example.test/v1',
        },
      },
      models: {
        'nighthawk/stale': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'stale',
        },
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
        },
      },
    };
    const write = vi.fn();
    const fetchMock = vi.fn(async () => makeModelsResponse());

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: fetchMock as unknown as typeof fetch,
      adapter: {
        configPath: '/tmp/config.toml',
        read: () => config,
        write,
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result).toMatchObject({
      providerName: NIGHTHAWK_PROVIDER_NAME,
      defaultModel: 'nighthawk/nighthawk',
      defaultThinking: true,
      configPath: '/tmp/config.toml',
    });
    expect(result.models[0]?.supportsToolUse).toBe(true);
    expect(result.models[1]?.supportsToolUse).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.nighthawk.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer oauth-access-token',
          Accept: 'application/json',
        }),
      }),
    );
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit?][];
    const init = calls[0]?.[1] ?? {};
    const headers = new Headers((init.headers ?? {}) as Record<string, string>);
    expect(headers.get('user-agent')).toBeNull();
    expect(headers.get('x-msh-platform')).toBeNull();
    expect(write).toHaveBeenCalledWith(config);

    expect(config.providers['custom']).toMatchObject({
      apiKey: 'sk-existing',
    });
    expect(config.models?.['custom-default']?.provider).toBe('custom');
    expect(config.models?.['nighthawk/stale']).toBeUndefined();
    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toMatchObject({
      type: 'nighthawk',
      baseUrl: 'https://api.nighthawk.com/v1',
      apiKey: '',
      oauth: { storage: 'file', key: 'oauth/nighthawk' },
    });
    expect(config.models?.['nighthawk/nighthawk']).toMatchObject({
      provider: NIGHTHAWK_PROVIDER_NAME,
      model: 'nighthawk',
      maxContextSize: 262144,
      capabilities: ['thinking', 'image_in', 'video_in', 'tool_use'],
      displayName: 'NightHawk for Coding',
    });
    expect(config.models?.['nighthawk/kimi-k2.5']?.capabilities).toBeUndefined();
    expect(config.services?.nighthawkSearch).toMatchObject({
      baseUrl: 'https://api.nighthawk.com/v1/search',
      apiKey: '',
      oauth: { storage: 'file', key: 'oauth/nighthawk' },
    });
    expect(Object.keys(config.services ?? {})).toEqual(['nighthawkSearch', 'nighthawkFetch']);
  });

  it('writes scoped OAuth refs when provisioning against a non-default environment', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {},
    };
    const oauthKey = resolveNighthawkOAuthKey({
      oauthHost: 'https://auth.dev.example.test',
      baseUrl: 'https://api.dev.example.test/coding/v1',
    });

    await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      baseUrl: 'https://api.dev.example.test/coding/v1',
      oauthKey,
      oauthHost: 'https://auth.dev.example.test',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toMatchObject({
      baseUrl: 'https://api.dev.example.test/coding/v1',
      oauth: {
        storage: 'file',
        key: oauthKey,
        oauthHost: 'https://auth.dev.example.test',
      },
    });
    expect(config.services?.nighthawkSearch?.oauth).toEqual({
      storage: 'file',
      key: oauthKey,
      oauthHost: 'https://auth.dev.example.test',
    });
    expect(config.services?.nighthawkFetch?.oauth).toEqual({
      storage: 'file',
      key: oauthKey,
      oauthHost: 'https://auth.dev.example.test',
    });
  });

  it('persists the default OAuth host when only the API base URL is scoped', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {},
    };
    const baseUrl = 'https://api.example.test/coding/v1';
    const oauthKey = resolveNighthawkOAuthKey({ baseUrl });

    await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      baseUrl,
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toMatchObject({
      baseUrl,
      oauth: {
        storage: 'file',
        key: oauthKey,
        oauthHost: 'https://auth.nighthawk.com',
      },
    });
  });

  it('preserves an existing valid default model during refresh', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
          baseUrl: 'https://example.test/v1',
        },
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
        },
      },
      defaultModel: 'custom-default',
      thinking: { enabled: false },
      models: {
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
        },
        'nighthawk/stale': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'stale',
          maxContextSize: 1000,
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('custom-default');
    expect(result.defaultThinking).toBe(false);
    expect(config.defaultModel).toBe('custom-default');
    expect(config.thinking?.enabled).toBe(false);
    expect(config.models?.['nighthawk/stale']).toBeUndefined();
    expect(config.models?.['nighthawk/nighthawk']?.displayName).toBe('NightHawk for Coding');
  });

  it('infers default_thinking from fresh managed model capabilities', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
        },
      },
      defaultModel: 'nighthawk/nighthawk',
      models: {
        'nighthawk/nighthawk': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk',
          maxContextSize: 1000,
          capabilities: [],
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('nighthawk/nighthawk');
    expect(result.defaultThinking).toBe(true);
    expect(config.thinking?.enabled).toBe(true);
  });

  it('preserves explicit default_thinking when preserving a custom default without capabilities', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'custom-default',
      thinking: { enabled: true },
      models: {
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('custom-default');
    expect(result.defaultThinking).toBe(true);
    expect(config.thinking?.enabled).toBe(true);
  });

  it('defaults default_thinking to false when a preserved custom default has no signal', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'custom-default',
      models: {
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('custom-default');
    expect(result.defaultThinking).toBe(false);
    expect(config.thinking?.enabled).toBe(false);
  });

  it('does not infer default_thinking from preserved custom default capabilities', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'custom-default',
      models: {
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
          capabilities: [],
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('custom-default');
    expect(result.defaultThinking).toBe(false);
    expect(config.thinking?.enabled).toBe(false);
  });

  it('keeps default_thinking off even when preserved custom default has thinking capability', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'custom-default',
      models: {
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
          capabilities: ['thinking'],
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('custom-default');
    expect(result.defaultThinking).toBe(false);
    expect(config.thinking?.enabled).toBe(false);
  });

  it('falls back to the first fetched model when the preserved default was removed', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
        },
      },
      defaultModel: 'nighthawk/stale',
      thinking: { enabled: false },
      models: {
        'nighthawk/stale': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'stale',
          maxContextSize: 1000,
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('nighthawk/nighthawk');
    expect(result.defaultThinking).toBe(false);
    expect(config.defaultModel).toBe('nighthawk/nighthawk');
    expect(config.thinking?.enabled).toBe(false);
  });

  it('removes managed provider, models, services, and default model on logout', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
        },
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'nighthawk/nighthawk',
      thinking: { enabled: true },
      models: {
        'nighthawk/nighthawk': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk',
          maxContextSize: 262144,
        },
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
        },
      },
      services: {
        nighthawkSearch: { baseUrl: 'https://api.nighthawk.com/v1/search' },
        nighthawkFetch: { baseUrl: 'https://api.nighthawk.com/v1/fetch' },
        customService: { baseUrl: 'https://service.example.test' },
      },
      raw: {
        default_model: 'nighthawk/nighthawk',
        providers: {
          [NIGHTHAWK_PROVIDER_NAME]: { type: 'nighthawk' },
          custom: { type: 'nighthawk' },
        },
        models: {
          'nighthawk/nighthawk': {
            provider: NIGHTHAWK_PROVIDER_NAME,
            model: 'nighthawk',
          },
          'custom-default': {
            provider: 'custom',
            model: 'custom-model',
          },
        },
        services: {
          nighthawk_search: { base_url: 'https://api.nighthawk.com/v1/search' },
          nighthawk_fetch: { base_url: 'https://api.nighthawk.com/v1/fetch' },
        },
      },
    };

    applyManagedNighthawkLogoutConfig(config);

    expect(config.defaultModel).toBeUndefined();
    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toBeUndefined();
    expect(config.providers['custom']).toBeDefined();
    expect(config.models?.['nighthawk/nighthawk']).toBeUndefined();
    expect(config.models?.['custom-default']).toBeDefined();
    expect(config.services?.nighthawkSearch).toBeUndefined();
    expect(config.services?.nighthawkFetch).toBeUndefined();
    expect(config.services?.['customService']).toEqual({
      baseUrl: 'https://service.example.test',
    });
  });

  it('rejects managed models that do not include a positive context_length', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [{ id: 'nighthawk', supports_reasoning: true }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    await expect(
      fetchManagedNighthawkModels({
        accessToken: 'oauth-access-token',
        fetchImpl,
      }),
    ).rejects.toThrow(/positive context_length/);
  });

  it('surfaces API error messages from model listing failures', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    await expect(
      fetchManagedNighthawkModels({
        accessToken: 'oauth-access-token',
        fetchImpl,
      }),
    ).rejects.toThrow('quota exceeded');
  });

  it('classifies model listing 401 responses as OAuth unauthorized', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { message: 'The API Key appears to be invalid or may have expired.' },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch;

    await expect(
      fetchManagedNighthawkModels({
        accessToken: 'oauth-access-token',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(OAuthUnauthorizedError);
  });

  it('classifies membership-check 402 responses as OAuth unauthorized', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message:
                "We're unable to verify your membership benefits at this time. Please ensure your membership is active.",
            },
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch;

    const promise = fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      baseUrl: 'https://api.dev.example.test/coding/v1',
      fetchImpl,
    });

    await expect(promise).rejects.toThrow(
      "NightHawk models endpoint https://api.dev.example.test/coding/v1 rejected OAuth credentials: We're unable to verify your membership benefits at this time. Please ensure your membership is active.",
    );
    await expect(
      fetchManagedNighthawkModels({
        accessToken: 'oauth-access-token',
        baseUrl: 'https://api.dev.example.test/coding/v1',
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      status: 402,
      baseUrl: 'https://api.dev.example.test/coding/v1',
    });
    await expect(
      fetchManagedNighthawkModels({
        accessToken: 'oauth-access-token',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(OAuthUnauthorizedError);
    await expect(
      fetchManagedNighthawkModels({
        accessToken: 'oauth-access-token',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(ManagedNighthawkModelsAuthError);
  });

  it('clears managed provider, models, default model, and services on logout', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
          oauth: { storage: 'file', key: 'oauth/nighthawk' },
        },
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'nighthawk/nighthawk',
      models: {
        'nighthawk/nighthawk': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk',
          maxContextSize: 262144,
        },
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 128000,
        },
      },
      services: {
        nighthawkSearch: {
          baseUrl: 'https://api.nighthawk.com/v1/search',
          apiKey: '',
          oauth: { storage: 'file', key: 'oauth/nighthawk' },
        },
        nighthawkFetch: {
          baseUrl: 'https://api.nighthawk.com/v1/fetch',
          apiKey: '',
          oauth: { storage: 'file', key: 'oauth/nighthawk' },
        },
        otherService: { baseUrl: 'https://service.example.test' },
      },
    };

    const result = clearManagedNighthawkConfig(config);

    expect(result).toMatchObject({
      providerName: NIGHTHAWK_PROVIDER_NAME,
      removedProvider: true,
      removedModels: ['nighthawk/nighthawk'],
      defaultModelCleared: true,
      removedServices: ['nighthawkSearch', 'nighthawkFetch'],
    });
    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toBeUndefined();
    expect(config.providers['custom']).toMatchObject({ apiKey: 'sk-existing' });
    expect(config.defaultModel).toBeUndefined();
    expect(config.models?.['nighthawk/nighthawk']).toBeUndefined();
    expect(config.models?.['custom-default']).toMatchObject({ provider: 'custom' });
    expect(config.services?.nighthawkSearch).toBeUndefined();
    expect(config.services?.nighthawkFetch).toBeUndefined();
    expect(config.services?.['otherService']).toMatchObject({
      baseUrl: 'https://service.example.test',
    });
  });
});

describe('supports_thinking_type', () => {
  function makeThinkingTypeModelsResponse(): Response {
    return new Response(
      JSON.stringify({
        data: [
          {
            id: 'nighthawk',
            context_length: 262144,
            supports_reasoning: true,
            supports_image_in: true,
            supports_video_in: true,
            supports_thinking_type: 'only',
            display_name: 'NightHawk For Coding',
          },
          {
            // 'no' is the authoritative declaration and overrides the legacy
            // supports_reasoning boolean.
            id: 'nighthawk-plain',
            context_length: 128000,
            supports_reasoning: true,
            supports_thinking_type: 'no',
          },
          {
            id: 'nighthawk-toggle',
            context_length: 128000,
            supports_reasoning: true,
            supports_thinking_type: 'both',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  it('parses supports_thinking_type from the models endpoint', async () => {
    const models = await fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeThinkingTypeModelsResponse()) as unknown as typeof fetch,
    });

    expect(models[0]?.supportsThinkingType).toBe('only');
    expect(models[1]?.supportsThinkingType).toBe('no');
    expect(models[2]?.supportsThinkingType).toBe('both');
  });

  it('leaves supportsThinkingType undefined when the field is absent or invalid', async () => {
    const absent = await fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeModelsResponse()) as unknown as typeof fetch,
    });
    expect(absent[0]?.supportsThinkingType).toBeUndefined();

    const invalid = await fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  id: 'nighthawk',
                  context_length: 262144,
                  supports_reasoning: true,
                  supports_thinking_type: 'maybe',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ) as unknown as typeof fetch,
    });
    expect(invalid[0]?.supportsThinkingType).toBeUndefined();
  });

  it('maps the three states onto capabilities, overriding supports_reasoning', async () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };

    await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeThinkingTypeModelsResponse()) as unknown as typeof fetch,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    // 'only' → thinking locked on.
    expect(config.models?.['nighthawk/nighthawk']?.capabilities).toEqual([
      'thinking',
      'always_thinking',
      'image_in',
      'video_in',
      'tool_use',
    ]);
    // 'no' → no thinking capability despite supports_reasoning=true.
    expect(config.models?.['nighthawk/nighthawk-plain']?.capabilities).toEqual(['tool_use']);
    // 'both' → plain toggleable thinking.
    expect(config.models?.['nighthawk/nighthawk-toggle']?.capabilities).toEqual([
      'thinking',
      'tool_use',
    ]);
  });

  it('forces default thinking on when the selected default model is thinking-only', async () => {
    const config: ManagedNighthawkConfigShape = { providers: {}, thinking: { enabled: false } };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeThinkingTypeModelsResponse()) as unknown as typeof fetch,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('nighthawk/nighthawk');
    expect(result.defaultThinking).toBe(true);
    expect(config.thinking?.enabled).toBe(true);
  });

  it('forces default thinking on when preserving a thinking-only managed default', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
        },
      },
      defaultModel: 'nighthawk/nighthawk',
      thinking: { enabled: false },
      models: {
        'nighthawk/nighthawk': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk',
          maxContextSize: 262144,
          capabilities: ['thinking'],
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeThinkingTypeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('nighthawk/nighthawk');
    expect(result.defaultThinking).toBe(true);
    expect(config.thinking?.enabled).toBe(true);
  });

  it('forces default thinking off when preserving a no-thinking managed default', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
        },
      },
      defaultModel: 'nighthawk/nighthawk-plain',
      thinking: { enabled: true },
      models: {
        'nighthawk/nighthawk-plain': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk-plain',
          maxContextSize: 128000,
          capabilities: ['thinking'],
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeThinkingTypeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('nighthawk/nighthawk-plain');
    expect(result.defaultThinking).toBe(false);
    expect(config.thinking?.enabled).toBe(false);
  });

  it('keeps a preserved non-managed default thinking selection untouched', async () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        custom: {
          type: 'nighthawk',
          apiKey: 'sk-existing',
        },
      },
      defaultModel: 'custom-default',
      thinking: { enabled: false },
      models: {
        'custom-default': {
          provider: 'custom',
          model: 'custom-model',
          maxContextSize: 1000,
        },
      },
    };

    const result = await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeThinkingTypeModelsResponse()) as unknown as typeof fetch,
      preserveDefaultModel: true,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    expect(result.defaultModel).toBe('custom-default');
    expect(result.defaultThinking).toBe(false);
    expect(config.thinking?.enabled).toBe(false);
  });
});

describe('support_efforts / default_effort', () => {
  function makeEffortModelsResponse(): Response {
    return new Response(
      JSON.stringify({
        data: [
          {
            id: 'nighthawk',
            context_length: 262144,
            supports_reasoning: true,
            supports_thinking_type: 'both',
            think_efforts: {
              support: true,
              valid_efforts: ['low', 'high', 'max'],
              default_effort: 'high',
            },
            display_name: 'NightHawk For Coding',
          },
          {
            // Empty / non-string entries are filtered; absent fields stay undefined.
            id: 'nighthawk-plain',
            context_length: 128000,
            supports_reasoning: true,
            think_efforts: { support: true, valid_efforts: ['low', '', 42] },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  it('parses think_efforts from the models endpoint', async () => {
    const models = await fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeEffortModelsResponse()) as unknown as typeof fetch,
    });

    expect(models[0]?.supportEfforts).toEqual(['low', 'high', 'max']);
    expect(models[0]?.defaultEffort).toBe('high');
    // The empty string and number are filtered out of valid_efforts.
    expect(models[1]?.supportEfforts).toEqual(['low']);
    expect(models[1]?.defaultEffort).toBeUndefined();
  });

  it('ignores think_efforts entirely when support is not true', async () => {
    const models = await fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'nighthawk-no-effort',
                context_length: 128000,
                supports_reasoning: true,
                think_efforts: {
                  support: false,
                  valid_efforts: ['low', 'high'],
                  default_effort: 'high',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    // support !== true gates the whole object — valid_efforts / default_effort
    // are ignored.
    expect(models[0]?.supportEfforts).toBeUndefined();
    expect(models[0]?.defaultEffort).toBeUndefined();
  });

  it('ignores legacy flat fields even when think_efforts is absent', async () => {
    // The legacy support_efforts / default_effort fields are no longer read;
    // only the nested think_efforts object is honored.
    const models = await fetchManagedNighthawkModels({
      accessToken: 'oauth-access-token',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'kimi-k2',
                context_length: 128000,
                supports_reasoning: true,
                support_efforts: ['low', 'high'],
                default_effort: 'high',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    expect(models[0]?.supportEfforts).toBeUndefined();
    expect(models[0]?.defaultEffort).toBeUndefined();
  });

  it('writes supportEfforts and defaultEffort onto the provisioned model entry', async () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };

    await provisionManagedNighthawkConfig({
      accessToken: 'oauth-access-token',
      fetchImpl: vi.fn(async () => makeEffortModelsResponse()) as unknown as typeof fetch,
      adapter: {
        read: () => config,
        write: vi.fn(),
        apply: applyManagedNighthawkConfig,
      },
    });

    const alias = config.models?.['nighthawk/nighthawk'];
    expect(alias?.['supportEfforts']).toEqual(['low', 'high', 'max']);
    expect(alias?.['defaultEffort']).toBe('high');
  });
});

describe('selective merge', () => {
  const baseOptions = {
    baseUrl: 'https://api.example.test/coding/v1',
    oauthKey: 'test-key',
  };

  it('preserves non-managed user fields but drops stale managed fields', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {},
      models: {
        'nighthawk/kimi-k2': {
          provider: 'nighthawk',
          model: 'kimi-k2',
          maxContextSize: 262144,
          capabilities: ['thinking'],
          maxOutputSize: 4096,
          supportEfforts: ['low', 'high', 'max'],
        } as Record<string, unknown>,
      },
    };

    applyManagedNighthawkConfig(config, {
      ...baseOptions,
      models: [
        {
          id: 'kimi-k2',
          contextLength: 262144,
          supportsReasoning: true,
          supportsImageIn: false,
          supportsVideoIn: false,
          supportsThinkingType: 'both',
        },
      ],
    });

    const alias = config.models?.['nighthawk/kimi-k2'];
    expect(alias?.['maxOutputSize']).toBe(4096);
    expect(alias?.['supportEfforts']).toBeUndefined();
    expect(alias?.['maxContextSize']).toBe(262144);
  });

  it('preserves overrides when upstream declares managed fields', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {},
      models: {
        'nighthawk/kimi-k2': {
          provider: 'nighthawk',
          model: 'kimi-k2',
          maxContextSize: 262144,
          overrides: { supportEfforts: ['low'] },
        } as Record<string, unknown>,
      },
    };

    applyManagedNighthawkConfig(config, {
      ...baseOptions,
      models: [
        {
          id: 'kimi-k2',
          contextLength: 262144,
          supportsReasoning: true,
          supportsImageIn: false,
          supportsVideoIn: false,
          supportEfforts: ['low', 'high', 'max'],
          defaultEffort: 'high',
        },
      ],
    });

    const alias = config.models?.['nighthawk/kimi-k2'];
    expect(alias?.['supportEfforts']).toEqual(['low', 'high', 'max']);
    expect(alias?.['defaultEffort']).toBe('high');
    expect(alias?.['overrides']).toEqual({ supportEfforts: ['low'] });
  });

  it('removes managed models that upstream no longer lists', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {},
      models: {
        'nighthawk/kimi-k2': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'kimi-k2',
          maxContextSize: 262144,
        },
        'nighthawk/removed': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'removed',
          maxContextSize: 128000,
        },
      },
    };

    applyManagedNighthawkConfig(config, {
      ...baseOptions,
      models: [
        {
          id: 'kimi-k2',
          contextLength: 262144,
          supportsReasoning: true,
          supportsImageIn: false,
          supportsVideoIn: false,
        },
      ],
    });

    expect(config.models?.['nighthawk/kimi-k2']).toBeDefined();
    expect(config.models?.['nighthawk/removed']).toBeUndefined();
  });
});

describe('applyManagedApiKeyProviderModels', () => {
  it('merges upstream models without touching provider, services, or defaults', () => {
    const config: ManagedNighthawkConfigShape = {
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl: 'https://api.example.test/coding/v1',
          apiKey: 'sk-distributed-key',
        },
      },
      models: {
        'my-nighthawk/kimi-k2': {
          provider: 'my-nighthawk',
          model: 'kimi-k2',
          maxContextSize: 262144,
          displayName: 'Old K2',
          maxOutputSize: 4096,
        } as Record<string, unknown>,
        'my-nighthawk/nighthawk-old': {
          provider: 'my-nighthawk',
          model: 'nighthawk-old',
          maxContextSize: 128000,
        },
        'other/m1': {
          provider: 'other',
          model: 'm1',
          maxContextSize: 128000,
        },
      },
      defaultModel: 'my-nighthawk/kimi-k2',
      thinking: { enabled: false },
    };

    applyManagedApiKeyProviderModels(
      config,
      'my-nighthawk',
      [makeModelInfo('kimi-k2', { displayName: 'Fresh K2' }), makeModelInfo('kimi-k2.5')],
      'my-nighthawk/',
    );

    // The provider record is user-owned: no rewrite, no oauth, no apiKey reset.
    expect(config.providers['my-nighthawk']).toEqual({
      type: 'nighthawk',
      baseUrl: 'https://api.example.test/coding/v1',
      apiKey: 'sk-distributed-key',
    });
    // Defaults and services are the orchestrator's / OAuth branch's business.
    expect(config.defaultModel).toBe('my-nighthawk/kimi-k2');
    expect(config.thinking).toEqual({ enabled: false });
    expect(config.services).toBeUndefined();
    // Upstream-owned fields merge; hand-written extras survive.
    const alias = config.models?.['my-nighthawk/kimi-k2'];
    expect(alias?.['displayName']).toBe('Fresh K2');
    expect(alias?.['maxOutputSize']).toBe(4096);
    // New upstream model added; dropped one removed; other providers untouched.
    expect(config.models?.['my-nighthawk/kimi-k2.5']).toBeDefined();
    expect(config.models?.['my-nighthawk/nighthawk-old']).toBeUndefined();
    expect(config.models?.['other/m1']).toBeDefined();
  });

  it('writes protocol routing fields for anthropic-protocol models', () => {
    const config: ManagedNighthawkConfigShape = { providers: {}, models: {} };

    applyManagedApiKeyProviderModels(
      config,
      'my-nighthawk',
      [makeModelInfo('nighthawk', { protocol: 'anthropic', supportsReasoning: true })],
      'my-nighthawk/',
    );

    const alias = config.models?.['my-nighthawk/nighthawk'];
    expect(alias?.['provider']).toBe('my-nighthawk');
    expect(alias?.['protocol']).toBe('anthropic');
    expect(alias?.['betaApi']).toBe(true);
    expect(alias?.['adaptiveThinking']).toBe(true);
    expect(alias?.['capabilities']).toEqual(['thinking', 'tool_use']);
  });

  it('rejects models without a positive context length', () => {
    const config: ManagedNighthawkConfigShape = { providers: {}, models: {} };

    expect(() => {
      applyManagedApiKeyProviderModels(
        config,
        'my-nighthawk',
        [makeModelInfo('bad', { contextLength: 0 })],
        'my-nighthawk/',
      );
    }).toThrow('context_length');
  });
});

function makeModelInfo(
  id: string,
  overrides: Partial<ManagedNighthawkModelInfo> = {},
): ManagedNighthawkModelInfo {
  return {
    id,
    contextLength: 200000,
    supportsReasoning: false,
    supportsImageIn: false,
    supportsVideoIn: false,
    ...overrides,
  };
}

const NIGHTHAWK_BASE_URL = 'https://api.nighthawk.com/v1';

describe('managed protocol routing', () => {
  it('reads protocol from the /models response', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [{ id: 'nighthawk', context_length: 262144, protocol: 'anthropic' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    const models = await fetchManagedNighthawkModels({ accessToken: 't', fetchImpl });
    expect(models).toHaveLength(1);
    expect(models[0]?.protocol).toBe('anthropic');
  });

  it('keeps the provider on the nighthawk REST base and records the model protocol when anthropic', () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };
    applyManagedNighthawkConfig(config, {
      baseUrl: NIGHTHAWK_BASE_URL,
      models: [makeModelInfo('nighthawk', { protocol: 'anthropic' })],
    });

    // The provider stays on the nighthawk wire + REST base; the anthropic transport
    // is resolved per-model at runtime, not baked into the provider config, so
    // the REST base keeps flowing to OAuth key derivation and plugin env.
    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toMatchObject({
      type: 'nighthawk',
      baseUrl: NIGHTHAWK_BASE_URL,
      apiKey: '',
    });
    expect(config.models?.['nighthawk/nighthawk']).toMatchObject({
      provider: NIGHTHAWK_PROVIDER_NAME,
      protocol: 'anthropic',
      betaApi: true,
    });
  });

  it('keeps the nighthawk protocol and baseUrl when the model has no anthropic protocol', () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };
    applyManagedNighthawkConfig(config, {
      baseUrl: NIGHTHAWK_BASE_URL,
      models: [makeModelInfo('nighthawk')],
    });

    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toMatchObject({
      type: 'nighthawk',
      baseUrl: NIGHTHAWK_BASE_URL,
      apiKey: '',
    });
    expect(config.models?.['nighthawk/nighthawk']?.provider).toBe(NIGHTHAWK_PROVIDER_NAME);
    expect(config.models?.['nighthawk/nighthawk']?.protocol).toBeUndefined();
  });

  it('drops the model protocol on refresh when the server stops declaring anthropic', () => {
    const config: ManagedNighthawkConfigShape = { providers: {} };
    applyManagedNighthawkConfig(config, {
      baseUrl: NIGHTHAWK_BASE_URL,
      models: [makeModelInfo('nighthawk', { protocol: 'anthropic' })],
    });
    expect(config.models?.['nighthawk/nighthawk']?.protocol).toBe('anthropic');

    applyManagedNighthawkConfig(config, {
      baseUrl: NIGHTHAWK_BASE_URL,
      models: [makeModelInfo('nighthawk')],
    });
    // The provider never leaves the nighthawk wire / REST base across refreshes —
    // only the per-model protocol annotation changes.
    expect(config.providers[NIGHTHAWK_PROVIDER_NAME]).toMatchObject({
      type: 'nighthawk',
      baseUrl: NIGHTHAWK_BASE_URL,
    });
    expect(config.models?.['nighthawk/nighthawk']?.protocol).toBeUndefined();
  });
});
