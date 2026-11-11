import type { LlmErrorMessage, LlmRemoteErrorMessage } from '#/llm/response';
export declare class SyntaxRequestFormatError extends Error {
    toLlmErrorMessage(): LlmErrorMessage<'syntax'>;
}
export declare function toLlmSyntaxErrorMessage(error: unknown): LlmErrorMessage<'syntax'>;
type ThinkingConfigErrorCode = 'thinking-unsupported' | 'thinking-cannot-disable' | 'off-needs-offeffort' | 'effort-unsupported';
export declare class ThinkingConfigError extends SyntaxRequestFormatError {
    readonly code: ThinkingConfigErrorCode;
    constructor(code: ThinkingConfigErrorCode, message: string);
    toLlmErrorMessage(): LlmErrorMessage<'syntax'>;
}
export declare function unresolvedMediaRefError(ref: string): SyntaxRequestFormatError;
export declare function isAbortError(error: unknown): boolean;
export declare function errorText(error: unknown): string;
export declare function toLlmErrorMessage(error: unknown): LlmRemoteErrorMessage;
export {};
