import { Error2 } from '#/_base/errors/errors';
export { sanitizeStatusErrorMessage } from '../contract/errors';
export declare const ProtocolErrors: {
    readonly codes: {
        readonly PROVIDER_API_ERROR: "provider.api_error";
        readonly PROVIDER_FILTERED: "provider.filtered";
        readonly PROVIDER_RATE_LIMIT: "provider.rate_limit";
        readonly PROVIDER_AUTH_ERROR: "provider.auth_error";
        readonly PROVIDER_CONNECTION_ERROR: "provider.connection_error";
        readonly PROVIDER_OVERLOADED: "provider.overloaded";
        readonly CONTEXT_OVERFLOW: "context.overflow";
    };
    readonly retryable: readonly ["provider.rate_limit", "provider.connection_error", "provider.overloaded", "context.overflow"];
    readonly info: {
        readonly 'provider.rate_limit': {
            readonly title: 'Provider rate limit';
            readonly retryable: true;
            readonly public: true;
            readonly action: 'Retry after the provider rate limit resets.';
        };
        readonly 'provider.filtered': {
            readonly title: 'Provider filtered response';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Revise the prompt or model configuration to avoid provider safety filtering.';
        };
        readonly 'provider.auth_error': {
            readonly title: 'Provider authentication failed';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check provider credentials and authentication configuration.';
        };
        readonly 'provider.overloaded': {
            readonly title: 'Provider overloaded';
            readonly retryable: true;
            readonly public: true;
            readonly action: 'Retry after the provider recovers from overload.';
        };
        readonly 'context.overflow': {
            readonly title: 'Context overflow';
            readonly retryable: true;
            readonly public: true;
            readonly action: 'Compact the conversation or retry with fewer tokens.';
        };
    };
};
export declare function translateProviderError(error: unknown): Error2;
