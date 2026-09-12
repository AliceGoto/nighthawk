/**
 * Region profiles for the mainland-China (.com) and global (.ai)
 * NightHawk deployments, plus the resolver that decides which region a
 * client belongs to.
 *
 * A region is a bundle of endpoints (OAuth host, managed API base URL, CDN,
 * site). `cdnBase` / `siteBase` admit env overrides via
 * {@link nighthawkRegionProfile}; telemetry has no region profile entry — it
 * is opt-in through {@link nighthawkTelemetryEndpoint} alone. The OAuth
 * client_id is shared across regions and stays in `./constants`.
 *
 * Resolution order (first match wins):
 *   1. env override (`NIGHTHAWK_OAUTH_HOST` / `NIGHTHAWK_OAUTH_HOST`)
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
import { nighthawkEnvBaseUrl, nighthawkEnvOAuthHost, NIGHTHAWK_OAUTH_KEY } from './managed-nighthawk';

export type NighthawkRegion = 'mainland-cn' | 'global';

/** Zod schema for the wire/domain contract; parses to {@link NighthawkRegion}. */
export const nighthawkRegionSchema = z.enum(['mainland-cn', 'global']);

export interface NighthawkRegionProfile {
  /** OAuth host the device flow talks to (authorize/token derive from it). */
  readonly oauthHost: string;
  /** Managed API base (`/coding/v1`): usages, userinfo, models, feedback... */
  readonly baseUrl: string;
  /** Update/install/plugin-marketplace root. */
  readonly cdnBase: string;
  /** Official site root (docs, console, signup, upgrade pages). */
  readonly siteBase: string;
}

/**
 * Default distribution root: the NightHawk GitHub repository, mirrored by
 * jsDelivr (reachable from mainland China). Every artifact under this base —
 * plugin marketplace, plugin zips, update manifests — is a file committed to
 * the repo, so a plain `git push` publishes a release.
 */
export const NIGHTHAWK_DEFAULT_CDN_BASE =
  'https://cdn.jsdelivr.net/gh/AliceGoto/nighthawk@main';

/** Default official site root: the GitHub repository home page. */
export const NIGHTHAWK_DEFAULT_SITE_BASE = 'https://github.com/AliceGoto/nighthawk';

export const NIGHTHAWK_REGION_PROFILES: Record<NighthawkRegion, NighthawkRegionProfile> = {
  'mainland-cn': {
    oauthHost: DEFAULT_NIGHTHAWK_OAUTH_HOST,
    baseUrl: DEFAULT_NIGHTHAWK_BASE_URL,
    cdnBase: NIGHTHAWK_DEFAULT_CDN_BASE,
    siteBase: NIGHTHAWK_DEFAULT_SITE_BASE,
  },
  global: {
    oauthHost: 'https://auth.nighthawk.ai',
    baseUrl: DEFAULT_NIGHTHAWK_BASE_URL,
    cdnBase: NIGHTHAWK_DEFAULT_CDN_BASE,
    siteBase: NIGHTHAWK_DEFAULT_SITE_BASE,
  },
};

/**
 * The profile for `region` with the env overrides applied: `NIGHTHAWK_CDN_BASE`
 * replaces `cdnBase` and `NIGHTHAWK_SITE_BASE` replaces `siteBase` (each only
 * when the value trims to non-empty). With no overrides the static profile
 * object is returned as-is.
 */
export function nighthawkRegionProfile(
  region: NighthawkRegion,
  env: NodeJS.ProcessEnv = process.env,
): NighthawkRegionProfile {
  const profile = NIGHTHAWK_REGION_PROFILES[region];
  const cdnBase = envOverrideOr(env, 'NIGHTHAWK_CDN_BASE', profile.cdnBase);
  const siteBase = envOverrideOr(env, 'NIGHTHAWK_SITE_BASE', profile.siteBase);
  if (cdnBase === profile.cdnBase && siteBase === profile.siteBase) return profile;
  return { ...profile, cdnBase, siteBase };
}

/**
 * Telemetry endpoint, env-driven only: `NIGHTHAWK_TELEMETRY_ENDPOINT` when it
 * trims to non-empty, `undefined` otherwise. Telemetry stays off unless the
 * endpoint is explicitly configured.
 */
export function nighthawkTelemetryEndpoint(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env['NIGHTHAWK_TELEMETRY_ENDPOINT'];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function envOverrideOr(env: NodeJS.ProcessEnv, key: string, fallback: string): string {
  const value = env[key];
  if (value === undefined) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Content-CDN URL builder (tips banner, WebBridge / Computer-Use binaries).
 * Honors `NIGHTHAWK_CDN_BASE` so a self-hosted mirror takes effect everywhere
 * (region `cdnBase` and this builder share the same override), and defaults to
 * the GitHub-repository distribution root. Funnel every content URL through
 * here so flipping the base later touches one function.
 */
export function nighthawkCdnContentUrl(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base = envOverrideOr(env, 'NIGHTHAWK_CDN_BASE', NIGHTHAWK_DEFAULT_CDN_BASE);
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/**
 * Login hosts for an explicit region choice, or `undefined` when an env
 * override (`NIGHTHAWK_OAUTH_HOST` / `NIGHTHAWK_OAUTH_HOST` / `NIGHTHAWK_BASE_URL`)
 * is in play — env keeps full control of endpoints, so a region pick must not
 * smuggle profile hosts past it (requested hosts outrank env in
 * `resolveNighthawkLoginAuth`).
 *
 * When returned, both hosts are always set — including for 'mainland-cn',
 * whose values equal the defaults. Passing them explicitly is what lets
 * "switch back to mainland China" override a previously persisted global
 * login in config.toml.
 */
export function nighthawkRegionLoginHosts(
  region: NighthawkRegion,
  env: NodeJS.ProcessEnv = process.env,
): { readonly oauthHost: string; readonly baseUrl: string } | undefined {
  if (nighthawkEnvOAuthHost(env) !== undefined || nighthawkEnvBaseUrl(env) !== undefined) {
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

export interface ResolveNighthawkRegionOptions {
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

function regionForOAuthHost(oauthHost: string): NighthawkRegion | undefined {
  const normalized = normalizeHost(oauthHost);
  for (const region of Object.keys(NIGHTHAWK_REGION_PROFILES) as NighthawkRegion[]) {
    if (normalizeHost(NIGHTHAWK_REGION_PROFILES[region].oauthHost) === normalized) return region;
  }
  return undefined;
}

function readRegionMarker(homeDir: string): NighthawkRegion | undefined {
  let raw: string;
  try {
    raw = readFileSync(join(homeDir, NIGHTHAWK_REGION_MARKER_FILENAME), 'utf-8');
  } catch {
    return undefined;
  }
  const value = raw.trim();
  return value === 'mainland-cn' || value === 'global' ? value : undefined;
}

// Mirrors `defaultNighthawkHome` in ./toolkit; keep the two in sync so the marker
// always lands next to the credentials dir it describes.
function defaultHomeDir(env: NodeJS.ProcessEnv): string {
  const override = env['NIGHTHAWK_HOME'];
  if (override !== undefined && override.length > 0) return override;
  return join(homedir(), '.nighthawk');
}

export function resolveNighthawkRegion(options: ResolveNighthawkRegionOptions = {}): NighthawkRegion {
  const env = options.env ?? process.env;
  // An env host that matches a profile pins the region. An unknown env host
  // means a custom/internal environment: the per-endpoint env overrides keep
  // doing their job regardless of region, so skip straight to the default
  // instead of letting a stale config/marker point CDN links somewhere odd.
  const envHost = env['NIGHTHAWK_OAUTH_HOST'];
  if (envHost !== undefined && envHost.length > 0) {
    return regionForOAuthHost(envHost) ?? 'mainland-cn';
  }
  const configured = options.configuredOAuthHost;
  if (configured !== undefined && configured.length > 0) {
    const configuredRegion = regionForOAuthHost(configured);
    if (configuredRegion !== undefined) return configuredRegion;
  }
  if (options.configuredOAuthKey === NIGHTHAWK_OAUTH_KEY) return 'mainland-cn';
  if (options.readMarker !== false) {
    const markerRegion = readRegionMarker(options.homeDir ?? defaultHomeDir(env));
    if (markerRegion !== undefined) return markerRegion;
  }
  return 'mainland-cn';
}
