import type {
  ExperimentalFeatureState,
  ExperimentalFlagMap,
} from '@nighthawk/nighthawk-sdk';

export function experimentalFeatureMap(
  features: readonly Pick<ExperimentalFeatureState, 'id' | 'enabled'>[],
): ExperimentalFlagMap {
  return Object.fromEntries(features.map((feature) => [feature.id, feature.enabled]));
}
