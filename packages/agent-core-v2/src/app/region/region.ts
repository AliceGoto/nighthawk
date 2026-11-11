import type { NightHawkRegion, NightHawkRegionResolution } from '@nighthawk/nighthawk-oauth';

import { createDecorator, type ServiceIdentifier } from '#/_base/di/instantiation';

export interface IRegionService {
  readonly _serviceBrand: undefined;

  current(): NightHawkRegionResolution;
  getRegionAsync(): Promise<NightHawkRegion>;
}

export const IRegionService: ServiceIdentifier<IRegionService> =
  createDecorator<IRegionService>('regionService');
