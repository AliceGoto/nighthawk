import { Error2, type Error2Options } from '#/_base/errors/errors';
import { type LlmErrorMessage, type LlmRemoteErrorMessage } from '#human/llm-requester/errors';
import type { FinishReason } from '#human/llm-requester/finish-reason';
import type { LlmErrorDiagnostics } from '#human/llm/response';
export { isAbortError, parseRetryAfterMs, sanitizeStatusErrorMessage, } from '#human/llm-requester/errors';
export declare const CONFIG_INVALID_ERROR_CODE = "config.invalid";
export declare const PROVIDER_API_ERROR_CODE = "provider.api_error";
export declare const PROVIDER_FILTERED_ERROR_CODE = "provider.filtered";
export declare const PROVIDER_RATE_LIMIT_ERROR_CODE = "provider.rate_limit";
export declare const PROVIDER_AUTH_ERROR_CODE = "provider.auth_error";
export declare const PROVIDER_CONNECTION_ERROR_CODE = "provider.connection_error";
export declare const PROVIDER_OVERLOADED_ERROR_CODE = "provider.overloaded";
export declare const CONTEXT_OVERFLOW_ERROR_CODE = "context.overflow";
export type ProviderErrorCode = typeof PROVIDER_API_ERROR_CODE | typeof PROVIDER_FILTERED_ERROR_CODE | typeof PROVIDER_RATE_LIMIT_ERROR_CODE | typeof PROVIDER_AUTH_ERROR_CODE | typeof PROVIDER_CONNECTION_ERROR_CODE | typeof PROVIDER_OVERLOADED_ERROR_CODE | typeof CONTEXT_OVERFLOW_ERROR_CODE;
export declare class ChatProviderError extends Error2 {
    readonly diagnostics: LlmErrorDiagnostics | undefined;
    readonly retryable: boolean;
    constructor(message: string, code?: ProviderErrorCode, options?: Error2Options, diagnostics?: LlmErrorDiagnostics, retryable?: boolean);
}
export declare class APIConnectionError extends ChatProviderError {
    constructor(message: string, diagnostics?: LlmErrorDiagnostics);
}
export declare class VideoUploadUnsupportedError extends ChatProviderError {
    constructor(message: string);
}
export declare class ImageUploadUnsupportedError extends ChatProviderError {
    constructor(message: string);
}
export declare class APITimeoutError extends ChatProviderError {
    constructor(message: string, diagnostics?: LlmErrorDiagnostics);
}
export declare class APIStatusError extends ChatProviderError {
    readonly statusCode?: number;
    readonly requestId: string | null;
    readonly retryAfterMs: number | null;
    readonly traceId: string | null;
    readonly retryable: boolean;
    constructor(statusCode: number | undefined, message: string, requestId?: string | null, retryAfterMs?: number | null, diagnosticsOrTraceId?: LlmErrorDiagnostics | string | null, codeOrTraceId?: string | null, retryable?: boolean, traceId?: string | null);
}
export declare class APIContextOverflowError extends APIStatusError {
    constructor(statusCode: number | undefined, message: string, requestId?: string | null, retryAfterMs?: number | null, diagnosticsOrTraceId?: LlmErrorDiagnostics | string | null, traceId?: string | null);
}
export declare class APIRequestTooLargeError extends APIStatusError {
    constructor(statusCode: number | undefined, message: string, requestId?: string | null, retryAfterMs?: number | null, diagnosticsOrTraceId?: LlmErrorDiagnostics | string | null, traceId?: string | null);
}
export declare class APIProviderRateLimitError extends APIStatusError {
    constructor(message: string, requestId?: string | null, retryAfterMs?: number | null, diagnosticsOrTraceId?: LlmErrorDiagnostics | string | null, options?: {
        readonly statusCode?: number;
    }, traceId?: string | null);
}
export declare class APIProviderQuotaExhaustedError extends APIStatusError {
    constructor(message: string, requestId?: string | null, retryAfterMs?: number | null, diagnosticsOrTraceId?: LlmErrorDiagnostics | string | null, options?: {
        readonly statusCode?: number;
    }, traceId?: string | null);
}
export declare class APIProviderOverloadedError extends APIStatusError {
    constructor(statusCode: number | undefined, message: string, requestId?: string | null, retryAfterMs?: number | null, diagnosticsOrTraceId?: LlmErrorDiagnostics | string | null, traceId?: string | null);
}
export declare class APIEmptyResponseError extends ChatProviderError {
    readonly finishReason: FinishReason | null;
    readonly rawFinishReason: string | null;
    constructor(message: string, options?: {
        readonly finishReason?: FinishReason | null;
        readonly rawFinishReason?: string | null;
        readonly diagnostics?: LlmErrorDiagnostics;
    });
}
export declare function createAbortError(): DOMException;
export declare function throwIfAbortError(error: unknown): void;
export declare function isImageFormatError(error: unknown): boolean;
export declare function isRetryableGenerateError(error: unknown): boolean;
export declare function classifyBaseApiError(message: string): ChatProviderError;
export declare function isContextOverflowErrorCode(code: string | null | undefined): boolean;
export declare function normalizeAPIStatusError(statusCode: number, message: string, requestId?: string | null, retryAfterMs?: number | null, diagnostics?: LlmErrorDiagnostics): APIStatusError;
export declare function parseTraceId(headers: unknown): string | null;
export declare function traceIdFromHeadersRecord(headers: Record<string, string> | null): string | null;
export declare function isToolExchangeAdjacencyError(error: unknown): boolean;
export declare function isRecoverableRequestStructureError(error: unknown): boolean;
export declare function isProviderRateLimitError(error: unknown): boolean;
export type ApiErrorKind = 'context_overflow' | 'overloaded' | 'rate_limit' | 'quota_exhausted' | 'auth' | '5xx_server' | '4xx_client' | 'network' | 'timeout' | 'empty_response' | 'other';
export interface ApiErrorClassification {
    readonly kind: ApiErrorKind;
    readonly statusCode?: number;
}
export declare function classifyApiError(error: unknown): ApiErrorClassification;
export declare function isLlmErrorMessage(error: unknown): error is LlmErrorMessage;
export declare function isUnauthorizedLlmError(error: unknown): boolean;
export declare function errorDiagnostics(error: unknown): LlmErrorDiagnostics | undefined;
export declare function withErrorDiagnostics<T extends Error>(error: T, diagnostics: LlmErrorDiagnostics | undefined): T;
export declare function errorFromLlmMessage(error: LlmErrorMessage, diagnostics?: LlmErrorDiagnostics): Error;
export declare function llmMessageFromError(error: unknown): LlmRemoteErrorMessage | undefined;
