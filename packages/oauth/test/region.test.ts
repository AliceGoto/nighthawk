import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_NIGHTHAWK_OAUTH_HOST } from '#/constants';
import { NIGHTHAWK_OAUTH_KEY } from '#/managed-kimi-code';
import { DEFAULT_NIGHTHAWK_BASE_URL } from '#/managed-usage';
import { NIGHTHAWK_REGION_CACHE_FILENAME, type NightHawkRegionCacheRecord } from '#/region-cache';
import { detectNightHawkRegionFromLocalSignals } from '#/region-local';
import {
  createNightHawkRegionResolver,
  decideNightHawkRegion,
  type NightHawkRegionAuthRead,
  type NightHawkRegionAuthSnapshot,
} from '#/region-resolver';
import {
  NIGHTHAWK_REGION_MARKER_FILENAME,
  NIGHTHAWK_REGION_PROFILES,
  nighthawkRegionLoginHosts,
  nighthawkRegionProfile,
  nighthawkRegionSchema,
  resolveNightHawkRegion,
  resolveNightHawkRemoteControlAuth,
} from '#/region';

import { createTempWorkDir, type TempDirHandle } from './helpers';

describe('NIGHTHAWK_REGION_PROFILES', () => {
  it('keeps the mainland-cn profile aligned with the shared defaults', () => {
    expect(NIGHTHAWK_REGION_PROFILES['mainland-cn'].oauthHost).toBe(DEFAULT_NIGHTHAWK_OAUTH_HOST);
    expect(NIGHTHAWK_REGION_PROFILES['mainland-cn'].baseUrl).toBe(DEFAULT_NIGHTHAWK_BASE_URL);
    expect(NIGHTHAWK_REGION_PROFILES['mainland-cn'].relayOrigin).toBe('https://code-rc.kimi.com');
  });

  it('nighthawkRegionProfile returns the requested profile', () => {
    expect(nighthawkRegionProfile('global').oauthHost).toBe('https://auth.kimi.ai');
    expect(nighthawkRegionProfile('global').relayOrigin).toBe('https://code-rc.kimi.ai');
    expect(nighthawkRegionProfile('global').telemetryEndpoint).toBe(
      'https://telemetry-logs.kimi.ai/v1/event',
    );
    expect(nighthawkRegionProfile('mainland-cn').telemetryEndpoint).toBe(
      'https://telemetry-logs.kimi.com/v1/event',
    );
    expect(nighthawkRegionProfile('mainland-cn')).toBe(NIGHTHAWK_REGION_PROFILES['mainland-cn']);
  });
});

describe('resolveNightHawkRegion', () => {
  let workDir: TempDirHandle | undefined;

  afterEach(async () => {
    await workDir?.cleanup();
    workDir = undefined;
  });

  async function markerDir(contents?: string): Promise<string> {
    workDir = await createTempWorkDir();
    if (contents !== undefined) {
      await writeFile(join(workDir.path, NIGHTHAWK_REGION_MARKER_FILENAME), contents, 'utf-8');
    }
    return workDir.path;
  }

  it('detects region from consistent local signals and falls back on ambiguity', () => {
    expect(
      detectNightHawkRegionFromLocalSignals({ timeZone: 'Asia/Shanghai', locale: 'zh-Hans-CN' }),
    ).toEqual({ region: 'mainland-cn', confident: true });
    expect(
      detectNightHawkRegionFromLocalSignals({ timeZone: 'America/New_York', locale: 'en-US' }),
    ).toEqual({ region: 'global', confident: true });
    expect(detectNightHawkRegionFromLocalSignals({ timeZone: 'Asia/Taipei', locale: 'zh-Hant-TW' })).toEqual({
      region: 'global',
      confident: true,
    });
    expect(detectNightHawkRegionFromLocalSignals({ timeZone: 'UTC', locale: 'zh-CN' })).toEqual({
      region: 'mainland-cn',
      confident: true,
    });
    expect(detectNightHawkRegionFromLocalSignals({})).toEqual({
      region: 'mainland-cn',
      confident: false,
    });
    expect(
      detectNightHawkRegionFromLocalSignals({ timeZone: 'Asia/Shanghai', locale: 'en-US' }),
    ).toEqual({ region: 'mainland-cn', confident: false });
  });

  it('resolves a known env oauth host, NIGHTHAWK_OAUTH_HOST first', () => {
    expect(resolveNightHawkRegion({ env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.kimi.ai' } })).toBe(
      'global',
    );
    expect(resolveNightHawkRegion({ env: { KIMI_OAUTH_HOST: 'https://auth.kimi.ai' } })).toBe(
      'global',
    );
    expect(
      resolveNightHawkRegion({
        env: {
          NIGHTHAWK_OAUTH_HOST: 'https://auth.kimi.com',
          KIMI_OAUTH_HOST: 'https://auth.kimi.ai',
        },
      }),
    ).toBe('mainland-cn');
  });

  it('treats an unknown env host as a custom environment and falls back to cn', async () => {
    // ...even when the persisted login or marker says otherwise: the custom
    // env overrides every endpoint anyway.
    expect(
      resolveNightHawkRegion({
        env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.internal.example.com' },
        configuredOAuthHost: 'https://auth.kimi.ai',
        homeDir: await markerDir('global\n'),
      }),
    ).toBe('mainland-cn');
  });

  it('resolves the persisted login host, tolerating trailing slashes', () => {
    expect(resolveNightHawkRegion({ env: {}, configuredOAuthHost: 'https://auth.kimi.ai/' })).toBe(
      'global',
    );
    expect(resolveNightHawkRegion({ env: {}, configuredOAuthHost: 'https://auth.kimi.com' })).toBe('mainland-cn');
  });

  it('ignores an unrecognized persisted host and continues down the chain', async () => {
    expect(
      resolveNightHawkRegion({
        env: {},
        configuredOAuthHost: 'https://auth.legacy.example.com',
        homeDir: await markerDir('global'),
      }),
    ).toBe('global');
  });

  it('reads the install-channel marker when nothing else decides', async () => {
    expect(resolveNightHawkRegion({ env: {}, homeDir: await markerDir('global\n') })).toBe('global');
    expect(resolveNightHawkRegion({ env: {}, homeDir: await markerDir('  mainland-cn  ') })).toBe('mainland-cn');
  });

  it('reconciles auth state, persistent cache, and transient fallback', async () => {
    const loggedOut: NightHawkRegionAuthSnapshot = { status: 'logged-out' };
    const loggedInGlobal: NightHawkRegionAuthSnapshot = {
      status: 'logged-in',
      ref: { key: 'global', oauthHost: 'https://auth.kimi.ai' },
    };
    const noSignals = () => ({});
    const nySignals = () => ({ timeZone: 'America/New_York', locale: 'en-US' });
    const globalCacheRecord: NightHawkRegionCacheRecord = {
      version: 1,
      authState: 'logged-out',
      region: 'global',
      source: 'local-signals',
    };

    expect(decideNightHawkRegion({ auth: loggedOut, env: {}, signals: noSignals })).toEqual({
      resolution: { region: 'mainland-cn', source: 'fallback' },
      cacheAction: { kind: 'none' },
    });
    expect(decideNightHawkRegion({ auth: loggedInGlobal, env: {}, signals: noSignals })).toEqual({
      resolution: { region: 'global', source: 'login' },
      cacheAction: { kind: 'clear' },
    });
    expect(
      decideNightHawkRegion({ auth: loggedOut, env: {}, marker: 'global', signals: noSignals }),
    ).toEqual({
      resolution: { region: 'global', source: 'marker' },
      cacheAction: { kind: 'none' },
    });
    expect(
      decideNightHawkRegion({
        auth: loggedOut,
        env: {},
        cacheRecord: globalCacheRecord,
        signals: noSignals,
      }),
    ).toEqual({
      resolution: { region: 'global', source: 'local-signals' },
      cacheAction: { kind: 'none' },
    });
    expect(decideNightHawkRegion({ auth: loggedOut, env: {}, signals: nySignals })).toEqual({
      resolution: { region: 'global', source: 'local-signals' },
      cacheAction: { kind: 'write', region: 'global' },
    });
    expect(
      decideNightHawkRegion({
        auth: loggedInGlobal,
        env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.kimi.com' },
        signals: noSignals,
      }),
    ).toEqual({
      resolution: { region: 'mainland-cn', source: 'env' },
      cacheAction: { kind: 'clear' },
    });

    const dir = await markerDir();
    let auth: NightHawkRegionAuthRead = { status: 'unreadable' };
    let signals: { readonly timeZone?: string; readonly locale?: string } = {
      timeZone: 'America/New_York',
      locale: 'en-US',
    };
    let collections = 0;
    const collectSignals = () => {
      collections += 1;
      return signals;
    };
    const resolver = createNightHawkRegionResolver({
      env: {},
      homeDir: dir,
      readAuth: () => auth,
      collectSignals,
    });
    const markerFile = join(dir, NIGHTHAWK_REGION_MARKER_FILENAME);
    const cacheFile = join(dir, NIGHTHAWK_REGION_CACHE_FILENAME);

    expect(resolver.current()).toEqual({ region: 'mainland-cn', source: 'default' });
    expect(collections).toBe(0);
    await expect(readFile(cacheFile, 'utf-8')).rejects.toThrow();

    await writeFile(markerFile, 'global\n', 'utf-8');
    expect(resolver.current()).toEqual({ region: 'global', source: 'marker' });
    expect(collections).toBe(0);

    await writeFile(markerFile, 'apac', 'utf-8');
    expect(resolver.current()).toEqual({ region: 'mainland-cn', source: 'default' });

    auth = { status: 'logged-out' };
    expect(resolver.current()).toEqual({ region: 'global', source: 'local-signals' });
    expect(collections).toBe(1);
    expect(JSON.parse(await readFile(cacheFile, 'utf-8'))).toMatchObject({
      authState: 'logged-out',
      region: 'global',
      source: 'local-signals',
    });

    signals = { timeZone: 'Asia/Shanghai', locale: 'zh-Hans-CN' };
    expect(resolver.current()).toEqual({ region: 'global', source: 'local-signals' });
    expect(collections).toBe(1);

    await writeFile(markerFile, 'global\n', 'utf-8');
    expect(resolver.current()).toEqual({ region: 'global', source: 'marker' });
    expect(collections).toBe(1);

    await writeFile(markerFile, 'apac', 'utf-8');
    expect(resolver.current()).toEqual({ region: 'global', source: 'local-signals' });
    expect(collections).toBe(1);

    auth = loggedInGlobal;
    expect(resolver.current()).toEqual({ region: 'global', source: 'login' });
    await expect(readFile(cacheFile, 'utf-8')).rejects.toThrow();

    auth = { status: 'logged-in', ref: { key: NIGHTHAWK_OAUTH_KEY } };
    expect(resolver.current()).toEqual({ region: 'mainland-cn', source: 'login' });

    auth = { status: 'logged-out' };
    signals = {};
    expect(resolver.current()).toEqual({ region: 'mainland-cn', source: 'fallback' });
    expect(collections).toBe(2);
    await expect(readFile(cacheFile, 'utf-8')).rejects.toThrow();

    signals = { timeZone: 'America/New_York', locale: 'en-US' };
    expect(resolver.current()).toEqual({ region: 'mainland-cn', source: 'fallback' });
    expect(collections).toBe(2);

    expect(resolver.refresh()).toEqual({ region: 'global', source: 'local-signals' });
    expect(collections).toBe(3);

    await writeFile(cacheFile, '{', 'utf-8');
    expect(resolver.current()).toEqual({ region: 'global', source: 'local-signals' });
    expect(collections).toBe(4);
    expect(JSON.parse(await readFile(cacheFile, 'utf-8'))).toMatchObject({ region: 'global' });

    expect(resolver.current()).toEqual({ region: 'global', source: 'local-signals' });
    expect(collections).toBe(4);

    const noInference = createNightHawkRegionResolver({
      env: {},
      homeDir: dir,
      readAuth: () => auth,
      allowLocalInference: false,
      collectSignals,
    });
    expect(noInference.current()).toEqual({ region: 'mainland-cn', source: 'default' });
    expect(collections).toBe(4);

    const noMarker = createNightHawkRegionResolver({
      env: {},
      homeDir: dir,
      readAuth: () => auth,
      readMarker: false,
      collectSignals,
    });
    expect(noMarker.current()).toEqual({ region: 'mainland-cn', source: 'default' });
    expect(collections).toBe(4);

    const baseUrlEnv = createNightHawkRegionResolver({
      env: { NIGHTHAWK_BASE_URL: 'https://api.example.com/coding/v1' },
      homeDir: dir,
      readAuth: () => auth,
      collectSignals,
    });
    expect(baseUrlEnv.current()).toEqual({ region: 'mainland-cn', source: 'default' });
    expect(collections).toBe(4);

    const envPinned = createNightHawkRegionResolver({
      env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.kimi.ai' },
      homeDir: dir,
      readAuth: () => auth,
    });
    expect(envPinned.current()).toEqual({ region: 'global', source: 'env' });
  });

  it('skips the marker entirely when readMarker is false', async () => {
    expect(
      resolveNightHawkRegion({ env: {}, homeDir: await markerDir('global'), readMarker: false }),
    ).toBe('mainland-cn');
  });

  it('honors NIGHTHAWK_HOME when homeDir is not passed explicitly', async () => {
    const dir = await markerDir('global');
    expect(resolveNightHawkRegion({ env: { NIGHTHAWK_HOME: dir } })).toBe('global');
  });

  it('env beats persisted login beats marker', async () => {
    const dir = await markerDir('global');
    expect(
      resolveNightHawkRegion({
        env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.kimi.com' },
        configuredOAuthHost: 'https://auth.kimi.ai',
        homeDir: dir,
      }),
    ).toBe('mainland-cn');
    expect(
      resolveNightHawkRegion({
        env: {},
        configuredOAuthHost: 'https://auth.kimi.ai',
        homeDir: dir,
      }),
    ).toBe('global');
  });

  it('treats the persisted default-slot key as explicit mainland-cn, beating the marker', async () => {
    const dir = await markerDir('global');
    expect(
      resolveNightHawkRegion({ env: {}, configuredOAuthKey: NIGHTHAWK_OAUTH_KEY, homeDir: dir }),
    ).toBe('mainland-cn');
  });

  it('still follows the marker when no key or host is persisted', async () => {
    expect(resolveNightHawkRegion({ env: {}, homeDir: await markerDir('global') })).toBe('global');
  });

  it('lets an unknown scoped key fall through to the marker', async () => {
    const dir = await markerDir('global');
    const key = 'oauth/nighthawk-env-0123456789abcdef';
    expect(
      resolveNightHawkRegion({
        env: {},
        configuredOAuthKey: key,
        homeDir: dir,
      }),
    ).toBe('global');
    expect(resolveNightHawkRemoteControlAuth({ env: {}, configuredOAuthKey: key, homeDir: dir })).toEqual({
      region: 'global',
      oauthKey: key,
      relayOrigin: 'https://code-rc.kimi.com',
    });
  });

  it('resolves a recognized persisted host before consulting the key', () => {
    expect(
      resolveNightHawkRegion({
        env: {},
        configuredOAuthHost: 'https://auth.kimi.ai',
        configuredOAuthKey: NIGHTHAWK_OAUTH_KEY,
      }),
    ).toBe('global');
    expect(
      resolveNightHawkRemoteControlAuth({
        env: {},
        configuredOAuthHost: 'https://auth.kimi.ai',
        configuredOAuthKey: 'oauth/nighthawk-env-0123456789abcdef',
      }).relayOrigin,
    ).toBe('https://code-rc.kimi.ai');
  });
});

describe('nighthawkRegionLoginHosts', () => {
  it('returns both profile hosts, mainland-cn included (explicit beats stale config)', () => {
    expect(nighthawkRegionLoginHosts('mainland-cn', {})).toEqual({
      oauthHost: 'https://auth.kimi.com',
      baseUrl: 'https://api.kimi.com/coding/v1',
    });
    expect(nighthawkRegionLoginHosts('global', {})).toEqual({
      oauthHost: 'https://auth.kimi.ai',
      baseUrl: 'https://api.kimi.ai/coding/v1',
    });
  });

  it('yields to env overrides', () => {
    expect(nighthawkRegionLoginHosts('global', { NIGHTHAWK_OAUTH_HOST: 'https://auth.x.com' })).toBe(
      undefined,
    );
    expect(nighthawkRegionLoginHosts('global', { NIGHTHAWK_OAUTH_HOST: 'https://auth.x.com' })).toBe(
      undefined,
    );
    expect(
      nighthawkRegionLoginHosts('global', { NIGHTHAWK_BASE_URL: 'https://api.x.com/coding/v1' }),
    ).toBe(undefined);
  });
});

describe('nighthawkRegionSchema', () => {
  it('parses valid regions and rejects others', () => {
    expect(nighthawkRegionSchema.parse('mainland-cn')).toBe('mainland-cn');
    expect(nighthawkRegionSchema.parse('global')).toBe('global');
    expect(nighthawkRegionSchema.safeParse('apac').success).toBe(false);
  });
});
