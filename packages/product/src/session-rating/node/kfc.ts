import { isManagedNightHawkBaseUrl } from '@nighthawk/nighthawk-oauth';

export interface RatingModelRoute {
  readonly modelId: string | undefined;
  readonly baseUrl: string | undefined;
}

export function kfcModelIdOf(route: RatingModelRoute): string | undefined {
  if (route.modelId === undefined || !isManagedNightHawkBaseUrl(route.baseUrl)) return undefined;
  return route.modelId;
}
