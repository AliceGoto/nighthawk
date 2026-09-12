import {
  NIGHTHAWK_PROVIDER_NAME,
  resolveNighthawkOAuthKey,
  resolveNighthawkOAuthRef,
} from '@nighthawk/nighthawk-oauth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  refreshAllProviderModels,
  refreshProviderModelsForPicker,
  type ProviderModelRefreshHost,
} from '../../../src/tui/utils/refresh-providers';
import type { NighthawkConfig } from '@nighthawk/nighthawk-sdk';

type FetchMock = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => Promise<Response>;

function fetchInputUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function makeRefreshHost(initial: NighthawkConfig): {
  current: () => NighthawkConfig;
  removeProvider: ReturnType<typeof vi.fn<(providerId: string) => Promise<NighthawkConfig>>>;
  setConfig: ReturnType<typeof vi.fn<(patch: Partial<NighthawkConfig>) => Promise<NighthawkConfig>>>;
} {
  let persisted = structuredClone(initial);
  const removeProvider = vi.fn(async (providerId: string) => {
    const providers = { ...persisted.providers };
    delete providers[providerId];
    const models = { ...persisted.models };
    let defaultRemoved = false;
    for (const [alias, model] of Object.entries(models)) {
      if (model.provider !== providerId) continue;
      delete models[alias];
      if (persisted.defaultModel === alias) defaultRemoved = true;
    }
    persisted = { ...persisted, providers, models };
    if (defaultRemoved) persisted = { ...persisted, defaultModel: undefined };
    return structuredClone(persisted);
  });
  const setConfig = vi.fn(async (patch: Partial<NighthawkConfig>) => {
    persisted = { ...persisted, ...patch };
    return structuredClone(persisted);
  });
  return {
    current: () => structuredClone(persisted),
    removeProvider,
    setConfig,
  };
}

describe('refreshAllProviderModels', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('refreshes managed NightHawk against environment endpoints over persisted config', async () => {
    const configuredBaseUrl = 'https://api.configured.example.test/coding/v1';
    const envBaseUrl = 'https://api.env.example.test/coding/v1';
    const envOauthHost = 'https://auth.env.example.test';
    const configuredOauthKey = resolveNighthawkOAuthKey({ baseUrl: configuredBaseUrl });
    const envOauthRef = resolveNighthawkOAuthRef({
      oauthHost: envOauthHost,
      baseUrl: envBaseUrl,
    });
    const config: NighthawkConfig = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          baseUrl: configuredBaseUrl,
          apiKey: '',
          oauth: {
            storage: 'file',
            key: configuredOauthKey,
            oauthHost: 'https://auth.nighthawk.com',
          },
        },
      },
      models: {
        'nighthawk/nighthawk-for-coding': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['thinking', 'tool_use'],
        },
      },
      defaultModel: 'nighthawk/nighthawk-for-coding',
      telemetry: true,
    };
    vi.stubEnv('NIGHTHAWK_BASE_URL', envBaseUrl);
    vi.stubEnv('NIGHTHAWK_OAUTH_HOST', envOauthHost);
    const resolveOAuthToken = vi.fn(async (_providerName, oauthRef) => {
      expect(oauthRef).toEqual(envOauthRef);
      return 'env-access-token';
    });
    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(`${envBaseUrl}/models`);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer env-access-token');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'nighthawk-for-coding',
              context_length: 262144,
              supports_reasoning: true,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => config,
      removeProvider: vi.fn(),
      setConfig: vi.fn(),
      resolveOAuthToken,
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual([NIGHTHAWK_PROVIDER_NAME]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resolveOAuthToken).toHaveBeenCalledWith(NIGHTHAWK_PROVIDER_NAME, envOauthRef);
  });

  it('can refresh only the managed OAuth provider without fetching third-party registries', async () => {
    const baseUrl = 'https://api.example.test/coding/v1';
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const config: NighthawkConfig = {
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          baseUrl,
          apiKey: '',
          oauth: {
            storage: 'file',
            key: resolveNighthawkOAuthKey({ baseUrl }),
          },
        },
        custom: {
          type: 'openai',
          baseUrl: 'https://custom.example.test/v1',
          apiKey: 'sk-test-token',
          source: { kind: 'apiJson', url: registryUrl, apiKey: 'sk-test-token' },
        },
      },
      models: {
        'nighthawk/nighthawk-for-coding': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['thinking', 'tool_use'],
          displayName: 'Old NightHawk',
        },
        'custom/m1': {
          provider: 'custom',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'Custom M1',
        },
      },
      defaultModel: 'nighthawk/nighthawk-for-coding',
      telemetry: true,
    };
    const host = makeRefreshHost(config);
    const resolveOAuthToken = vi.fn(async () => 'oauth-access-token');
    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(`${baseUrl}/models`);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer oauth-access-token');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'nighthawk-for-coding',
              context_length: 262144,
              supports_reasoning: true,
              display_name: 'Fresh NightHawk',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels(
      {
        getConfig: async () => host.current(),
        removeProvider: host.removeProvider,
        setConfig: host.setConfig,
        resolveOAuthToken,
      },
      { scope: 'oauth' },
    );

    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([
      {
        providerId: NIGHTHAWK_PROVIDER_NAME,
        providerName: 'NightHawk',
        added: 0,
        removed: 0,
      },
    ]);
    expect(result.unchanged).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(host.current().models?.['nighthawk/nighthawk-for-coding']?.displayName).toBe('Fresh NightHawk');
    expect(host.current().models?.['custom/m1']?.displayName).toBe('Custom M1');
  });

  it('refreshes custom-registry model capabilities even when model ids are unchanged', async () => {
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const providerId = 'example_chat-completions';
    const siblingProviderId = 'example_messages';
    const modelId = 'reasoner-pro';
    const modelAlias = `${providerId}/${modelId}`;
    const siblingModelAlias = `${siblingProviderId}/${modelId}`;
    const userAlias = 'my-reasoner';
    const userAliasModel = {
      provider: providerId,
      model: modelId,
      maxContextSize: 262144,
      capabilities: ['tool_use'],
      displayName: 'My Reasoner',
    };
    const host = makeRefreshHost({
      providers: {
        [providerId]: {
          type: 'openai',
          baseUrl: 'https://api.example.test/v1',
          apiKey: 'sk-test-token',
          source: { kind: 'apiJson', url: registryUrl, apiKey: 'sk-test-token' },
        },
        [siblingProviderId]: {
          type: 'anthropic',
          baseUrl: 'https://messages.example.test',
          apiKey: 'sk-test-token',
          source: { kind: 'apiJson', url: registryUrl, apiKey: 'sk-test-token' },
        },
      },
      models: {
        [modelAlias]: {
          provider: providerId,
          model: modelId,
          maxContextSize: 262144,
          capabilities: ['tool_use'],
          displayName: 'Reasoner Pro',
        },
        [siblingModelAlias]: {
          provider: siblingProviderId,
          model: modelId,
          maxContextSize: 262144,
          capabilities: ['tool_use'],
          displayName: 'Reasoner Pro',
        },
        [userAlias]: userAliasModel,
      },
      defaultModel: modelAlias,
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(registryUrl);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-test-token');
      return new Response(
        JSON.stringify({
          [providerId]: {
            id: providerId,
            name: 'Example Chat Completions',
            api: 'https://api.example.test/v1',
            type: 'openai',
            models: {
              [modelId]: {
                id: modelId,
                name: 'Reasoner Pro',
                limit: { context: 262144, output: 262144 },
                tool_call: true,
                reasoning: true,
                modalities: { input: ['text', 'image', 'video'], output: ['text'] },
              },
            },
          },
          [siblingProviderId]: {
            id: siblingProviderId,
            name: 'Example Messages',
            api: 'https://messages.example.test',
            type: 'anthropic',
            models: {
              [modelId]: {
                id: modelId,
                name: 'Reasoner Pro',
                limit: { context: 262144, output: 262144 },
                tool_call: true,
                reasoning: true,
                modalities: { input: ['text', 'image', 'video'], output: ['text'] },
              },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual([]);
    expect(result.changed).toEqual([
      {
        providerId,
        providerName: 'Example Chat Completions',
        added: 0,
        removed: 0,
      },
      {
        providerId: siblingProviderId,
        providerName: 'Example Messages',
        added: 0,
        removed: 0,
      },
    ]);
    expect(host.removeProvider).toHaveBeenCalledWith(providerId);
    expect(host.removeProvider).toHaveBeenCalledWith(siblingProviderId);
    expect(host.setConfig).toHaveBeenCalledTimes(1);
    expect(host.current().models?.[modelAlias]?.capabilities).toEqual([
      'tool_use',
      'thinking',
      'image_in',
      'video_in',
    ]);
    expect(host.current().models?.[siblingModelAlias]?.capabilities).toEqual([
      'tool_use',
      'thinking',
      'image_in',
      'video_in',
    ]);
    expect(host.current().models?.[userAlias]).toEqual(userAliasModel);
  });

  it('adds custom-registry providers that appear under an existing source URL', async () => {
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const apiKey = 'sk-test-token';
    const source = { kind: 'apiJson', url: registryUrl, apiKey };
    const host = makeRefreshHost({
      providers: {
        a: {
          type: 'openai',
          baseUrl: 'https://a.example.test/v1',
          apiKey,
          source,
        },
      },
      models: {
        'a/m1': {
          provider: 'a',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'm1',
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(registryUrl);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-test-token');
      return new Response(
        JSON.stringify({
          a: {
            id: 'a',
            name: 'Provider A',
            api: 'https://a.example.test/v1',
            type: 'openai',
            models: { m1: { id: 'm1' } },
          },
          b: {
            id: 'b',
            name: 'Provider B',
            api: 'https://b.example.test/v1',
            type: 'openai',
            models: { m1: { id: 'm1' } },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual(['a']);
    expect(result.changed).toEqual([
      {
        providerId: 'b',
        providerName: 'Provider B',
        added: 1,
        removed: 0,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(host.removeProvider).not.toHaveBeenCalled();
    expect(host.setConfig).toHaveBeenCalledTimes(1);
    expect(Object.keys(host.current().providers).toSorted()).toEqual(['a', 'b']);
    expect(host.current().providers['b']).toMatchObject({
      type: 'openai',
      baseUrl: 'https://b.example.test/v1',
      apiKey,
      source,
    });
    expect(host.current().models?.['b/m1']).toEqual({
      provider: 'b',
      model: 'm1',
      maxContextSize: 131072,
      capabilities: ['tool_use'],
      displayName: 'm1',
    });
  });

  it('removes custom-registry providers that disappear from an existing source URL', async () => {
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const apiKey = 'sk-test-token';
    const source = { kind: 'apiJson', url: registryUrl, apiKey };
    const host = makeRefreshHost({
      providers: {
        a: {
          type: 'openai',
          baseUrl: 'https://a.example.test/v1',
          apiKey,
          source,
        },
        b: {
          type: 'openai',
          baseUrl: 'https://b.example.test/v1',
          apiKey,
          source,
        },
      },
      models: {
        'a/m1': {
          provider: 'a',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'm1',
        },
        'b/m1': {
          provider: 'b',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'm1',
        },
        'my-b': {
          provider: 'b',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'My B',
        },
      },
      defaultModel: 'my-b',
      thinking: { enabled: true },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(registryUrl);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-test-token');
      return new Response(
        JSON.stringify({
          a: {
            id: 'a',
            name: 'Provider A',
            api: 'https://a.example.test/v1',
            type: 'openai',
            models: { m1: { id: 'm1' } },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual(['a']);
    expect(result.changed).toEqual([
      {
        providerId: 'b',
        providerName: 'b',
        added: 0,
        removed: 1,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(host.removeProvider).toHaveBeenCalledWith('b');
    expect(host.setConfig).toHaveBeenCalledTimes(1);
    expect(Object.keys(host.current().providers)).toEqual(['a']);
    expect(host.current().models?.['a/m1']).toBeDefined();
    expect(host.current().models?.['b/m1']).toBeUndefined();
    expect(host.current().models?.['my-b']).toBeUndefined();
    expect(host.current().defaultModel).toBeUndefined();
    expect(host.current().thinking).toBeUndefined();
  });

  it('coalesces duplicate custom-registry source URLs without reporting config-only changes', async () => {
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const oldSource = { kind: 'apiJson', url: registryUrl, apiKey: 'sk-old-token' };
    const newSource = { kind: 'apiJson', url: registryUrl, apiKey: 'sk-new-token' };
    const host = makeRefreshHost({
      providers: {
        a: {
          type: 'openai',
          baseUrl: 'https://a.example.test/v1',
          apiKey: 'sk-old-token',
          source: oldSource,
        },
        b: {
          type: 'openai',
          baseUrl: 'https://b.example.test/v1',
          apiKey: 'sk-new-token',
          source: newSource,
        },
      },
      models: {
        'a/m1': {
          provider: 'a',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'm1',
        },
        'b/m1': {
          provider: 'b',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'm1',
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(registryUrl);
      const authorization = new Headers(init?.headers).get('authorization');
      if (authorization === 'Bearer sk-old-token') {
        return new Response(JSON.stringify({ message: 'expired token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      expect(authorization).toBe('Bearer sk-new-token');
      return new Response(
        JSON.stringify({
          a: {
            id: 'a',
            name: 'Provider A',
            api: 'https://a.example.test/v1',
            type: 'openai',
            models: { m1: { id: 'm1' } },
          },
          b: {
            id: 'b',
            name: 'Provider B',
            api: 'https://b.example.test/v1',
            type: 'openai',
            models: { m1: { id: 'm1' }, m2: { id: 'm2' } },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual(['a']);
    expect(result.changed).toEqual([
      {
        providerId: 'b',
        providerName: 'Provider B',
        added: 1,
        removed: 0,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(host.removeProvider).toHaveBeenCalledWith('a');
    expect(host.removeProvider).toHaveBeenCalledWith('b');
    expect(host.setConfig).toHaveBeenCalledTimes(1);
    expect(host.current().providers['a']?.source).toEqual(newSource);
    expect(host.current().providers['b']?.source).toEqual(newSource);
    expect(host.current().providers['a']?.apiKey).toBe('sk-new-token');
    expect(host.current().providers['b']?.apiKey).toBe('sk-new-token');
    expect(host.current().models?.['b/m2']).toEqual({
      provider: 'b',
      model: 'm2',
      maxContextSize: 131072,
      capabilities: ['tool_use'],
      displayName: 'm2',
    });
  });

  it('ignores user-defined aliases when custom-registry metadata is unchanged', async () => {
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const providerId = 'example_chat-completions';
    const modelId = 'reasoner-pro';
    const modelAlias = `${providerId}/${modelId}`;
    const userAlias = 'my-reasoner';
    const richCapabilities = ['tool_use', 'thinking', 'image_in'];
    const userAliasModel = {
      provider: providerId,
      model: modelId,
      maxContextSize: 262144,
      capabilities: ['tool_use'],
      displayName: 'My Reasoner',
    };
    const host = makeRefreshHost({
      providers: {
        [providerId]: {
          type: 'openai',
          baseUrl: 'https://api.example.test/v1',
          apiKey: 'sk-test-token',
          source: { kind: 'apiJson', url: registryUrl, apiKey: 'sk-test-token' },
        },
      },
      models: {
        [modelAlias]: {
          provider: providerId,
          model: modelId,
          maxContextSize: 262144,
          capabilities: richCapabilities,
          displayName: 'Reasoner Pro',
        },
        [userAlias]: userAliasModel,
      },
      defaultModel: userAlias,
      thinking: { enabled: false },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(registryUrl);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-test-token');
      return new Response(
        JSON.stringify({
          [providerId]: {
            id: providerId,
            name: 'Example Chat Completions',
            api: 'https://api.example.test/v1',
            type: 'openai',
            models: {
              [modelId]: {
                id: modelId,
                name: 'Reasoner Pro',
                limit: { context: 262144, output: 262144 },
                tool_call: true,
                reasoning: true,
                modalities: { input: ['text', 'image'], output: ['text'] },
              },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([]);
    expect(result.unchanged).toEqual([providerId]);
    expect(host.removeProvider).not.toHaveBeenCalled();
    expect(host.setConfig).not.toHaveBeenCalled();
    expect(host.current().models?.[userAlias]).toEqual(userAliasModel);
    expect(host.current().defaultModel).toBe(userAlias);
    expect(host.current().thinking?.enabled).toBe(false);
  });

  it('forces default thinking on when the refreshed default model cannot disable thinking', async () => {
    const host = makeRefreshHost({
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          apiKey: '',
          oauth: { storage: 'file', key: 'oauth/nighthawk' },
        },
      },
      models: {
        'nighthawk/nighthawk-deep-coder': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk-deep-coder',
          maxContextSize: 262144,
          capabilities: ['thinking', 'tool_use'],
        },
      },
      defaultModel: 'nighthawk/nighthawk-deep-coder',
      thinking: { enabled: false },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'nighthawk-deep-coder',
                context_length: 262144,
                supports_reasoning: true,
                supports_thinking_type: 'only',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(async () => 'oauth-access-token'),
    });

    expect(result.failed).toEqual([]);
    expect(host.current().models?.['nighthawk/nighthawk-deep-coder']?.capabilities).toEqual([
      'thinking',
      'always_thinking',
      'tool_use',
    ]);
    expect(host.current().defaultModel).toBe('nighthawk/nighthawk-deep-coder');
    expect(host.current().thinking?.enabled).toBe(true);
  });

  it('refreshes a hand-configured API-key provider pointing at the managed endpoint', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const userAliasModel = {
      provider: 'my-nighthawk',
      model: 'nighthawk-for-coding',
      maxContextSize: 131072,
      capabilities: ['tool_use'],
      displayName: 'My Coding',
    };
    const host = makeRefreshHost({
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl,
          apiKey: 'sk-distributed-key',
        },
      },
      models: {
        'my-nighthawk/nighthawk-for-coding': {
          provider: 'my-nighthawk',
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['tool_use'],
          displayName: 'Old NightHawk',
        },
        'my-nighthawk/nighthawk-old': {
          provider: 'my-nighthawk',
          model: 'nighthawk-old',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
        },
        'my-fav': userAliasModel,
      },
      defaultModel: 'my-nighthawk/nighthawk-for-coding',
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(`${baseUrl}/models`);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-distributed-key');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'nighthawk-for-coding',
              context_length: 262144,
              supports_reasoning: true,
              display_name: 'Fresh NightHawk',
            },
            { id: 'nighthawk-k2', context_length: 131072 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([
      { providerId: 'my-nighthawk', providerName: 'my-nighthawk', added: 1, removed: 1 },
    ]);
    // The provider record is user-owned and must survive untouched.
    expect(host.current().providers['my-nighthawk']).toEqual({
      type: 'nighthawk',
      baseUrl,
      apiKey: 'sk-distributed-key',
    });
    // Upstream-owned fields merge; the dropped model disappears; the new one appears.
    expect(host.current().models?.['my-nighthawk/nighthawk-for-coding']?.displayName).toBe('Fresh NightHawk');
    expect(host.current().models?.['my-nighthawk/nighthawk-for-coding']?.capabilities).toEqual([
      'thinking',
      'tool_use',
    ]);
    expect(host.current().models?.['my-nighthawk/nighthawk-k2']).toBeDefined();
    expect(host.current().models?.['my-nighthawk/nighthawk-old']).toBeUndefined();
    // Non-prefix user aliases and the default selection are preserved.
    expect(host.current().models?.['my-fav']).toEqual(userAliasModel);
    expect(host.current().defaultModel).toBe('my-nighthawk/nighthawk-for-coding');
  });

  it('resolves the API key from the provider env sub-table when api_key is empty', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const host = makeRefreshHost({
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl,
          apiKey: '',
          env: { NIGHTHAWK_API_KEY: 'sk-env-key' },
        },
      },
      models: {
        'my-nighthawk/nighthawk-for-coding': {
          provider: 'my-nighthawk',
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['thinking', 'tool_use'],
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(`${baseUrl}/models`);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-env-key');
      return new Response(
        JSON.stringify({
          data: [{ id: 'nighthawk-for-coding', context_length: 262144, supports_reasoning: true }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual(['my-nighthawk']);
    expect(host.setConfig).not.toHaveBeenCalled();
  });

  it('matches the managed endpoint even with a trailing slash on the configured baseUrl', async () => {
    vi.stubEnv('NIGHTHAWK_BASE_URL', 'https://api.managed.example.test/coding/v1');
    const host = makeRefreshHost({
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl: 'https://api.managed.example.test/coding/v1/',
          apiKey: 'sk-distributed-key',
        },
      },
      models: {},
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input) => {
      expect(fetchInputUrl(input)).toBe('https://api.managed.example.test/coding/v1/models');
      return new Response(
        JSON.stringify({ data: [{ id: 'nighthawk-for-coding', context_length: 262144 }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([
      { providerId: 'my-nighthawk', providerName: 'my-nighthawk', added: 1, removed: 0 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh API-key providers pointing at non-managed endpoints', async () => {
    vi.stubEnv('NIGHTHAWK_BASE_URL', 'https://api.managed.example.test/coding/v1');
    const host = makeRefreshHost({
      providers: {
        gateway: {
          type: 'nighthawk',
          baseUrl: 'https://gateway.example.test/v1',
          apiKey: 'sk-gateway-key',
        },
        'nighthawk-lookalike': {
          type: 'nighthawk',
          baseUrl: 'https://api.moonshot.cn/v1',
          apiKey: 'sk-platform-key',
        },
      },
      models: {},
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>();
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result).toEqual({ changed: [], unchanged: [], failed: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes a hand-written managed:nighthawk provider that uses an API key instead of OAuth', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const host = makeRefreshHost({
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          baseUrl,
          apiKey: 'sk-distributed-key',
        },
      },
      models: {
        'nighthawk/nighthawk-for-coding': {
          provider: NIGHTHAWK_PROVIDER_NAME,
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['tool_use'],
          displayName: 'Old NightHawk',
        },
      },
      defaultModel: 'nighthawk/nighthawk-for-coding',
      telemetry: true,
    } as unknown as NighthawkConfig);

    const resolveOAuthToken = vi.fn(async () => 'oauth-access-token');
    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe(`${baseUrl}/models`);
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-distributed-key');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'nighthawk-for-coding',
              context_length: 262144,
              supports_reasoning: true,
              display_name: 'Fresh NightHawk',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken,
    });

    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([
      {
        providerId: NIGHTHAWK_PROVIDER_NAME,
        providerName: NIGHTHAWK_PROVIDER_NAME,
        added: 0,
        removed: 0,
      },
    ]);
    // The OAuth branch must not run: no token resolution, and the provider
    // record keeps the user's API-key shape (no oauth ref, no apiKey reset).
    expect(resolveOAuthToken).not.toHaveBeenCalled();
    expect(host.current().providers[NIGHTHAWK_PROVIDER_NAME]).toEqual({
      type: 'nighthawk',
      baseUrl,
      apiKey: 'sk-distributed-key',
    });
    expect(host.current().services).toBeUndefined();
    expect(host.current().models?.['nighthawk/nighthawk-for-coding']?.displayName).toBe('Fresh NightHawk');
    expect(host.current().defaultModel).toBe('nighthawk/nighthawk-for-coding');
  });

  it('reports a failed refresh and keeps config when the managed endpoint rejects the API key', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const host = makeRefreshHost({
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl,
          apiKey: 'sk-revoked-key',
        },
      },
      models: {
        'my-nighthawk/nighthawk-for-coding': {
          provider: 'my-nighthawk',
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['tool_use'],
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(
      async () =>
        new Response(JSON.stringify({ error: { message: 'invalid key' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.changed).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.provider).toBe('my-nighthawk');
    expect(result.failed[0]?.reason).toContain('the API key');
    expect(host.setConfig).not.toHaveBeenCalled();
    expect(host.current().models?.['my-nighthawk/nighthawk-for-coding']).toBeDefined();
  });

  it('skips the API-key refresh when the managed endpoint returns no models', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const host = makeRefreshHost({
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl,
          apiKey: 'sk-distributed-key',
        },
      },
      models: {
        'my-nighthawk/nighthawk-for-coding': {
          provider: 'my-nighthawk',
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['tool_use'],
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(
      async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result).toEqual({ changed: [], unchanged: [], failed: [] });
    expect(host.setConfig).not.toHaveBeenCalled();
    expect(host.current().models?.['my-nighthawk/nighthawk-for-coding']).toBeDefined();
  });

  it('writes defaultProvider back when refreshing the provider it points at', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const host = makeRefreshHost({
      providers: {
        'my-nighthawk': {
          type: 'nighthawk',
          baseUrl,
          apiKey: 'sk-distributed-key',
        },
      },
      models: {
        'my-nighthawk/nighthawk-for-coding': {
          provider: 'my-nighthawk',
          model: 'nighthawk-for-coding',
          maxContextSize: 262144,
          capabilities: ['tool_use'],
          displayName: 'Old NightHawk',
        },
      },
      defaultProvider: 'my-nighthawk',
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'nighthawk-for-coding',
                context_length: 262144,
                supports_reasoning: true,
                display_name: 'Fresh NightHawk',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.changed).toHaveLength(1);
    // The v1 removeProvider RPC clears defaultProvider when it points at the
    // refreshed provider; the setConfig patch must carry the original value
    // back.
    expect(host.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ defaultProvider: 'my-nighthawk' }),
    );
    expect(host.current().defaultProvider).toBe('my-nighthawk');
  });

  it('leaves registry-sourced providers at the managed base URL to the registry branch', async () => {
    const baseUrl = 'https://api.managed.example.test/coding/v1';
    vi.stubEnv('NIGHTHAWK_BASE_URL', baseUrl);
    const registryUrl = 'https://registry.example.test/v1/models/api.json';
    const host = makeRefreshHost({
      providers: {
        custom: {
          type: 'nighthawk',
          baseUrl,
          apiKey: 'sk-test-token',
          source: { kind: 'apiJson', url: registryUrl, apiKey: 'sk-test-token' },
        },
      },
      models: {
        'custom/m1': {
          provider: 'custom',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'm1',
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);

    const fetchMock = vi.fn<FetchMock>(async (input) => {
      expect(fetchInputUrl(input)).toBe(registryUrl);
      return new Response(
        JSON.stringify({
          custom: {
            id: 'custom',
            name: 'Custom',
            api: baseUrl,
            type: 'nighthawk',
            models: { m1: { id: 'm1' } },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAllProviderModels({
      getConfig: async () => host.current(),
      removeProvider: host.removeProvider,
      setConfig: host.setConfig,
      resolveOAuthToken: vi.fn(),
    });

    expect(result.failed).toEqual([]);
    expect(result.unchanged).toEqual(['custom']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(host.setConfig).not.toHaveBeenCalled();
  });
});

describe('refreshProviderModelsForPicker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function makePickerHost(initial: NighthawkConfig) {
    const base = makeRefreshHost(initial);
    const setAppState = vi.fn();
    const showStatus = vi.fn();
    const showError = vi.fn();
    const host: ProviderModelRefreshHost = {
      harness: {
        getConfig: async () => base.current(),
        removeProvider: base.removeProvider,
        setConfig: base.setConfig,
      },
      setAppState,
      showStatus,
      showError,
    };
    return { base, host, setAppState, showStatus, showError };
  }

  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('refreshes a custom provider, preserving its record and the surviving default', async () => {
    const provider = {
      type: 'nighthawk',
      baseUrl: 'https://api.custom.example.test/v1',
      apiKey: 'sk-custom-key',
    };
    const ctx = makePickerHost({
      providers: { 'my-provider': provider },
      models: {
        'my-provider/m1': {
          provider: 'my-provider',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
          displayName: 'Old M1',
        },
      },
      defaultModel: 'my-provider/m1',
      thinking: { enabled: false },
      telemetry: true,
    } as unknown as NighthawkConfig);
    const onRefreshed = vi.fn();
    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      expect(fetchInputUrl(input)).toBe('https://api.custom.example.test/v1/models');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-custom-key');
      return jsonResponse({
        data: [
          { id: 'm1', context_length: 131072, display_name: 'Fresh M1' },
          { id: 'm2', context_length: 262144 },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await refreshProviderModelsForPicker(ctx.host, 'my-provider', onRefreshed);

    expect(ctx.showError).not.toHaveBeenCalled();
    expect(ctx.showStatus).toHaveBeenCalledWith('Models refreshed: +1 new.');
    expect(onRefreshed).toHaveBeenCalledTimes(1);
    // setConfig cannot drop keys, so the provider is cleared first, then the
    // refreshed records are written back.
    expect(ctx.base.removeProvider).toHaveBeenCalledWith('my-provider');
    // The provider record survives untouched.
    expect(ctx.base.current().providers['my-provider']).toEqual(provider);
    expect(ctx.base.current().models?.['my-provider/m1']?.displayName).toBe('Fresh M1');
    expect(ctx.base.current().models?.['my-provider/m2']).toBeDefined();
    // The default survived the refresh and keeps the user's thinking pref.
    expect(ctx.base.current().defaultModel).toBe('my-provider/m1');
    expect(ctx.base.current().thinking).toEqual({ enabled: false });
    expect(ctx.setAppState).toHaveBeenCalledWith({
      availableModels: ctx.base.current().models,
      availableProviders: ctx.base.current().providers,
    });
  });

  it('skips OAuth providers without fetching', async () => {
    const ctx = makePickerHost({
      providers: {
        [NIGHTHAWK_PROVIDER_NAME]: {
          type: 'nighthawk',
          oauth: { storage: 'file', key: 'oauth/nighthawk' },
        },
      },
      models: {},
      telemetry: true,
    } as unknown as NighthawkConfig);
    const onRefreshed = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await refreshProviderModelsForPicker(ctx.host, NIGHTHAWK_PROVIDER_NAME, onRefreshed);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.showStatus).toHaveBeenCalledWith('OAuth provider models refresh via /connect.');
    expect(ctx.base.setConfig).not.toHaveBeenCalled();
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it('skips the write when the refreshed list is identical', async () => {
    const ctx = makePickerHost({
      providers: {
        p: { type: 'nighthawk', baseUrl: 'https://api.p.example.test/v1', apiKey: 'sk-p' },
      },
      models: {
        'p/m1': {
          provider: 'p',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);
    const onRefreshed = vi.fn();
    const fetchMock = vi.fn<FetchMock>(
      async () => jsonResponse({ data: [{ id: 'm1', context_length: 131072 }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await refreshProviderModelsForPicker(ctx.host, 'p', onRefreshed);

    expect(ctx.showStatus).toHaveBeenCalledWith('Models already up to date.');
    expect(ctx.base.removeProvider).not.toHaveBeenCalled();
    expect(ctx.base.setConfig).not.toHaveBeenCalled();
    expect(ctx.setAppState).not.toHaveBeenCalled();
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it('leaves the default unset when the refreshed list drops it', async () => {
    const ctx = makePickerHost({
      providers: {
        p: { type: 'nighthawk', baseUrl: 'https://api.p.example.test/v1', apiKey: 'sk-p' },
      },
      models: {
        'p/m1': {
          provider: 'p',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
        },
      },
      defaultModel: 'p/m1',
      thinking: { enabled: true },
      telemetry: true,
    } as unknown as NighthawkConfig);
    const fetchMock = vi.fn<FetchMock>(
      async () => jsonResponse({ data: [{ id: 'm2', context_length: 262144 }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await refreshProviderModelsForPicker(ctx.host, 'p');

    expect(ctx.showStatus).toHaveBeenCalledWith('Models refreshed: +1 new, -1 removed.');
    expect(ctx.base.current().models?.['p/m2']).toBeDefined();
    expect(ctx.base.current().models?.['p/m1']).toBeUndefined();
    expect(ctx.base.current().defaultModel).toBeUndefined();
    expect(ctx.base.current().thinking).toBeUndefined();
  });

  it('reports fetch failures without touching config', async () => {
    const ctx = makePickerHost({
      providers: {
        p: { type: 'nighthawk', baseUrl: 'https://api.p.example.test/v1', apiKey: 'sk-p' },
      },
      models: {
        'p/m1': {
          provider: 'p',
          model: 'm1',
          maxContextSize: 131072,
          capabilities: ['tool_use'],
        },
      },
      telemetry: true,
    } as unknown as NighthawkConfig);
    const onRefreshed = vi.fn();
    const fetchMock = vi.fn<FetchMock>(
      async () =>
        new Response(JSON.stringify({ error: { message: 'invalid key' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await refreshProviderModelsForPicker(ctx.host, 'p', onRefreshed);

    expect(ctx.showError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to refresh models'),
    );
    expect(ctx.base.removeProvider).not.toHaveBeenCalled();
    expect(ctx.base.setConfig).not.toHaveBeenCalled();
    expect(ctx.setAppState).not.toHaveBeenCalled();
    expect(onRefreshed).not.toHaveBeenCalled();
    expect(ctx.base.current().models?.['p/m1']).toBeDefined();
  });
});
