import { describe, expect, it } from 'vitest';

import {
  ProvidersSectionSchema,
  providersFromToml,
  providersToToml,
} from '#/app/kosongConfig/configSection';
import { ProviderService } from '#/kosong/provider/providerService';
import { type ProviderConfig } from '#/kosong/provider/provider';

describe('ProviderTypeSchema (free-form vendor identity)', () => {
  it('parses unregistered vendor names — resolve-time validation, not parse-time', () => {
    const parsed = ProvidersSectionSchema.parse({
      'my-vendor': { type: 'a-vendor-registered-elsewhere', baseUrl: 'https://example.com/v1' },
    });
    expect(parsed['my-vendor']?.type).toBe('a-vendor-registered-elsewhere');
  });
});

describe('providers TOML transforms', () => {
  it('converts snake_case entries to camelCase and back', () => {
    const from = providersFromToml({
      'my-provider': {
        type: 'nighthawk',
        base_url: 'https://api.nighthawk.com/v1',
        custom_headers: { 'x-a': 'b' },
        default_model: 'nighthawk-k2',
        oauth: { storage: 'file', key: 'k', oauth_host: 'example.com' },
      },
    }) as Record<string, Record<string, unknown>>;
    expect(from['my-provider']).toEqual({
      type: 'nighthawk',
      baseUrl: 'https://api.nighthawk.com/v1',
      customHeaders: { 'x-a': 'b' },
      defaultModel: 'nighthawk-k2',
      oauth: { storage: 'file', key: 'k', oauthHost: 'example.com' },
    });

    const back = providersToToml(from, undefined) as Record<string, Record<string, unknown>>;
    expect(back['my-provider']).toEqual({
      type: 'nighthawk',
      base_url: 'https://api.nighthawk.com/v1',
      custom_headers: { 'x-a': 'b' },
      default_model: 'nighthawk-k2',
      oauth: { storage: 'file', key: 'k', oauth_host: 'example.com' },
    });
  });
});

describe('ProviderService', () => {
  function createService(providers: Readonly<Record<string, ProviderConfig>> = {}): ProviderService {
    const service = new ProviderService();
    service.loadAll({ ...providers }, undefined);
    return service;
  }

  it('resolves ready on the first loadAll and gates mutations on it', async () => {
    const service = new ProviderService();
    let ready = false;
    void service.ready.then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);

    service.loadAll({ nighthawk: { type: 'nighthawk' } }, 'nighthawk');
    await service.ready;
    expect(ready).toBe(true);
    expect(service.get('nighthawk')).toEqual({ type: 'nighthawk' });
    expect(service.getDefaultProvider()).toBe('nighthawk');
  });

  it('supports CRUD and diffs state changes into onDidChangeProviders', async () => {
    const service = createService();
    const events: Array<{
      added: readonly string[];
      removed: readonly string[];
      changed: readonly string[];
    }> = [];
    service.onDidChangeProviders((e) =>
      events.push({ added: e.added, removed: e.removed, changed: e.changed }),
    );

    const nighthawk: ProviderConfig = { type: 'nighthawk', baseUrl: 'https://api.nighthawk.com/v1' };
    await service.set('nighthawk', nighthawk);
    expect(service.get('nighthawk')).toEqual(nighthawk);
    expect(service.list()).toEqual({ nighthawk });
    expect(events).toEqual([{ added: ['nighthawk'], removed: [], changed: [] }]);

    const updated: ProviderConfig = { ...nighthawk, apiKey: 'sk-1' };
    await service.set('nighthawk', updated);
    expect(events.at(-1)).toEqual({ added: [], removed: [], changed: ['nighthawk'] });

    await service.set('nighthawk', updated);
    expect(events).toHaveLength(2);

    await service.delete('nighthawk');
    expect(service.get('nighthawk')).toBeUndefined();
    expect(events.at(-1)).toEqual({ added: [], removed: ['nighthawk'], changed: [] });
  });

  it('loadAll fires only for real diffs on re-sync', async () => {
    const service = createService({ nighthawk: { type: 'nighthawk' } });
    const events: unknown[] = [];
    service.onDidChangeProviders((e) =>
      events.push({ added: e.added, removed: e.removed, changed: e.changed }),
    );

    service.loadAll({ nighthawk: { type: 'nighthawk' } }, undefined);
    expect(events).toHaveLength(0);

    service.loadAll({ nighthawk: { type: 'nighthawk' }, other: { baseUrl: 'https://example.com' } }, undefined);
    expect(events).toEqual([{ added: ['other'], removed: [], changed: [] }]);
  });

  it('replaceAll replaces the records and keeps the default pointer', async () => {
    const service = createService({ a: { type: 'nighthawk' }, b: { type: 'nighthawk' } });
    await service.setDefaultProvider('a');

    await service.replaceAll({ c: { type: 'nighthawk' } });
    expect(service.list()).toEqual({ c: { type: 'nighthawk' } });
    expect(service.getDefaultProvider()).toBe('a');
  });

  it('clears the defaultProvider pointer when the default provider is deleted', async () => {
    const service = createService({ nighthawk: { type: 'nighthawk' } });
    const pointerEvents: Array<string | undefined> = [];
    service.onDidChangeDefaultProvider((e) => pointerEvents.push(e.id));

    await service.setDefaultProvider('nighthawk');
    expect(service.getDefaultProvider()).toBe('nighthawk');

    await service.delete('nighthawk');
    expect(service.getDefaultProvider()).toBeUndefined();
    expect(pointerEvents).toEqual(['nighthawk', undefined]);
  });

  it('a mutation resolves only after the listeners’ waitUntil work completes', async () => {
    const service = createService();
    let persistDone = false;
    service.onDidChangeProviders((e) => {
      e.waitUntil(
        new Promise<void>((resolve) => setTimeout(resolve, 50)).then(() => {
          persistDone = true;
        }),
      );
    });

    await service.set('nighthawk', { type: 'nighthawk' });
    expect(persistDone).toBe(true);
  });
});
