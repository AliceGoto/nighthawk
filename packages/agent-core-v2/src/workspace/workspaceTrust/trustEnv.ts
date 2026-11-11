import { parseBooleanEnv } from '#/_base/utils/env';

export const TRUST_WORKSPACE_ENV = 'NIGHTHAWK_TRUST_WORKSPACE';

export function trustWorkspaceEnvTrusted(
  getEnv: (name: string) => string | undefined,
): boolean {
  return parseBooleanEnv(getEnv(TRUST_WORKSPACE_ENV)) === true;
}
