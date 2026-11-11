import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ensureNightHawkHome, resolveConfigPath, resolveNightHawkHome } from '#/app/bootstrap/bootstrap';

describe('bootstrap path helpers', () => {
  describe('resolveNightHawkHome', () => {
    it('uses explicit homeDir when provided', () => {
      expect(resolveNightHawkHome('/tmp/nighthawk')).toBe('/tmp/nighthawk');
    });

    it('falls back to NIGHTHAWK_HOME env', () => {
      const prev = process.env['NIGHTHAWK_HOME'];
      process.env['NIGHTHAWK_HOME'] = '/env/nighthawk';
      try {
        expect(resolveNightHawkHome()).toBe('/env/nighthawk');
      } finally {
        if (prev === undefined) delete process.env['NIGHTHAWK_HOME'];
        else process.env['NIGHTHAWK_HOME'] = prev;
      }
    });
  });

  describe('resolveConfigPath', () => {
    it('uses explicit configPath when provided', () => {
      expect(resolveConfigPath({ configPath: '/x/config.toml' })).toBe('/x/config.toml');
    });

    it('joins homeDir with config.toml', () => {
      expect(resolveConfigPath({ homeDir: '/tmp/nighthawk' })).toBe('/tmp/nighthawk/config.toml');
    });
  });

  describe('ensureNightHawkHome', () => {
    let dir: string | undefined;
    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
    });

    it('creates the directory with 0700 permissions', () => {
      dir = join(mkdtempSync(join(tmpdir(), 'nighthawk-home-')), 'nested');
      ensureNightHawkHome(dir);
      expect(existsSync(dir)).toBe(true);
    });
  });
});
