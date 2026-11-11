import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { resolveLegacySourceHome, sameLegacyPath } from '#/migration/legacy-source';

const HOME = '/home/user';
const CWD = '/work/project';

describe('resolveLegacySourceHome', () => {
  it('defaults to ~/.kimi when NIGHTHAWK_SHARE_DIR is unset', () => {
    const r = resolveLegacySourceHome({}, HOME, CWD);
    expect(r).toEqual({ sourceHome: join(HOME, '.kimi'), origin: 'default' });
  });

  it('defaults to ~/.kimi when NIGHTHAWK_SHARE_DIR is empty or blank', () => {
    expect(resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: '' }, HOME, CWD).origin).toBe('default');
    expect(resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: '   ' }, HOME, CWD).origin).toBe('default');
  });

  it('uses an absolute NIGHTHAWK_SHARE_DIR verbatim', () => {
    const r = resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: '/data/nighthawk' }, HOME, CWD);
    expect(r.sourceHome).toBe('/data/nighthawk');
    expect(r.origin).toBe('share-dir');
  });

  it('resolves a relative NIGHTHAWK_SHARE_DIR against the process CWD (old-CLI rule)', () => {
    const r = resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: 'relative/nighthawk' }, HOME, CWD);
    expect(r.sourceHome).toBe(join(CWD, 'relative', 'nighthawk'));
    expect(r.origin).toBe('share-dir');
  });

  it('does not expand ~ in NIGHTHAWK_SHARE_DIR (old-CLI rule)', () => {
    const r = resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: '~/custom' }, HOME, CWD);
    expect(r.sourceHome).toBe(join(CWD, '~/custom'));
  });

  it('resolves skills from ~/.kimi when the share dir is redirected', () => {
    const r = resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: '/data/nighthawk' }, HOME, CWD);
    expect(r.skillsSourceHome).toBe(join(HOME, '.kimi'));
  });

  it('keeps a single source when NIGHTHAWK_SHARE_DIR points at ~/.kimi itself', () => {
    const r = resolveLegacySourceHome({ NIGHTHAWK_SHARE_DIR: join(HOME, '.kimi') }, HOME, CWD);
    expect(r.skillsSourceHome).toBeUndefined();
  });
});

describe('sameLegacyPath', () => {
  it('matches identical and redundant forms', () => {
    expect(sameLegacyPath('/a/b', '/a/b')).toBe(true);
    expect(sameLegacyPath('/a/b/', '/a/b')).toBe(true);
    expect(sameLegacyPath('/a/./b', '/a/b')).toBe(true);
  });

  it('rejects different paths', () => {
    expect(sameLegacyPath('/a/b', '/a/c')).toBe(false);
  });
});
