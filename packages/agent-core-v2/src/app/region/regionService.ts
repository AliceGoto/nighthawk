import {
  createNightHawkRegionResolver,
  NIGHTHAWK_PROVIDER_NAME,
  type NightHawkRegion,
  type NightHawkRegionResolution,
} from '@nighthawk/nighthawk-oauth';

import { Disposable } from '#/_base/di/lifecycle';
import { ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { IBootstrapService } from '#/app/bootstrap/bootstrap';
import { LifecycleScope } from '#/app/scopes';
import { IProviderService } from '#/llm-adapter/provider/provider';

import { IRegionService } from './region';

export function nighthawkRegionEnv(bootstrap: IBootstrapService): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const oauthHost = bootstrap.getEnv('NIGHTHAWK_OAUTH_HOST');
  const legacyOAuthHost = bootstrap.getEnv('KIMI_OAUTH_HOST');
  const baseUrl = bootstrap.getEnv('NIGHTHAWK_BASE_URL');
  if (oauthHost !== undefined) env['NIGHTHAWK_OAUTH_HOST'] = oauthHost;
  if (legacyOAuthHost !== undefined) env['KIMI_OAUTH_HOST'] = legacyOAuthHost;
  if (oauthHost === undefined && legacyOAuthHost !== undefined) {
    delete env['NIGHTHAWK_OAUTH_HOST'];
  }
  if (baseUrl !== undefined) env['NIGHTHAWK_BASE_URL'] = baseUrl;
  return env;
}

export class RegionService extends Disposable implements IRegionService {
  declare readonly _serviceBrand: undefined;

  private readonly resolver: ReturnType<typeof createNightHawkRegionResolver>;
  private providerHydrated = false;

  constructor(
    @IProviderService private readonly providers: IProviderService,
    @IBootstrapService bootstrap: IBootstrapService,
  ) {
    super();
    this.resolver = createNightHawkRegionResolver({
      homeDir: bootstrap.homeDir,
      env: nighthawkRegionEnv(bootstrap),
      readMarker:
        (bootstrap.getEnv('NIGHTHAWK_REGION_MARKER') ??
          process.env['NIGHTHAWK_REGION_MARKER']) !== 'off',
      readAuth: () => {
        if (!this.providerHydrated) return { status: 'unreadable' };
        const ref = this.providers.get(NIGHTHAWK_PROVIDER_NAME)?.oauth;
        return ref === undefined ? { status: 'logged-out' } : { status: 'logged-in', ref };
      },
    });
    void this.providers.ready.then(
      () => {
        this.providerHydrated = true;
      },
      () => {
        this.providerHydrated = false;
      },
    );
  }

  current(): NightHawkRegionResolution {
    return this.resolver.current();
  }

  async getRegionAsync(): Promise<NightHawkRegion> {
    await this.providers.ready.catch(() => undefined);
    return this.resolver.current().region;
  }
}

registerScopedService(
  LifecycleScope.App,
  IRegionService,
  RegionService,
  ScopeActivation.OnScopeCreated,
  'region',
);
