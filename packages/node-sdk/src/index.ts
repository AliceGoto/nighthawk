import type { NightHawkHarnessEnvironmentOptions } from '#/kimi-harness';
export { NightHawkHarness } from '#/kimi-harness';
export type { NightHawkHarnessEnvironmentOptions, NightHawkHarnessRuntimeOptions } from '#/kimi-harness';
export { Session } from '#/session';
export { NightHawkAuthFacade } from '#/auth';
export {
  createNightHawkHarness,
  SDKRpcClientV2,
  type SDKRpcClientV2Options,
} from '#/sdk-rpc-client-v2';
export {
  createNightHawkConfigRpc,
  NightHawkConfigRpcClient,
  type NightHawkConfigRpc,
  type NightHawkConfigValidationIssue,
  type NightHawkConfigValidationPathSegment,
  type ResolveNightHawkConfigPathInput,
  type ValidateNightHawkConfigTomlInput,
} from '#/config-rpc';
export { SDKRpcClientBase } from '#/rpc';
export type { ConfigSectionChange } from '#/rpc';
export { NightHawkForCodingProvider } from '#/kimi-code-model-provider';
export type { NightHawkForCodingProviderOptions } from '#/kimi-code-model-provider';

export {
  applyCatalogProvider,
  catalogBaseUrl,
  catalogModelToAlias,
  catalogProviderModels,
  CatalogFetchError,
  RegistryImportError,
  DEFAULT_CATALOG_URL,
  fetchCatalog,
  inferWireType,
  loadBuiltInCatalog,
  resolveCatalogImport,
} from '#/catalog';
export type {
  ApplyCatalogProviderOptions,
  Catalog,
  CatalogImportInvalidReason,
  CatalogImportResolution,
  CatalogModel,
  CatalogProviderEntry,
  FetchCatalogOptions,
} from '#/catalog';

export {
  ErrorCodes,
  NightHawkError,
  type NightHawkErrorCode,
  type NightHawkErrorInfo,
  type NightHawkErrorOptions,
  type NightHawkErrorPayload,
  NIGHTHAWK_ERROR_INFO,
  fromNightHawkErrorPayload,
  isNightHawkError,
  toNightHawkErrorPayload,
} from '#/errors';

export {
  flushDiagnosticLogs,
  flushDiagnosticLogsSync,
  log,
  redact,
  resolveGlobalLogPath,
} from '#/logging/index';
export {
  computeUpdateStatus,
  isMissingMarketplaceTokenError,
  isTrustedPluginMarketplaceUrl,
  NIGHTHAWK_PLUGIN_MARKETPLACE_URL_ENV,
  parsePluginMarketplace,
  marketplaceEntryInstallableOnHost,
  marketplaceEntrySupportsClient,
  marketplaceEntryVisibleOnHost,
  pluginClientForIdentity,
  PLUGIN_MARKETPLACE_CLASSIFICATIONS,
  PLUGIN_MARKETPLACE_CLIENTS,
  PLUGIN_MARKETPLACE_TIERS,
  readPluginMarketplace,
  withLatestVersions,
} from '@nighthawk/agent-core-v2/app/plugin/marketplace';
export { PluginAvailabilityStore } from '@nighthawk/agent-core-v2/app/plugin/availability';
export { resolveNightHawkHome } from '@nighthawk/agent-core-v2';
export type { LogContext, LogLevel, LogPayload, Logger } from '#/logging/index';

export { effectiveModelAlias, loadRuntimeConfigSafe } from '#/config/index';
export { resolveConfigPath } from '@nighthawk/agent-core-v2';
export { limitAgentReplayByTurns } from '#/replay';
export { parseAgentFileText, resolveAgentPath } from '@nighthawk/agent-core-v2';
export { SECONDARY_DERIVED_MODEL_ALIAS } from '#/config/index';
export { PRIMARY_SUBAGENT_MODEL_CHOICE } from '@nighthawk/agent-core-v2/session/subagent/configSection';

export { installGlobalProxyDispatcher } from '#/proxy';

export {
  buildImageCompressionCaption,
  buildUnsupportedImageNotice,
  gateImageFormatParts,
  isModelAcceptedImageMime,
  normalizeImageMime,
  parseImageDataUrl,
  persistOriginalImage,
  sessionMediaOriginalsDir,
  IMAGE_BYTE_BUDGET,
  MAX_IMAGE_EDGE_PX,
} from '@nighthawk/agent-core-v2';
export { compressBase64ForModel, compressImageForModel, ImageLimits } from '#/image';
export type {
  CompressImageOptions,
  CompressImageResult,
  CompressBase64Result,
  ImageCompressionCaptionInput,
  ImageCompressionTelemetry,
} from '#/image';

export type {
  ExperimentalFeatureState,
  ExperimentalFlagMap,
  ExperimentalFlagSource,
  FlagDefinition,
  FlagDefinitionInput,
  FlagId,
  FlagSurface,
} from '#/flag';

export {
  buildDaemonFileUrl,
  buildMediaPathTag,
  isDaemonFileUrl,
  matchSingleMediaPathTag,
  parseDaemonFileUrl,
} from '@nighthawk/agent-core-v2/agent/media/mediaRef';
export type {
  DaemonFileRef,
  MediaKind,
} from '@nighthawk/agent-core-v2/agent/media/mediaRef';

export type {
  NightHawkAuthCompleteFeedbackUploadInput,
  NightHawkAuthCompleteFeedbackUploadPart,
  NightHawkAuthCreateFeedbackUploadUrlInput,
  NightHawkAuthCreateFeedbackUploadUrlOk,
  NightHawkAuthCreateFeedbackUploadUrlResult,
  NightHawkAuthFeedbackUploadPart,
  NightHawkAuthLoginResult,
  NightHawkAuthLogoutResult,
  NightHawkAuthSubmitFeedbackInput,
} from '#/auth';

export * from '#/events';
export type * from '#/types';
