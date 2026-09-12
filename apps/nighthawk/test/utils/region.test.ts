import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { currentNighthawkRegion, refreshNighthawkRegion, regionForBareLogin } from '#/utils/region';

const originalEnv = { ...process.env };

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'nighthawk-region-test-'));
  process.env['NIGHTHAWK_HOME'] = home;
  delete process.env['NIGHTHAWK_OAUTH_HOST'];
  delete process.env['NIGHTHAWK_OAUTH_HOST'];
  delete process.env['NIGHTHAWK_REGION_MARKER'];
  refreshNighthawkRegion();
});

afterEach(() => {
  process.env = { ...originalEnv };
  refreshNighthawkRegion();
  rmSync(home, { recursive: true, force: true });
});

describe('currentNighthawkRegion', () => {
  it('follows the install-channel marker before the first login', () => {
    writeFileSync(join(home, 'region'), 'global\n');
    expect(refreshNighthawkRegion()).toBe('global');
    expect(currentNighthawkRegion()).toBe('global');
  });

  it('ignores the marker when NIGHTHAWK_REGION_MARKER=off (embedded server)', () => {
    writeFileSync(join(home, 'region'), 'global\n');
    process.env['NIGHTHAWK_REGION_MARKER'] = 'off';
    expect(refreshNighthawkRegion()).toBe('mainland-cn');
  });

  it('still honors a persisted global login when the marker is opted out', () => {
    writeFileSync(join(home, 'region'), 'global\n');
    writeFileSync(
      join(home, 'config.toml'),
      [
        '[providers."managed:nighthawk"]',
        'type = "nighthawk"',
        '',
        '[providers."managed:nighthawk".oauth]',
        'storage = "file"',
        'key = "oauth/nighthawk-env-0123456789abcdef"',
        'oauthHost = "https://auth.nighthawk.ai"',
        '',
      ].join('\n'),
    );
    process.env['NIGHTHAWK_REGION_MARKER'] = 'off';
    expect(refreshNighthawkRegion()).toBe('global');
  });
});

describe('regionForBareLogin', () => {
  it('follows the resolved region for a fresh install (no persisted ref)', () => {
    expect(regionForBareLogin(undefined)).toBe('mainland-cn');
    writeFileSync(join(home, 'region'), 'global\n');
    refreshNighthawkRegion();
    expect(regionForBareLogin(undefined)).toBe('global');
  });

  it('re-pins mainland-cn for the default slot', () => {
    expect(regionForBareLogin({ key: 'oauth/nighthawk' })).toBe('mainland-cn');
  });

  it('keeps the configured environment for a scoped slot without a persisted host', () => {
    expect(regionForBareLogin({ key: 'oauth/nighthawk-env-0123456789abcdef' })).toBeUndefined();
  });

  it('keeps the persisted environment for a global login', () => {
    expect(
      regionForBareLogin({
        key: 'oauth/nighthawk-env-0123456789abcdef',
        oauthHost: 'https://auth.nighthawk.ai',
      }),
    ).toBeUndefined();
  });
});
