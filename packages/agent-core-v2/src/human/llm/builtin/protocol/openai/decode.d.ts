import type { LlmRemoteErrorMessage } from '#/llm/response';
import type { StreamedMessagePart } from '#/llm/message';
import type { DecodeSink, Decoder } from '#/llm/protocol/protocol';
import type { TokenUsage } from '#/llm/response';
export type RawUsage = {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
    prompt_tokens_details?: {
        cached_tokens?: number;
    } | null;
};
export type RawStreamToolCallDelta = {
    index?: number | string;
    id?: string;
    function?: {
        name?: string;
        arguments?: string;
    } | null;
};
export type RawChunk = {
    id?: string;
    choices?: {
        delta?: {
            content?: string | null;
            reasoning_content?: string | null;
            tool_calls?: RawStreamToolCallDelta[];
        };
        finish_reason?: string | null;
    }[];
    usage?: RawUsage | null;
};
type RawToolCall = {
    id?: string;
    type?: string;
    function?: {
        name?: string;
        arguments?: string;
    } | null;
};
export type RawResponse = {
    id?: string;
    choices?: {
        message?: {
            content?: string | null;
            reasoning_content?: string | null;
            tool_calls?: RawToolCall[];
        } | null;
        finish_reason?: string | null;
    }[];
    usage?: RawUsage | null;
};
export declare const KNOWN_REASONING_KEYS: readonly string[];
export declare const DEFAULT_REASONING_KEY: string;
export declare const REASONING_DETAILS_KEY = "reasoning_details";
export declare function extractReasoningStrings(source: unknown): {
    key: string;
    value: string;
}[];
export interface ReasoningDetailsElement {
    readonly type?: string;
    readonly index: number;
    readonly summary?: string;
    readonly encrypted?: string;
}
export declare function extractReasoningDetails(source: unknown): ReasoningDetailsElement[] | undefined;
export declare function convertReasoningDetails(elements: readonly ReasoningDetailsElement[], hiddenSummary?: boolean): StreamedMessagePart[];
export declare function parseUsage(usage: RawUsage | null | undefined): Partial<TokenUsage> | undefined;
export declare function replay(response: RawResponse): RawChunk[];
export declare function createDecoder(sink: DecodeSink, reasoningKey?: string, onReasoningKey?: (reasoningKey: string) => void): Decoder<RawChunk>;
export declare function isOpenAIInsufficientQuotaCode(code: string | null | undefined): boolean;
export declare function isContextOverflowErrorCode(code: string | null | undefined): boolean;
export declare function isOpenAIRateLimitErrorCode(code: string | null | undefined): boolean;
export declare function isOpenAIOverloadedErrorCode(code: string | null | undefined): boolean;
export declare function decodeError(error: unknown, source?: 'stream'): LlmRemoteErrorMessage;
export declare function convertOpenAIError(error: unknown, classifyErrorHook?: (error: unknown) => LlmRemoteErrorMessage | undefined): LlmRemoteErrorMessage;
export {};
