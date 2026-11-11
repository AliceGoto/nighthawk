export {
  DeviceCodeExpiredError,
  DeviceCodeTimeoutError,
  OAuthAccessDeniedError,
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
  assertNightHawkHostIdentity,
  createNightHawkDefaultHeaders,
  createNightHawkDeviceHeaders,
  createNightHawkDeviceId,
  createNightHawkUserAgent,
  NIGHTHAWK_CUSTOM_HEADERS_ENV,
  NIGHTHAWK_PLATFORM,
  parseNightHawkCustomHeaders,
  readNightHawkDeviceId,
  replaceUserAgentProduct,
} from './identity';
export type { NightHawkHostIdentity, NightHawkIdentityOptions } from './identity';

export { NIGHTHAWK_FLOW_CONFIG } from './constants';

export {
  NIGHTHAWK_REGION_MARKER_FILENAME,
  NIGHTHAWK_REGION_PROFILES,
  nighthawkCdnContentUrl,
  nighthawkRegionLoginHosts,
  nighthawkRegionProfile,
  nighthawkRegionSchema,
  readNightHawkRegionMarker,
  resolveNightHawkRegion,
  resolveNightHawkRegionDetailed,
  resolveNightHawkRegionFromParts,
  resolveNightHawkRemoteControlAuth,
} from './region';
export type {
  NightHawkRegion,
  NightHawkRegionProfile,
  NightHawkRegionResolution,
  NightHawkRegionSource,
  NightHawkRemoteControlAuth,
  ResolveNightHawkRegionOptions,
  ResolveNightHawkRegionParts,
} from './region';

export { createNightHawkRegionResolver, decideNightHawkRegion } from './region-resolver';
export type {
  CreateNightHawkRegionResolverOptions,
  NightHawkRegionAuthRead,
  NightHawkRegionAuthSnapshot,
  NightHawkRegionCacheAction,
  NightHawkRegionDecideInput,
  NightHawkRegionDecision,
  NightHawkRegionResolver,
} from './region-resolver';

export { collectLocalRegionSignals, detectNightHawkRegionFromLocalSignals } from './region-local';
export type { LocalRegionDetection, LocalRegionSignals } from './region-local';

export {
  applyManagedApiKeyProviderModels,
  applyManagedNightHawkLogoutConfig,
  applyManagedNightHawkConfig,
  clearManagedNightHawkConfig,
  fetchManagedNightHawkModels,
  nighthawkCodeEnvBaseUrl,
  nighthawkCodeEnvOAuthHost,
  NIGHTHAWK_OAUTH_KEY,
  NIGHTHAWK_PLATFORM_ID,
  NIGHTHAWK_PROVIDER_NAME,
  ManagedNightHawkModelsAuthError,
  provisionManagedNightHawkConfig,
  resolveNightHawkLoginAuth,
  resolveNightHawkOAuthKey,
  resolveNightHawkOAuthRef,
  resolveNightHawkRuntimeAuth,
  toManagedModelAlias,
} from './managed-kimi-code';
export type {
  FetchManagedNightHawkModelsOptions,
  ManagedNightHawkApplyResult,
  ManagedNightHawkCleanupResult,
  ManagedNightHawkProtocol,
  ManagedNightHawkEnv,
  ManagedNightHawkLoginAuth,
  ManagedNightHawkModelInfo,
  ManagedNightHawkProvisionResult,
  ManagedNightHawkConfigAdapter,
  ManagedNightHawkConfigShape,
  ManagedNightHawkOAuthRef,
  ManagedNightHawkOAuthRefInput,
  ManagedNightHawkRuntimeAuth,
  ProvisionManagedNightHawkConfigOptions,
} from './managed-kimi-code';

export {
  fetchManagedUserInfo,
  nighthawkCodeUserInfoUrl,
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
  boosterWalletInfoSchema,
  fetchManagedUsage,
  formatDuration,
  isManagedNightHawk,
  isManagedNightHawkBaseUrl,
  nighthawkCodeBaseUrl,
  nighthawkCodeUsageUrl,
  managedQuotaEntrySchema,
  managedQuotaSchema,
  managedQuotaUsagesSchema,
  managedUsageResultSchema,
  parseManagedUsagePayload,
} from './managed-usage';
export type {
  BoosterWalletInfo,
  FetchManagedUsageError,
  FetchManagedUsageResult,
  ManagedQuota,
  ManagedQuotaEntry,
  ManagedQuotaUsages,
  ManagedUsageResult,
} from './managed-usage';

export { fetchChatTitle, nighthawkCodeToolsUrl } from './managed-tools';
export type {
  FetchChatTitleError,
  FetchChatTitleOk,
  FetchChatTitleResult,
} from './managed-tools';

export { fetchSubmitFeedback, nighthawkCodeFeedbackUrl } from './managed-feedback';
export type {
  FetchSubmitFeedbackError,
  FetchSubmitFeedbackOk,
  FetchSubmitFeedbackResult,
  SubmitFeedbackBody,
} from './managed-feedback';

export {
  fetchCompleteFeedbackUpload,
  fetchCreateFeedbackUploadUrl,
  nighthawkCodeFeedbackUploadCompleteUrl,
  nighthawkCodeFeedbackUploadUrl,
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
  credentialEnvHints,
  CustomRegistryApiError,
  CUSTOM_REGISTRY_DEFAULT_CAPABILITIES,
  CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT,
  customRegistryReplacementKeys,
  fetchCustomRegistry,
  removeCustomRegistryEntries,
  removeCustomRegistryProvider,
} from './custom-registry';
export type {
  CustomRegistryModelEntry,
  CustomRegistryProviderEntry,
  CustomRegistryProviderType,
  CustomRegistryRemoval,
  CustomRegistryReplacementKeys,
  CustomRegistrySource,
  FetchCustomRegistryOptions,
} from './custom-registry';

export {
  apiKeyEnvMissingMessage,
  credentialConflictMessage,
  declaredProviderCredential,
  reconcileProviderCredentialUpdate,
} from './provider-credential';
export type {
  DeclaredProviderCredential,
  ProviderCredentialReconciliation,
  ProviderCredentialUpdate,
  ProviderCredentialView,
} from './provider-credential';

export { NightHawkOAuthToolkit, resolveNightHawkTokenStorageName } from './toolkit';
export type {
  AuthManagedUsageResult,
  AuthManagedUserInfoResult,
  AuthProviderStatus,
  AuthStatus,
  BearerTokenProvider,
  NightHawkOAuthLoginOptions,
  NightHawkOAuthLoginResult,
  NightHawkOAuthLogoutResult,
  NightHawkOAuthTokenRef,
  NightHawkOAuthToolkitOptions,
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
