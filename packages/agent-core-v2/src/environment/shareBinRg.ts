import { homedir } from 'node:os';
import { join } from 'node:path';

import { LOCAL_ENVIRONMENT_ID, type Environment } from './environment';

export function isRemoteEnvironment(environment: Environment | undefined): environment is Environment {
  return environment !== undefined && environment.identity.environmentId !== LOCAL_ENVIRONMENT_ID;
}

export function getShareBinRgPath(): string {
  const override = process.env['NIGHTHAWK_HOME'];
  if (override !== undefined && override !== '') return join(override, 'bin', rgBinaryName());
  return join(homedir(), '.nighthawk', 'bin', rgBinaryName());
}

export function shareBinRgPath(environment: Environment | undefined): string {
  if (isRemoteEnvironment(environment)) {
    const homeDir = environment.host?.homeDir;
    if (homeDir !== undefined) {
      const binary = environment.host?.pathClass === 'win32' ? 'rg.exe' : 'rg';
      return environment.path?.join(homeDir, '.nighthawk', 'bin', binary) ?? `${homeDir}/.nighthawk/bin/${binary}`;
    }
  }
  return getShareBinRgPath();
}

function rgBinaryName(): string {
  return process.platform === 'win32' ? 'rg.exe' : 'rg';
}
