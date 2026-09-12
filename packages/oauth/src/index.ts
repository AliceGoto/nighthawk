export {
  DeviceCodeExpiredError,
  DeviceCodeTimeoutError,
  OAuthConnectionError,
  OAuthError,
  OAuthUnauthorizedError,
  RetryableRefreshError,
} from './errors';

export type {
  DeviceAuthorization,
  DeviceHeaders,
  OAuthFlowConfig,
  OAuthStorageBackend,
  TokenInfo,
  TokenInfoWire,
} from './types';
export { tokenFromWire, tokenToWire } from './types';

export type { TokenStorage } from './storage';
export { FileTokenStorage } from './storage';

export type { DevicePollResult, RefreshOptions } from './oauth';
export { pollDeviceToken, refreshAccessToken, requestDeviceAuthorization } from './oauth';

export type { LoginOptions, OAuthManagerOptions, OAuthRefreshOutcome } from './oauth-manager';
export { OAuthManager, defaultRefreshThreshold, newInstanceId } from './oauth-manager';

export {
  assertNighthawkHostIdentity,
  createNighthawkDefaultHeaders,
  createNighthawkDeviceHeaders,
  createNighthawkDeviceId,
  createNighthawkUserAgent,
  NIGHTHAWK_CUSTOM_HEADERS_ENV,
  NIGHTHAWK_PLATFORM,
  parseNighthawkCustomHeaders,
  readNighthawkDeviceId,
  replaceUserAgentProduct,
} from './identity';
export type { NighthawkHostIdentity, NighthawkIdentityOptions } from './identity';

export { NIGHTHAWK_FLOW_CONFIG } from './constants';

export {
  NIGHTHAWK_DEFAULT_CDN_BASE,
  NIGHTHAWK_DEFAULT_SITE_BASE,
  NIGHTHAWK_REGION_MARKER_FILENAME,
  NIGHTHAWK_REGION_PROFILES,
  nighthawkCdnContentUrl,
  nighthawkRegionLoginHosts,
  nighthawkRegionProfile,
  nighthawkRegionSchema,
  nighthawkTelemetryEndpoint,
  resolveNighthawkRegion,
} from './region';
export type { NighthawkRegion, NighthawkRegionProfile, ResolveNighthawkRegionOptions } from './region';

export {
  applyManagedApiKeyProviderModels,
  applyManagedNighthawkLogoutConfig,
  applyManagedNighthawkConfig,
  clearManagedNighthawkConfig,
  fetchManagedNighthawkModels,
  nighthawkEnvBaseUrl,
  nighthawkEnvOAuthHost,
  NIGHTHAWK_OAUTH_KEY,
  NIGHTHAWK_PLATFORM_ID,
  NIGHTHAWK_PROVIDER_NAME,
  ManagedNighthawkModelsAuthError,
  provisionManagedNighthawkConfig,
  resolveNighthawkLoginAuth,
  resolveNighthawkOAuthKey,
  resolveNighthawkOAuthRef,
  resolveNighthawkRuntimeAuth,
  toManagedModelAlias,
} from './managed-nighthawk';
export type {
  FetchManagedNighthawkModelsOptions,
  ManagedNighthawkApplyResult,
  ManagedNighthawkCleanupResult,
  ManagedNighthawkProtocol,
  ManagedNighthawkEnv,
  ManagedNighthawkLoginAuth,
  ManagedNighthawkModelInfo,
  ManagedNighthawkProvisionResult,
  ManagedNighthawkConfigAdapter,
  ManagedNighthawkConfigShape,
  ManagedNighthawkOAuthRef,
  ManagedNighthawkOAuthRefInput,
  ManagedNighthawkRuntimeAuth,
  ProvisionManagedNighthawkConfigOptions,
} from './managed-nighthawk';

export {
  fetchManagedUserInfo,
  nighthawkUserInfoUrl,
  managedUserInfoPhoneSchema,
  managedUserInfoResultSchema,
  managedUserInfoSchema,
  parseManagedUserInfoPayload,
} from './managed-userinfo';
export type {
  FetchManagedUserInfoError,
  FetchManagedUserInfoResult,
  ManagedUserInfo,
  ManagedUserInfoPhone,
  ManagedUserInfoResult,
} from './managed-userinfo';

export {
  DEFAULT_NIGHTHAWK_BASE_URL,
  fetchManagedUsage,
  formatDuration,
  isManagedNighthawk,
  isManagedNighthawkBaseUrl,
  nighthawkBaseUrl,
  nighthawkUsageUrl,
  parseManagedUsagePayload,
} from './managed-usage';
export type {
  FetchManagedUsageError,
  FetchManagedUsageResult,
  ParsedManagedUsage,
  UsageRow,
  UsageWindow,
} from './managed-usage';

export { fetchChatTitle, nighthawkToolsUrl } from './managed-tools';
export type {
  FetchChatTitleError,
  FetchChatTitleOk,
  FetchChatTitleResult,
} from './managed-tools';

export { fetchSubmitFeedback, nighthawkFeedbackUrl } from './managed-feedback';
export type {
  FetchSubmitFeedbackError,
  FetchSubmitFeedbackOk,
  FetchSubmitFeedbackResult,
  SubmitFeedbackBody,
} from './managed-feedback';

export {
  fetchCompleteFeedbackUpload,
  fetchCreateFeedbackUploadUrl,
  nighthawkFeedbackUploadCompleteUrl,
  nighthawkFeedbackUploadUrl,
} from './managed-feedback-upload';
export type {
  CompleteFeedbackUploadBody,
  CreateFeedbackUploadUrlBody,
  CreateFeedbackUploadUrlResponse,
  FetchCompleteFeedbackUploadResult,
  FetchCreateFeedbackUploadUrlResult,
  FetchFeedbackUploadError,
} from './managed-feedback-upload';

export {
  applyOpenPlatformConfig,
  capabilitiesForModel,
  fetchOpenPlatformModels,
  filterModelsByPrefix,
  getOpenPlatformById,
  isOpenPlatformId,
  OPEN_PLATFORMS,
  OpenPlatformApiError,
  removeOpenPlatformConfig,
} from './open-platform';
export type {
  ApplyOpenPlatformResult,
  OpenPlatformDefinition,
} from './open-platform';

export {
  applyCustomRegistryEntries,
  applyCustomRegistryProvider,
  capabilitiesFromCustomEntry,
  CustomRegistryApiError,
  CUSTOM_REGISTRY_DEFAULT_CAPABILITIES,
  CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT,
  fetchCustomRegistry,
  removeCustomRegistryProvider,
} from './custom-registry';
export type {
  CustomRegistryModelEntry,
  CustomRegistryProviderEntry,
  CustomRegistryProviderType,
  CustomRegistrySource,
  FetchCustomRegistryOptions,
} from './custom-registry';

export { NighthawkOAuthToolkit, resolveNighthawkTokenStorageName } from './toolkit';
export type {
  AuthManagedUserInfoResult,
  AuthManagedUsageResult,
  AuthProviderStatus,
  AuthStatus,
  BearerTokenProvider,
  NighthawkOAuthLoginOptions,
  NighthawkOAuthLoginResult,
  NighthawkOAuthLogoutResult,
  NighthawkOAuthTokenRef,
  NighthawkOAuthToolkitOptions,
} from './toolkit';

export { refreshProviderModels } from './refreshProviderModels';
export type {
  ProviderChange,
  RefreshProviderHost,
  RefreshProviderOptions,
  RefreshProviderScope,
  RefreshResult,
} from './refreshProviderModels';

export type { OAuthTokenTransactionOptions } from './oauth-token-transaction';
export { OAuthTokenTransaction } from './oauth-token-transaction';
