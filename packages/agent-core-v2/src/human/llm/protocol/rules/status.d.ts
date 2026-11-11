import type { LlmRemoteErrorMessage } from '#/llm/response';
export declare function toLlmTransportErrorMessage(message: string): LlmRemoteErrorMessage;
export declare function withoutUndefinedStatusCode(error: LlmRemoteErrorMessage): LlmRemoteErrorMessage;
export interface LlmStatusErrorInput {
    readonly statusCode?: number;
    readonly message: string;
    readonly requestId?: string | null;
    readonly retryAfterMs?: number | null;
    readonly headers?: Record<string, string> | null;
    readonly retryable?: boolean;
}
export declare function toLlmStreamErrorMessage(input: Omit<LlmStatusErrorInput, 'statusCode'> & {
    readonly businessCode?: number;
}): LlmRemoteErrorMessage;
export declare function toLlmStatusErrorMessage(input: LlmStatusErrorInput): LlmRemoteErrorMessage;
