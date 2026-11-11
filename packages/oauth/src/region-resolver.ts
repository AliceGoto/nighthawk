import { statSync } from 'node:fs';
import { join } from 'node:path';

import { nighthawkCodeEnvBaseUrl } from './managed-kimi-code';
import {
  clearNightHawkRegionCache,
  NIGHTHAWK_REGION_CACHE_FILENAME,
  readNightHawkRegionCache,
  writeNightHawkRegionCache,
  type NightHawkRegionCacheRecord,
} from './region-cache';
import {
  collectLocalRegionSignals,
  detectNightHawkRegionFromLocalSignals,
  type LocalRegionDetection,
  type LocalRegionSignals,
} from './region-local';
import {
  NIGHTHAWK_REGION_MARKER_FILENAME,
  readNightHawkRegionMarker,
  resolveNightHawkRegionFromParts,
  type NightHawkRegion,
  type NightHawkRegionResolution,
} from './region';

export interface NightHawkRegionOAuthRef {
  readonly key: string;
  readonly oauthHost?: string;
}

/**
 * Two-state account snapshot: the client is either logged out or logged in
 * with the persisted oauth ref. A read failure (corrupt/unreadable config,
 * un-hydrated provider state) is NOT a state — the reader reports
 * `unreadable` and the resolver short-circuits without inferring, touching
 * the cache, or memoizing, so every read retries and the failure self-heals.
 */
export type NightHawkRegionAuthSnapshot =
  | { readonly status: 'logged-out' }
  | { readonly status: 'logged-in'; readonly ref: NightHawkRegionOAuthRef };

export type NightHawkRegionAuthRead = NightHawkRegionAuthSnapshot | { readonly status: 'unreadable' };

export type NightHawkRegionCacheAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'write'; readonly region: NightHawkRegion }
  | { readonly kind: 'clear' };

export interface NightHawkRegionDecideInput {
  readonly auth: NightHawkRegionAuthSnapshot;
  readonly env: NodeJS.ProcessEnv;
  /** Install-channel marker value; absent when unreadable or skipped. */
  readonly marker?: NightHawkRegion;
  /** Persisted logged-out inference record, when one validates. */
  readonly cacheRecord?: NightHawkRegionCacheRecord;
  /** Invoked only when the chain reaches local-signals. */
  readonly signals: () => LocalRegionSignals;
  readonly readMarker?: boolean;
  readonly allowLocalInference?: boolean;
}

export interface NightHawkRegionDecision {
  readonly resolution: NightHawkRegionResolution;
  readonly cacheAction: NightHawkRegionCacheAction;
}

/**
 * Pure two-state decision over env > login > marker > cache > local-signals >
 * default. No I/O: file effects are returned as `cacheAction` for the single
 * exit in the resolver to execute once.
 */
export function decideNightHawkRegion(input: NightHawkRegionDecideInput): NightHawkRegionDecision {
  const ref = input.auth.status === 'logged-in' ? input.auth.ref : undefined;
  const explicit = resolveNightHawkRegionFromParts({
    env: input.env,
    configuredOAuthHost: ref?.oauthHost,
    configuredOAuthKey: ref?.key,
    marker: input.marker,
  });
  if (explicit.source === 'env') {
    return {
      resolution: explicit,
      cacheAction: input.auth.status === 'logged-in' ? { kind: 'clear' } : { kind: 'none' },
    };
  }
  if (input.auth.status === 'logged-in') {
    return { resolution: explicit, cacheAction: { kind: 'clear' } };
  }
  if (explicit.source === 'marker') {
    return { resolution: explicit, cacheAction: { kind: 'none' } };
  }
  if (
    input.readMarker === false ||
    input.allowLocalInference === false ||
    nighthawkCodeEnvBaseUrl(input.env) !== undefined
  ) {
    return { resolution: explicit, cacheAction: { kind: 'none' } };
  }
  if (input.cacheRecord !== undefined) {
    return {
      resolution: { region: input.cacheRecord.region, source: input.cacheRecord.source },
      cacheAction: { kind: 'none' },
    };
  }
  let detection: LocalRegionDetection;
  try {
    detection = detectNightHawkRegionFromLocalSignals(input.signals());
  } catch {
    return {
      resolution: { region: 'mainland-cn', source: 'fallback' },
      cacheAction: { kind: 'none' },
    };
  }
  if (!detection.confident) {
    return {
      resolution: { region: detection.region, source: 'fallback' },
      cacheAction: { kind: 'none' },
    };
  }
  return {
    resolution: { region: detection.region, source: 'local-signals' },
    cacheAction: { kind: 'write', region: detection.region },
  };
}

export interface CreateNightHawkRegionResolverOptions {
  readonly homeDir: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly readAuth: () => NightHawkRegionAuthRead;
  /**
   * Path of the file `readAuth` parses (config.toml). When set, `readAuth`
   * only runs again after the file's stat fingerprint changes; hosts whose
   * snapshot lives in memory leave this unset and the snapshot enters the
   * memo basis directly.
   */
  readonly authFilePath?: string;
  readonly readMarker?: boolean;
  readonly allowLocalInference?: boolean;
  readonly collectSignals?: () => LocalRegionSignals;
}

export interface NightHawkRegionResolver {
  current(): NightHawkRegionResolution;
  /** Force a full re-read of every input; `current()` re-validates via stat. */
  refresh(): NightHawkRegionResolution;
}

interface FileRead<T> {
  readonly fingerprint: string;
  readonly value: T;
}

function statFingerprint(path: string): string {
  try {
    const stat = statSync(path);
    return `${String(stat.mtimeMs)}:${String(stat.size)}`;
  } catch {
    return 'absent';
  }
}

function authBasis(auth: NightHawkRegionAuthRead): string {
  if (auth.status !== 'logged-in') return auth.status;
  return JSON.stringify([auth.status, auth.ref.key, auth.ref.oauthHost]);
}

export function createNightHawkRegionResolver(
  options: CreateNightHawkRegionResolverOptions,
): NightHawkRegionResolver {
  const env = options.env ?? process.env;
  const collectSignals = options.collectSignals ?? collectLocalRegionSignals;
  const markerPath = join(options.homeDir, NIGHTHAWK_REGION_MARKER_FILENAME);
  const cachePath = join(options.homeDir, NIGHTHAWK_REGION_CACHE_FILENAME);
  let memo: { readonly basis: string; readonly resolution: NightHawkRegionResolution } | undefined;
  let authRead: FileRead<NightHawkRegionAuthRead> | undefined;
  let markerRead: FileRead<NightHawkRegion | undefined> | undefined;
  let cacheRead: FileRead<NightHawkRegionCacheRecord | undefined> | undefined;

  function readAuth(): NightHawkRegionAuthRead {
    try {
      return options.readAuth();
    } catch {
      return { status: 'unreadable' };
    }
  }

  function current(): NightHawkRegionResolution {
    let auth: NightHawkRegionAuthRead;
    let authFileFingerprint: string | undefined;
    if (options.authFilePath !== undefined) {
      authFileFingerprint = statFingerprint(options.authFilePath);
      if (authRead?.fingerprint === authFileFingerprint) {
        auth = authRead.value;
      } else {
        auth = readAuth();
        authRead = { fingerprint: authFileFingerprint, value: auth };
      }
    } else {
      auth = readAuth();
    }

    let marker: NightHawkRegion | undefined;
    let markerFingerprint = 'off';
    if (options.readMarker !== false) {
      markerFingerprint = statFingerprint(markerPath);
      if (markerRead?.fingerprint === markerFingerprint) {
        marker = markerRead.value;
      } else {
        marker = readNightHawkRegionMarker(options.homeDir);
        markerRead = { fingerprint: markerFingerprint, value: marker };
      }
    }

    if (auth.status === 'unreadable') {
      return resolveNightHawkRegionFromParts({ env, marker });
    }

    let cacheRecord: NightHawkRegionCacheRecord | undefined;
    const cacheFingerprint = statFingerprint(cachePath);
    if (cacheRead?.fingerprint === cacheFingerprint) {
      cacheRecord = cacheRead.value;
    } else {
      cacheRecord = readNightHawkRegionCache(options.homeDir);
      cacheRead = { fingerprint: cacheFingerprint, value: cacheRecord };
    }

    const basis = JSON.stringify([
      authBasis(auth),
      env['NIGHTHAWK_OAUTH_HOST'],
      env['KIMI_OAUTH_HOST'],
      env['NIGHTHAWK_BASE_URL'],
      authFileFingerprint,
      markerFingerprint,
      cacheFingerprint,
    ]);
    if (memo?.basis === basis) return memo.resolution;

    const decision = decideNightHawkRegion({
      auth,
      env,
      marker,
      cacheRecord,
      signals: collectSignals,
      readMarker: options.readMarker,
      allowLocalInference: options.allowLocalInference,
    });
    if (decision.cacheAction.kind === 'write') {
      writeNightHawkRegionCache(options.homeDir, decision.cacheAction.region);
    } else if (decision.cacheAction.kind === 'clear') {
      clearNightHawkRegionCache(options.homeDir);
    }
    memo = { basis, resolution: decision.resolution };
    return decision.resolution;
  }

  function refresh(): NightHawkRegionResolution {
    memo = undefined;
    authRead = undefined;
    markerRead = undefined;
    cacheRead = undefined;
    return current();
  }

  return { current, refresh };
}
