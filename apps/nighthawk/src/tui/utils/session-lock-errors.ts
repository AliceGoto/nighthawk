import { ErrorCodes, isNightHawkError } from '@nighthawk/nighthawk-sdk';

export function isSessionOccupiedError(error: unknown): boolean {
  return isNightHawkError(error) && error.code === ErrorCodes.SESSION_OCCUPIED;
}

export function isSessionStaleError(error: unknown): boolean {
  return isNightHawkError(error) && error.code === ErrorCodes.SESSION_STALE;
}

export function occupiedHolderClientId(error: unknown): string {
  if (!isNightHawkError(error)) return 'unknown';
  const details = error.details as { holder?: { clientIdentity?: string } } | null | undefined;
  return details?.holder?.clientIdentity ?? 'unknown';
}
