import {
  loadRuntimeConfigSafe,
  resolveConfigPath,
  resolveNightHawkHome,
} from '@nighthawk/nighthawk-sdk';
import {
  createNightHawkRegionResolver,
  NIGHTHAWK_OAUTH_KEY,
  NIGHTHAWK_REGION_PROFILES,
  resolveNightHawkRuntimeAuth,
  type NightHawkRegion,
  type ManagedNightHawkRuntimeAuth,
  type NightHawkRegionAuthRead,
  type NightHawkRegionProfile,
  type NightHawkRegionResolution,
  type NightHawkRegionResolver,
} from '@nighthawk/nighthawk-oauth';

const MANAGED_NIGHTHAWK_PROVIDER_KEY = 'managed:nighthawk';

export const NIGHTHAWK_GLOBAL_PLATFORM_VALUE = 'nighthawk-global';

export interface PersistedNightHawkOAuthRef {
  readonly key: string;
  readonly oauthHost?: string;
}

export function persistedNightHawkOAuthRef(): PersistedNightHawkOAuthRef | undefined {
  const result = loadRuntimeConfigSafe(resolveConfigPath({}));
  const oauth = result.config.providers?.[MANAGED_NIGHTHAWK_PROVIDER_KEY]?.oauth;
  if (oauth === undefined) return undefined;
  return { key: oauth.key, oauthHost: oauth.oauthHost };
}

export function currentNightHawkManagedRuntimeAuth(): ManagedNightHawkRuntimeAuth {
  const config = loadRuntimeConfigSafe(resolveConfigPath({})).config;
  const provider = config.providers?.[MANAGED_NIGHTHAWK_PROVIDER_KEY];
  return resolveNightHawkRuntimeAuth({
    configuredBaseUrl: provider?.baseUrl,
    configuredOAuthRef: provider?.oauth,
  });
}

function readAuth(): NightHawkRegionAuthRead {
  try {
    const result = loadRuntimeConfigSafe(resolveConfigPath({}));
    if (result.fileError !== undefined) return { status: 'unreadable' };
    const ref = result.config.providers?.[MANAGED_NIGHTHAWK_PROVIDER_KEY]?.oauth;
    return ref === undefined ? { status: 'logged-out' } : { status: 'logged-in', ref };
  } catch {
    return { status: 'unreadable' };
  }
}

let resolver: NightHawkRegionResolver | undefined;

function regionResolver(): NightHawkRegionResolver {
  resolver ??= createNightHawkRegionResolver({
    homeDir: resolveNightHawkHome(),
    readAuth,
    authFilePath: resolveConfigPath({}),
    readMarker: process.env['NIGHTHAWK_REGION_MARKER'] !== 'off',
  });
  return resolver;
}

export function regionForBareLogin(ref: PersistedNightHawkOAuthRef | undefined): NightHawkRegion | undefined {
  if (ref === undefined) return currentNightHawkRegion();
  return ref.key === NIGHTHAWK_OAUTH_KEY ? 'mainland-cn' : undefined;
}

export function currentNightHawkRegionResolution(): NightHawkRegionResolution {
  return regionResolver().current();
}

export function resolveNightHawkRegionFresh(): NightHawkRegionResolution {
  return regionResolver().refresh();
}

export function currentNightHawkRegion(): NightHawkRegion {
  return currentNightHawkRegionResolution().region;
}

export function currentNightHawkProfile(): NightHawkRegionProfile {
  return NIGHTHAWK_REGION_PROFILES[currentNightHawkRegion()];
}

export function freshNightHawkProfile(): NightHawkRegionProfile {
  return NIGHTHAWK_REGION_PROFILES[resolveNightHawkRegionFresh().region];
}

export function refreshNightHawkRegion(): NightHawkRegion {
  return resolveNightHawkRegionFresh().region;
}

export function resetNightHawkRegionCache(): void {
  resolver = undefined;
}
