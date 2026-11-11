import type { NightHawkRegion } from '@nighthawk/nighthawk-oauth';

import type { IPluginService } from '#/app/plugin/plugin';
import type { IPluginMarketplaceService } from '#/app/plugin/marketplaceService';
import type { IHostProcessService } from '#/os/interface/hostProcess';

export interface CapabilityEntryContext {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly nighthawkHomeDir: string;
  readonly userHomeDir: string;
  readonly plugins: IPluginService;
  readonly marketplace: IPluginMarketplaceService;
  readonly hostProcess: IHostProcessService;
  readonly fetchImpl?: typeof fetch;
  readonly applicationsDir?: string;
  readonly webbridgeBaseUrl?: string;
  readonly detectProbeTimeoutMs?: number;
  readonly commandTimeoutMs?: number;
  readonly resolveRegion?: () => NightHawkRegion | Promise<NightHawkRegion>;
}
