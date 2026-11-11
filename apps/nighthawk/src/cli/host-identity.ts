/**
 * NightHawk host identity and product User-Agent.
 */

import { createNightHawkUserAgent as buildUserAgent, type NightHawkHostIdentity } from '@nighthawk/nighthawk-oauth';

import { CLI_MSH_PLATFORM, CLI_USER_AGENT_PRODUCT } from '#/constant/app';

import { getVersion } from './version';

export function createNightHawkHostIdentity(version = getVersion()): NightHawkHostIdentity {
  return {
    productName: CLI_USER_AGENT_PRODUCT,
    version,
    platform: CLI_MSH_PLATFORM,
  };
}

/**
 * Product User-Agent (`nighthawk-cli/<version>`) for ad-hoc outbound fetches
 * that don't go through the provider pipeline (registry / catalog imports).
 */
export function createNightHawkUserAgent(version = getVersion()): string {
  return buildUserAgent(createNightHawkHostIdentity(version));
}
