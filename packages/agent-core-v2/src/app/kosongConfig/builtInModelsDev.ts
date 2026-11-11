declare const __NIGHTHAWK_BUILT_IN_CATALOG__: string | undefined;

export const BUILT_IN_MODELS_DEV_JSON: string | undefined =
  typeof __NIGHTHAWK_BUILT_IN_CATALOG__ === 'string'
    ? __NIGHTHAWK_BUILT_IN_CATALOG__
    : undefined;
