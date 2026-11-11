declare const __NIGHTHAWK_VERSION__: string | undefined;
declare const __NIGHTHAWK_CHANNEL__: string | undefined;
declare const __NIGHTHAWK_COMMIT__: string | undefined;
declare const __NIGHTHAWK_BUILD_TARGET__: string | undefined;

export interface NightHawkBuildInfo {
  readonly version?: string;
  readonly channel?: string;
  readonly commit?: string;
  readonly buildTarget?: string;
}

function optionalBuildString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const NIGHTHAWK_BUILD_INFO: NightHawkBuildInfo = {
  version:
    typeof __NIGHTHAWK_VERSION__ === 'string'
      ? optionalBuildString(__NIGHTHAWK_VERSION__)
      : undefined,
  channel:
    typeof __NIGHTHAWK_CHANNEL__ === 'string'
      ? optionalBuildString(__NIGHTHAWK_CHANNEL__)
      : undefined,
  commit:
    typeof __NIGHTHAWK_COMMIT__ === 'string'
      ? optionalBuildString(__NIGHTHAWK_COMMIT__)
      : undefined,
  buildTarget:
    typeof __NIGHTHAWK_BUILD_TARGET__ === 'string'
      ? optionalBuildString(__NIGHTHAWK_BUILD_TARGET__)
      : undefined,
};
