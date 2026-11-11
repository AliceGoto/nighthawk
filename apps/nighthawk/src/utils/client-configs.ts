import { join } from 'node:path';

import { ClientConfigClient } from '@nighthawk/nighthawk-product/client-configs/node';

import { getCacheDir } from '#/utils/paths';
import { currentNightHawkRegion } from '#/utils/region';

export const clientConfigs = new ClientConfigClient({
  region: currentNightHawkRegion,
  baseUrlOverride: () => process.env['NIGHTHAWK_BASE_URL'],
  cacheDir: () => join(getCacheDir(), 'client-configs'),
});
