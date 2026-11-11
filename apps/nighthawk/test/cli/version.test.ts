import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createNightHawkUserAgent } from '#/cli/host-identity';
import { getHostPackageJsonPath, getHostPackageRoot, getVersion } from '#/cli/version';

describe('cli version helpers', () => {
  it('resolves the host package manifest near apps/nighthawk and reads its version', () => {
    const pkgPath = getHostPackageJsonPath();
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

    expect(pkgPath.endsWith(join('apps', 'nighthawk', 'package.json'))).toBe(true);
    expect(getHostPackageRoot()).toBe(dirname(pkgPath));
    expect(getVersion()).toBe(pkg.version);
  });

  it('builds the product user-agent for ad-hoc fetches', () => {
    expect(createNightHawkUserAgent('1.2.3')).toBe('nighthawk-cli/1.2.3');
  });
});
