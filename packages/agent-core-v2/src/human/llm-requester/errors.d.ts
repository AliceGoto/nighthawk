import type { FinishReason } from '#/llm-requester/finish-reason';
export declare function sanitizeStatusErrorMessage(message: string): string;
export declare function isAbortError(error: unknown): boolean;
export declare function errorStatusCode(error: unknown): number | undefined;
export type LlmErrorKind = 'syntax' | 'abort' | 'connection' | 'timeout' | 'status' | 'rate_limit' | 'quota_exhausted' | 'overloaded' | 'context_overflow' | 'request_too_large' | 'request_structure' | 'image_format' | 'empty_response' | 'provider' | 'unknown';
export type LlmRemoteErrorKind = Exclude<LlmErrorKind, 'syntax'>;
export type LlmSyntaxErrorCode = 'request_format' | 'thinking_config' | 'internal';
export type LlmStatusErrorKind = 'status' | 'rate_limit' | 'quota_exhausted' | 'overloaded' | 'context_overflow' | 'request_too_large' | 'request_structure' | 'image_format';
export interface LlmStatusErrorInfo {
    readonly statusCode?: number;
    readonly requestId: string | null;
    readonly retryAfterMs: number | null;
    readonly headers: Record<string, string> | null;
    readonly retryable: boolean;
}
export type LlmErrorMessage<T extends LlmErrorKind = LlmErrorKind> = T extends LlmStatusErrorKind ? {
    readonly kind: T;
    readonly message: string;
} & LlmStatusErrorInfo : T extends 'syntax' ? {
    readonly kind: T;
    readonly message: string;
    readonly code: LlmSyntaxErrorCode;
} : T extends 'empty_response' ? {
    readonly kind: T;
    readonly message: string;
    readonly finishReason: FinishReason | null;
    readonly rawFinishReason: string | null;
    readonly retryable: boolean;
} : {
    readonly kind: T;
    readonly message: string;
    readonly retryable: boolean;
};
export type LlmRemoteErrorMessage = LlmErrorMessage<LlmRemoteErrorKind>;
export declare function llmStatusErrorMessage(error: LlmErrorMessage): LlmErrorMessage<LlmStatusErrorKind> | null;
export declare function toLlmErrorMessage(error: unknown): LlmRemoteErrorMessage;
export declare function toLlmTransportErrorMessage(message: string): LlmRemoteErrorMessage;
export declare function appendThinkingEffortConfigHint(statusCode: number, message: string): string;
export interface LlmStatusErrorInput {
    readonly statusCode?: number;
    readonly message: string;
    readonly requestId?: string | null;
    readonly retryAfterMs?: number | null;
    readonly headers?: Record<string, string> | null;
    readonly retryable?: boolean;
}
export declare function toLlmStatusErrorMessage(input: LlmStatusErrorInput): LlmRemoteErrorMessage;
export declare function parseRetryAfterMs(headers: unknown): number | null;
export declare function headersToRecord(headers: unknown): Record<string, string> | null;
export declare function isContextOverflowStatusError(statusCode: number, message: string): boolean;
export declare function isProviderOverloadStatusError(statusCode: number, message: string): boolean;
export declare function isRequestTooLargeStatusError(statusCode: number, message: string): boolean;
export declare function isToolExchangeAdjacencyStatusError(statusCode: number, message: string): boolean;
export declare function isRequestStructureStatusError(statusCode: number, message: string): boolean;
export declare function isImageFormatStatusError(statusCode: number, message: string): boolean;
