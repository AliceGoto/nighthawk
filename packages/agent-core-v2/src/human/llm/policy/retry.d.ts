import { type LlmErrorMessage } from '#/llm/response';
export declare const DEFAULT_MAX_RETRY_ATTEMPTS = 10;
export interface LlmRetryOptions {
    readonly maxAttemptsPerStep?: number;
    readonly infiniteRetry?: boolean;
}
export type LlmRetryable = (error: LlmErrorMessage) => boolean;
export declare function resolveMaxAttempts(options: LlmRetryOptions | undefined): number;
export declare function retryBackoffDelay(attemptIndex: number): number;
export declare function readRetryAfterMs(error: LlmErrorMessage): number | undefined;
export declare function isRetryableError(error: LlmErrorMessage, extras?: readonly LlmRetryable[]): boolean;
export declare function shouldRetry(options: LlmRetryOptions | undefined, attempt: number, error: LlmErrorMessage, extras?: readonly LlmRetryable[]): boolean;
