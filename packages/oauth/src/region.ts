/**
 * Region profiles for the mainland-China (.com) and global (.ai)
 * NightHawk deployments, plus the resolver that decides which region a
 * client belongs to.
 *
 * A region is a bundle of endpoints (OAuth host, managed API base URL, CDN,
 * site, Remote Control relay, and telemetry when that region's collector is
 * live). The OAuth client_id is shared across regions and stays in
 * `./constants`.
 *
 * Resolution order (first match wins):
 *   1. env override (`NIGHTHAWK_OAUTH_HOST` / `KIMI_OAUTH_HOST`)
 *   2. persisted login (the `oauthHost` stored in config.toml's oauth ref)
 *   3. persisted default-slot login (the oauth ref's key equals
 *      `NIGHTHAWK_OAUTH_KEY` — a mainland-China login persists no
 *      `oauthHost`, so the default slot's presence is an explicit-mainland-cn
 *      signal that outranks the marker)
 *   4. install-channel marker file (`<home>/region`, written by install
 *      scripts; consultable only before the first login)
 *   5. default 'mainland-cn'
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { z } from 'zod';

import { DEFAULT_NIGHTHAWK_OAUTH_HOST } from './constants';
import { DEFAULT_NIGHTHAWK_BASE_URL } from './managed-usage';
import {
  nighthawkCodeEnvBaseUrl,
  nighthawkCodeEnvOAuthHost,
  NIGHTHAWK_OAUTH_KEY,
  resolveNightHawkOAuthRef,
} from './managed-kimi-code';

export type NightHawkRegion = 'mainland-cn' | 'global';

/** Zod schema for the wire/domain contract; parses to {@link NightHawkRegion}. */
export const nighthawkRegionSchema = z.enum(['mainland-cn', 'global']);

export interface NightHawkRegionProfile {
  /** OAuth host the device flow talks to (authorize/token derive from it). */
  readonly oauthHost: string;
  /** Managed API base (`/coding/v1`): usages, userinfo, models, feedback... */
  readonly baseUrl: string;
  /** Update/install/plugin-marketplace root. */
  readonly cdnBase: string;
  /** Official site root (docs, console, signup, upgrade pages). */
  readonly siteBase: string;
  /**
   * Cloud telemetry collector. Absent when that collector is not live; callers
   * must skip the send instead of falling back to another region's host.
   */
  readonly telemetryEndpoint?: string;
  /** Remote Control relay origin (`nighthawk rc` / `/web` public URL). */
  readonly relayOrigin: string;
}

export const NIGHTHAWK_REGION_PROFILES: Record<NightHawkRegion, NightHawkRegionProfile> = {
  'mainland-cn': {
    oauthHost: DEFAULT_NIGHTHAWK_OAUTH_HOST,
    baseUrl: DEFAULT_NIGHTHAWK_BASE_URL,
    cdnBase: 'https://code.kimi.com/kimi-code',
    siteBase: 'https://www.kimi.com',
    telemetryEndpoint: 'https://telemetry-logs.kimi.com/v1/event',
    relayOrigin: 'https://code-rc.kimi.com',
  },
  global: {
    oauthHost: 'https://auth.kimi.ai',
    baseUrl: 'https://api.kimi.ai/coding/v1',
    cdnBase: 'https://code.kimi.ai/kimi-code',
    siteBase: 'https://www.kimi.ai',
    telemetryEndpoint: 'https://telemetry-logs.kimi.ai/v1/event',
    relayOrigin: 'https://code-rc.kimi.ai',
  },
};

export function nighthawkRegionProfile(region: NightHawkRegion): NightHawkRegionProfile {
  return NIGHTHAWK_REGION_PROFILES[region];
}

/**
 * Content-CDN URL builder (tips banner, WebBridge / Computer-Use binaries).
 * International mirror coverage of cdn.kimi.ai for these payloads is still
 * being confirmed, so both regions currently share the .com host — funnel
 * every content URL through here so flipping later touches one function.
 */
export function nighthawkCdnContentUrl(path: string): string {
  return `https://cdn.kimi.com/${path.replace(/^\/+/, '')}`;
}

/**
 * Login hosts for an explicit region choice, or `undefined` when an env
 * override (`NIGHTHAWK_OAUTH_HOST` / `KIMI_OAUTH_HOST` / `NIGHTHAWK_BASE_URL`)
 * is in play — env keeps full control of endpoints, so a region pick must not
 * smuggle profile hosts past it (requested hosts outrank env in
 * `resolveNightHawkLoginAuth`).
 *
 * When returned, both hosts are always set — including for 'mainland-cn',
 * whose values equal the defaults. Passing them explicitly is what lets
 * "switch back to mainland China" override a previously persisted global
 * login in config.toml.
 */
export function nighthawkRegionLoginHosts(
  region: NightHawkRegion,
  env: NodeJS.ProcessEnv = process.env,
): { readonly oauthHost: string; readonly baseUrl: string } | undefined {
  if (nighthawkCodeEnvOAuthHost(env) !== undefined || nighthawkCodeEnvBaseUrl(env) !== undefined) {
    return undefined;
  }
  const profile = nighthawkRegionProfile(region);
  return { oauthHost: profile.oauthHost, baseUrl: profile.baseUrl };
}

/**
 * Marker file name under the NightHawk home dir. Install scripts write a single
 * line (`mainland-cn` or `global`) here so a fresh client can default to the
 * region matching the channel it was installed from. It is only consulted
 * while the user has never logged in; a persisted login (config.toml) always
 * wins.
 */
export const NIGHTHAWK_REGION_MARKER_FILENAME = 'region';

export interface ResolveNightHawkRegionOptions {
  /** Defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv;
  /** The `oauthHost` persisted in config.toml's oauth ref, if any. */
  readonly configuredOAuthHost?: string;
  /**
   * The credential key persisted in config.toml's oauth ref, if any. The
   * default slot ({@link NIGHTHAWK_OAUTH_KEY}) only ever holds a
   * mainland-China login — mainland-cn persists no `oauthHost` — so its
   * presence is an explicit-mainland-cn signal that outranks the
   * install-channel marker.
   */
  readonly configuredOAuthKey?: string;
  /** NightHawk home dir; defaults to `NIGHTHAWK_HOME` or `~/.nighthawk`. */
  readonly homeDir?: string;
  /**
   * Set false to skip the install-channel marker (e.g. the desktop app's
   * embedded server, which is not installed through a channel script and
   * leaves the region choice entirely to the login UI).
   */
  readonly readMarker?: boolean;
}

function normalizeHost(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function regionForOAuthHost(oauthHost: string): NightHawkRegion | undefined {
  const normalized = normalizeHost(oauthHost);
  for (const region of Object.keys(NIGHTHAWK_REGION_PROFILES) as NightHawkRegion[]) {
    if (normalizeHost(NIGHTHAWK_REGION_PROFILES[region].oauthHost) === normalized) return region;
  }
  return undefined;
}

export function readNightHawkRegionMarker(homeDir: string): NightHawkRegion | undefined {
  let raw: string;
  try {
    raw = readFileSync(join(homeDir, NIGHTHAWK_REGION_MARKER_FILENAME), 'utf-8');
  } catch {
    return undefined;
  }
  const value = raw.trim();
  return value === 'mainland-cn' || value === 'global' ? value : undefined;
}

// Mirrors `defaultNightHawkHome` in ./toolkit; keep the two in sync so the marker
// always lands next to the credentials dir it describes.
function defaultHomeDir(env: NodeJS.ProcessEnv): string {
  const override = env['NIGHTHAWK_HOME'];
  if (override !== undefined && override.length > 0) return override;
  return join(homedir(), '.nighthawk');
}

export type NightHawkRegionSource =
  | 'env'
  | 'login'
  | 'marker'
  | 'local-signals'
  | 'fallback'
  | 'default';

export interface NightHawkRegionResolution {
  readonly region: NightHawkRegion;
  readonly source: NightHawkRegionSource;
}

export interface ResolveNightHawkRegionParts {
  /** Defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv;
  /** The `oauthHost` persisted in config.toml's oauth ref, if any. */
  readonly configuredOAuthHost?: string;
  /** The credential key persisted in config.toml's oauth ref, if any. */
  readonly configuredOAuthKey?: string;
  /** The install-channel marker value already read from `<home>/region`. */
  readonly marker?: NightHawkRegion;
}

/**
 * The env → login → marker → default resolution prefix as a pure function:
 * every input arrives as a value, so callers that read files themselves
 * (the stat-gated resolver) share exactly this chain with the I/O wrapper
 * {@link resolveNightHawkRegionDetailed}.
 */
export function resolveNightHawkRegionFromParts(
  parts: ResolveNightHawkRegionParts,
): NightHawkRegionResolution {
  const env = parts.env ?? process.env;
  const envHost = env['NIGHTHAWK_OAUTH_HOST'] ?? env['KIMI_OAUTH_HOST'];
  if (envHost !== undefined && envHost.length > 0) {
    return { region: regionForOAuthHost(envHost) ?? 'mainland-cn', source: 'env' };
  }
  const configured = parts.configuredOAuthHost;
  if (configured !== undefined && configured.length > 0) {
    const configuredRegion = regionForOAuthHost(configured);
    if (configuredRegion !== undefined) return { region: configuredRegion, source: 'login' };
  }
  if (parts.configuredOAuthKey === NIGHTHAWK_OAUTH_KEY) {
    return { region: 'mainland-cn', source: 'login' };
  }
  if (parts.marker !== undefined) return { region: parts.marker, source: 'marker' };
  return { region: 'mainland-cn', source: 'default' };
}

export function resolveNightHawkRegionDetailed(
  options: ResolveNightHawkRegionOptions = {},
): NightHawkRegionResolution {
  const env = options.env ?? process.env;
  const marker =
    options.readMarker === false
      ? undefined
      : readNightHawkRegionMarker(options.homeDir ?? defaultHomeDir(env));
  return resolveNightHawkRegionFromParts({
    env,
    configuredOAuthHost: options.configuredOAuthHost,
    configuredOAuthKey: options.configuredOAuthKey,
    marker,
  });
}

export function resolveNightHawkRegion(options: ResolveNightHawkRegionOptions = {}): NightHawkRegion {
  return resolveNightHawkRegionDetailed(options).region;
}

export interface NightHawkRemoteControlAuth {
  readonly region: NightHawkRegion;
  readonly oauthKey: string;
  readonly relayOrigin: string;
}

/**
 * One region judgment for Remote Control: credential slot + relay origin.
 *
 * `oauthKey` is the persisted login slot when `configuredOAuthKey` is set
 * (including custom `nighthawk-env-*` environments); otherwise the official
 * slot for the resolved region. `relayOrigin` follows the resolved region
 * profile, except that a custom-env login — a scoped slot outside the two
 * official ones, without a recognized `configuredOAuthHost` — keeps the
 * mainland relay: an install-channel marker must not flip a custom
 * environment to `.ai`.
 */
export function resolveNightHawkRemoteControlAuth(
  options: ResolveNightHawkRegionOptions = {},
): NightHawkRemoteControlAuth {
  const region = resolveNightHawkRegion(options);
  const profile = nighthawkRegionProfile(region);
  const configuredKey = options.configuredOAuthKey;
  const customSlot =
    configuredKey !== undefined &&
    configuredKey !== NIGHTHAWK_OAUTH_KEY &&
    configuredKey !==
      resolveNightHawkOAuthRef({
        oauthHost: NIGHTHAWK_REGION_PROFILES.global.oauthHost,
        baseUrl: NIGHTHAWK_REGION_PROFILES.global.baseUrl,
      }).key;
  const hostPinned =
    options.configuredOAuthHost !== undefined &&
    regionForOAuthHost(options.configuredOAuthHost) !== undefined;
  return {
    region,
    oauthKey:
      configuredKey ??
      resolveNightHawkOAuthRef({
        oauthHost: profile.oauthHost,
        baseUrl: profile.baseUrl,
      }).key,
    relayOrigin:
      customSlot && !hostPinned
        ? NIGHTHAWK_REGION_PROFILES['mainland-cn'].relayOrigin
        : profile.relayOrigin,
  };
}
