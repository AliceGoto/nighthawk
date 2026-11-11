import {
  loadRuntimeConfigSafe,
  readConfigFile,
  readConfigFileForUpdate,
  writeConfigFile,
  type NightHawkConfig,
  type OAuthRef,
} from '#/config/index';
import {
  applyManagedNightHawkConfig,
  applyManagedNightHawkLogoutConfig,
  NIGHTHAWK_PROVIDER_NAME,
  NightHawkOAuthToolkit,
  nighthawkRegionLoginHosts,
  resolveNightHawkLoginAuth,
  resolveNightHawkRuntimeAuth,
  type AuthManagedUsageResult,
  type AuthStatus,
  type BearerTokenProvider,
  type FetchCompleteFeedbackUploadResult,
  type FetchFeedbackUploadError,
  type FetchSubmitFeedbackResult,
  type NightHawkHostIdentity,
  type NightHawkOAuthLoginOptions,
  type NightHawkRegion,
  type ManagedNightHawkConfigShape,
  type OAuthRefreshOutcome,
} from '@nighthawk/nighthawk-oauth';

import { mapOAuthTokenError } from '#/oauth-error';

export interface NightHawkAuthSubmitFeedbackInput {
  readonly content: string;
  readonly sessionId: string;
  readonly version: string;
  readonly os: string;
  readonly model: string | null;
  readonly contact?: string;
  readonly info?: Record<string, unknown>;
}

export interface NightHawkAuthCreateFeedbackUploadUrlInput {
  readonly feedbackId: number;
  readonly filename: string;
  readonly size: number;
  readonly sha256: string;
}

export interface NightHawkAuthCompleteFeedbackUploadPart {
  readonly partNumber: number;
  readonly etag: string;
}

export interface NightHawkAuthCompleteFeedbackUploadInput {
  readonly uploadId: number;
  readonly parts: readonly NightHawkAuthCompleteFeedbackUploadPart[];
}

export interface NightHawkAuthFeedbackUploadPart {
  readonly partNumber: number;
  readonly url: string;
  readonly method: string;
  readonly size: number;
}

export interface NightHawkAuthCreateFeedbackUploadUrlOk {
  readonly kind: 'ok';
  readonly uploadId: number;
  readonly parts: readonly NightHawkAuthFeedbackUploadPart[];
}

export type NightHawkAuthCreateFeedbackUploadUrlResult =
  | NightHawkAuthCreateFeedbackUploadUrlOk
  | FetchFeedbackUploadError;

export type NightHawkAuthLoginOptions = Omit<NightHawkOAuthLoginOptions, 'provisionConfig'> & {
  /**
   * Explicit region choice from the login UI ('mainland-cn' / 'global'). Maps
   * to the region profile's OAuth/API hosts — including for 'mainland-cn', so
   * switching back overrides a persisted global login. Yields to
   * `NIGHTHAWK_OAUTH_HOST` / `NIGHTHAWK_BASE_URL` env overrides and to
   * explicit `oauthHost` / `baseUrl` options.
   */
  readonly region?: NightHawkRegion;
};

export interface NightHawkAuthLoginResult {
  readonly providerName: string;
  readonly ok: true;
  readonly defaultModel: string;
  readonly defaultThinking: boolean;
  readonly configPath?: string | undefined;
}

export interface NightHawkAuthLogoutResult {
  readonly providerName: string;
  readonly ok: true;
}

export interface NightHawkAuthFacadeOptions {
  readonly homeDir: string;
  readonly configPath: string;
  readonly identity?: NightHawkHostIdentity | undefined;
  readonly onConfigUpdated?: ((config: NightHawkConfig) => void) | undefined;
  readonly onRefresh?: ((outcome: OAuthRefreshOutcome) => void) | undefined;
}

type SDKManagedConfig = NightHawkConfig & ManagedNightHawkConfigShape;

export class NightHawkAuthFacade {
  private readonly toolkit: NightHawkOAuthToolkit<SDKManagedConfig>;

  constructor(private readonly options: NightHawkAuthFacadeOptions) {
    this.toolkit = new NightHawkOAuthToolkit<SDKManagedConfig>({
      homeDir: options.homeDir,
      identity: options.identity,
      onRefresh: options.onRefresh,
      configAdapter: {
        configPath: options.configPath,
        // Write-path base read: strict (a salvaged base would drop the user's
        // broken-but-fixable sections on rewrite) with an actionable message.
        read: () => readConfigFileForUpdate(options.configPath) as SDKManagedConfig,
        write: async (config) => {
          await writeConfigFile(options.configPath, config);
        },
        apply: applyManagedNightHawkConfig,
        remove: applyManagedNightHawkLogoutConfig,
      },
    });
  }

  async status(providerName?: string | undefined): Promise<AuthStatus> {
    return this.toolkit.status(providerName, this.resolveRuntimeManagedAuth(providerName).oauthRef);
  }

  async login(
    providerName: string | undefined = NIGHTHAWK_PROVIDER_NAME,
    options: NightHawkAuthLoginOptions = {},
  ): Promise<NightHawkAuthLoginResult> {
    const { region, ...loginOptions } = options;
    const regionHosts = region === undefined ? undefined : nighthawkRegionLoginHosts(region);
    const auth = this.resolveManagedAuth(providerName);
    const loginAuth = resolveNightHawkLoginAuth({
      configuredBaseUrl: auth.baseUrl,
      configuredOAuthRef: auth.oauthRef,
      requestedBaseUrl: loginOptions.baseUrl ?? regionHosts?.baseUrl,
      requestedOAuthHost: loginOptions.oauthHost ?? regionHosts?.oauthHost,
    });
    const result = await this.toolkit.login(providerName, {
      ...loginOptions,
      baseUrl: loginAuth.baseUrl,
      oauthHost: loginAuth.oauthHost,
      oauthRef: loginOptions.oauthRef ?? loginAuth.oauthRef,
      provisionConfig: true,
    });
    if (result.provision === undefined) {
      throw new Error('NightHawk auth login did not provision model config.');
    }
    const updated = readConfigFile(this.options.configPath);
    this.options.onConfigUpdated?.(updated);
    return {
      providerName: result.providerName,
      ok: true,
      defaultModel: result.provision.defaultModel,
      defaultThinking: result.provision.defaultThinking,
      configPath: result.provision.configPath,
    };
  }

  async logout(providerName?: string | undefined): Promise<NightHawkAuthLogoutResult> {
    const result = await this.toolkit.logout(
      providerName,
      this.resolveRuntimeManagedAuth(providerName).oauthRef,
    );
    const updated = readConfigFile(this.options.configPath);
    this.options.onConfigUpdated?.(updated);
    return {
      providerName: result.providerName,
      ok: result.ok,
    };
  }

  async getManagedUsage(providerName?: string | undefined): Promise<AuthManagedUsageResult> {
    const auth = this.resolveRuntimeManagedAuth(providerName);
    return this.toolkit.getManagedUsage(providerName, {
      oauthRef: auth.oauthRef,
      baseUrl: auth.baseUrl,
    });
  }

  async submitFeedback(
    input: NightHawkAuthSubmitFeedbackInput,
    providerName?: string | undefined,
  ): Promise<FetchSubmitFeedbackResult> {
    const auth = this.resolveRuntimeManagedAuth(providerName);
    return this.toolkit.submitFeedback(
      {
        session_id: input.sessionId,
        content: input.content,
        version: input.version,
        os: input.os,
        model: input.model,
        contact: input.contact,
        info: input.info,
      },
      providerName,
      {
        oauthRef: auth.oauthRef,
        baseUrl: auth.baseUrl,
      },
    );
  }

  async createFeedbackUploadUrl(
    input: NightHawkAuthCreateFeedbackUploadUrlInput,
    providerName?: string | undefined,
  ): Promise<NightHawkAuthCreateFeedbackUploadUrlResult> {
    const auth = this.resolveRuntimeManagedAuth(providerName);
    const result = await this.toolkit.createFeedbackUploadUrl(
      {
        file_hash: input.sha256,
        file_name: input.filename,
        file_size: input.size,
        feedback_id: input.feedbackId,
      },
      providerName,
      {
        oauthRef: auth.oauthRef,
        baseUrl: auth.baseUrl,
      },
    );
    if (result.kind !== 'ok') return result;
    return {
      kind: 'ok',
      uploadId: result.upload_id,
      parts: result.parts.map((part) => ({
        partNumber: part.part_number,
        url: part.url,
        method: part.method,
        size: part.size,
      })),
    };
  }

  async completeFeedbackUpload(
    input: NightHawkAuthCompleteFeedbackUploadInput,
    providerName?: string | undefined,
  ): Promise<FetchCompleteFeedbackUploadResult> {
    const auth = this.resolveRuntimeManagedAuth(providerName);
    return this.toolkit.completeFeedbackUpload(
      {
        upload_id: input.uploadId,
        parts: input.parts.map((part) => ({ part_number: part.partNumber, etag: part.etag })),
      },
      providerName,
      {
        oauthRef: auth.oauthRef,
        baseUrl: auth.baseUrl,
      },
    );
  }

  async getCachedAccessToken(
    providerName?: string,
    oauthRef?: OAuthRef | undefined,
  ): Promise<string | undefined> {
    return this.toolkit.getCachedAccessToken(
      providerName,
      this.runtimeOAuthRef(providerName, oauthRef),
    );
  }

  readonly resolveOAuthTokenProvider = (
    providerName: string,
    oauthRef?: OAuthRef | undefined,
  ): BearerTokenProvider => {
    const provider = this.toolkit.tokenProvider(
      providerName,
      this.runtimeOAuthRef(providerName, oauthRef),
    );
    return {
      getAccessToken: async (options) => {
        try {
          return await provider.getAccessToken(options);
        } catch (error) {
          // Classify OAuth token failures into the public NightHawkError protocol;
          // unrecognized errors are rethrown raw (see mapOAuthTokenError).
          throw mapOAuthTokenError(error, providerName) ?? error;
        }
      },
    };
  };

  private resolveManagedAuth(providerName?: string | undefined): {
    readonly oauthRef?: OAuthRef | undefined;
    readonly baseUrl?: string | undefined;
  } {
    const name = providerName ?? NIGHTHAWK_PROVIDER_NAME;
    // Read path: token/status resolution must work off a degraded config
    // instead of failing the session when an unrelated section is broken.
    // Write paths (the toolkit's configAdapter.read) stay strict.
    const config = loadRuntimeConfigSafe(this.options.configPath).config;
    const provider = config.providers[name];
    return {
      oauthRef: provider?.oauth,
      baseUrl: provider?.baseUrl,
    };
  }

  private resolveRuntimeManagedAuth(providerName?: string | undefined): {
    readonly oauthRef: OAuthRef;
    readonly baseUrl?: string | undefined;
  } {
    const auth = this.resolveManagedAuth(providerName);
    return resolveNightHawkRuntimeAuth({
      configuredBaseUrl: auth.baseUrl,
      configuredOAuthRef: auth.oauthRef,
    });
  }

  private runtimeOAuthRef(
    providerName: string | undefined,
    oauthRef?: OAuthRef | undefined,
  ): OAuthRef | undefined {
    if ((providerName ?? NIGHTHAWK_PROVIDER_NAME) !== NIGHTHAWK_PROVIDER_NAME) return oauthRef;
    const auth = this.resolveManagedAuth(providerName);
    return resolveNightHawkRuntimeAuth({
      configuredBaseUrl: auth.baseUrl,
      configuredOAuthRef: oauthRef ?? auth.oauthRef,
    }).oauthRef;
  }
}
