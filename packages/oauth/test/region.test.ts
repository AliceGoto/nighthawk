import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_NIGHTHAWK_OAUTH_HOST } from '#/constants';
import { NIGHTHAWK_OAUTH_KEY } from '#/managed-nighthawk';
import { DEFAULT_NIGHTHAWK_BASE_URL } from '#/managed-usage';
import {
  NIGHTHAWK_REGION_MARKER_FILENAME,
  NIGHTHAWK_REGION_PROFILES,
  nighthawkRegionLoginHosts,
  nighthawkRegionProfile,
  nighthawkRegionSchema,
  nighthawkTelemetryEndpoint,
  resolveNighthawkRegion,
} from '#/region';

import { createTempWorkDir, type TempDirHandle } from './helpers';

describe('NIGHTHAWK_REGION_PROFILES', () => {
  it('keeps the mainland-cn profile aligned with the shared defaults', () => {
    expect(NIGHTHAWK_REGION_PROFILES['mainland-cn'].oauthHost).toBe(DEFAULT_NIGHTHAWK_OAUTH_HOST);
    expect(NIGHTHAWK_REGION_PROFILES['mainland-cn'].baseUrl).toBe(DEFAULT_NIGHTHAWK_BASE_URL);
  });

  it('nighthawkRegionProfile returns the requested profile', () => {
    expect(nighthawkRegionProfile('global', {}).oauthHost).toBe('https://auth.nighthawk.ai');
    expect(nighthawkRegionProfile('mainland-cn', {})).toBe(NIGHTHAWK_REGION_PROFILES['mainland-cn']);
  });

  it('applies NIGHTHAWK_CDN_BASE and NIGHTHAWK_SITE_BASE overrides', () => {
    const profile = nighthawkRegionProfile('global', {
      NIGHTHAWK_CDN_BASE: 'https://mirror.example.test/nighthawk',
      NIGHTHAWK_SITE_BASE: 'https://site.example.test',
    });
    expect(profile.cdnBase).toBe('https://mirror.example.test/nighthawk');
    expect(profile.siteBase).toBe('https://site.example.test');
    expect(profile.oauthHost).toBe(NIGHTHAWK_REGION_PROFILES.global.oauthHost);
    expect(profile.baseUrl).toBe(NIGHTHAWK_REGION_PROFILES.global.baseUrl);
  });

  it('ignores blank env overrides and returns the static profile untouched', () => {
    expect(nighthawkRegionProfile('global', { NIGHTHAWK_CDN_BASE: '   ' })).toBe(
      NIGHTHAWK_REGION_PROFILES.global,
    );
    expect(nighthawkRegionProfile('mainland-cn', { NIGHTHAWK_SITE_BASE: '' })).toBe(
      NIGHTHAWK_REGION_PROFILES['mainland-cn'],
    );
  });
});

describe('nighthawkTelemetryEndpoint', () => {
  it('reads NIGHTHAWK_TELEMETRY_ENDPOINT when it trims to non-empty', () => {
    expect(
      nighthawkTelemetryEndpoint({
        NIGHTHAWK_TELEMETRY_ENDPOINT: 'https://telemetry.example.test/v1/event',
      }),
    ).toBe('https://telemetry.example.test/v1/event');
    expect(
      nighthawkTelemetryEndpoint({
        NIGHTHAWK_TELEMETRY_ENDPOINT: '  https://telemetry.example.test/v1/event  ',
      }),
    ).toBe('https://telemetry.example.test/v1/event');
  });

  it('is undefined without the env or when it is blank', () => {
    expect(nighthawkTelemetryEndpoint({})).toBeUndefined();
    expect(nighthawkTelemetryEndpoint({ NIGHTHAWK_TELEMETRY_ENDPOINT: '' })).toBeUndefined();
    expect(nighthawkTelemetryEndpoint({ NIGHTHAWK_TELEMETRY_ENDPOINT: '   ' })).toBeUndefined();
  });
});

describe('resolveNighthawkRegion', () => {
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

  it('defaults to mainland-cn when nothing points anywhere', async () => {
    expect(resolveNighthawkRegion({ env: {}, homeDir: await markerDir() })).toBe('mainland-cn');
  });

  it('resolves a known env oauth host, NIGHTHAWK_OAUTH_HOST first', () => {
    expect(resolveNighthawkRegion({ env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.nighthawk.ai' } })).toBe(
      'global',
    );
    expect(resolveNighthawkRegion({ env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.nighthawk.com' } })).toBe(
      'mainland-cn',
    );
  });

  it('treats an unknown env host as a custom environment and falls back to cn', async () => {
    // ...even when the persisted login or marker says otherwise: the custom
    // env overrides every endpoint anyway.
    expect(
      resolveNighthawkRegion({
        env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.internal.example.com' },
        configuredOAuthHost: 'https://auth.nighthawk.ai',
        homeDir: await markerDir('global\n'),
      }),
    ).toBe('mainland-cn');
  });

  it('resolves the persisted login host, tolerating trailing slashes', () => {
    expect(resolveNighthawkRegion({ env: {}, configuredOAuthHost: 'https://auth.nighthawk.ai/' })).toBe(
      'global',
    );
    expect(resolveNighthawkRegion({ env: {}, configuredOAuthHost: 'https://auth.nighthawk.com' })).toBe('mainland-cn');
  });

  it('ignores an unrecognized persisted host and continues down the chain', async () => {
    expect(
      resolveNighthawkRegion({
        env: {},
        configuredOAuthHost: 'https://auth.legacy.example.com',
        homeDir: await markerDir('global'),
      }),
    ).toBe('global');
  });

  it('reads the install-channel marker when nothing else decides', async () => {
    expect(resolveNighthawkRegion({ env: {}, homeDir: await markerDir('global\n') })).toBe('global');
    expect(resolveNighthawkRegion({ env: {}, homeDir: await markerDir('  mainland-cn  ') })).toBe('mainland-cn');
  });

  it('ignores a malformed or missing marker', async () => {
    expect(resolveNighthawkRegion({ env: {}, homeDir: await markerDir('apac') })).toBe('mainland-cn');
    expect(resolveNighthawkRegion({ env: {}, homeDir: await markerDir('') })).toBe('mainland-cn');
  });

  it('skips the marker entirely when readMarker is false', async () => {
    expect(
      resolveNighthawkRegion({ env: {}, homeDir: await markerDir('global'), readMarker: false }),
    ).toBe('mainland-cn');
  });

  it('honors NIGHTHAWK_HOME when homeDir is not passed explicitly', async () => {
    const dir = await markerDir('global');
    expect(resolveNighthawkRegion({ env: { NIGHTHAWK_HOME: dir } })).toBe('global');
  });

  it('env beats persisted login beats marker', async () => {
    const dir = await markerDir('global');
    expect(
      resolveNighthawkRegion({
        env: { NIGHTHAWK_OAUTH_HOST: 'https://auth.nighthawk.com' },
        configuredOAuthHost: 'https://auth.nighthawk.ai',
        homeDir: dir,
      }),
    ).toBe('mainland-cn');
    expect(
      resolveNighthawkRegion({
        env: {},
        configuredOAuthHost: 'https://auth.nighthawk.ai',
        homeDir: dir,
      }),
    ).toBe('global');
  });

  it('treats the persisted default-slot key as explicit mainland-cn, beating the marker', async () => {
    const dir = await markerDir('global');
    expect(
      resolveNighthawkRegion({ env: {}, configuredOAuthKey: NIGHTHAWK_OAUTH_KEY, homeDir: dir }),
    ).toBe('mainland-cn');
  });

  it('still follows the marker when no key or host is persisted', async () => {
    expect(resolveNighthawkRegion({ env: {}, homeDir: await markerDir('global') })).toBe('global');
  });

  it('lets an unknown scoped key fall through to the marker', async () => {
    const dir = await markerDir('global');
    expect(
      resolveNighthawkRegion({
        env: {},
        configuredOAuthKey: 'oauth/nighthawk-env-0123456789abcdef',
        homeDir: dir,
      }),
    ).toBe('global');
  });

  it('resolves a recognized persisted host before consulting the key', () => {
    expect(
      resolveNighthawkRegion({
        env: {},
        configuredOAuthHost: 'https://auth.nighthawk.ai',
        configuredOAuthKey: NIGHTHAWK_OAUTH_KEY,
      }),
    ).toBe('global');
  });
});

describe('nighthawkRegionLoginHosts', () => {
  it('returns both profile hosts, mainland-cn included (explicit beats stale config)', () => {
    expect(nighthawkRegionLoginHosts('mainland-cn', {})).toEqual({
      oauthHost: 'https://auth.nighthawk.com',
      baseUrl: 'https://api.nighthawk.com/v1',
    });
    expect(nighthawkRegionLoginHosts('global', {})).toEqual({
      oauthHost: 'https://auth.nighthawk.ai',
      baseUrl: 'https://api.nighthawk.com/v1',
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
