import { type FinishReason } from '#human/llm-requester/finish-reason';
import type { ThinkingRequestOptions } from '#human/llm-requester/thinking';
import { type StreamedMessagePart } from '#human/llm/message';
import type { LlmRequestConfig, LlmRequestContent, LlmRequester } from '#human/llm-requester/requester';
import type { AssistantMessage, Message, ToolDescription as Tool } from '#human/llm/message';
import type { TokenUsage } from '#human/llm-requester/usage';
import type { InitializedLlmRequester, ModelRequestEvent, ModelRequestInput, ModelRequestParams, ModelRequestTiming, SamplingOptions } from '#/llm-adapter/model/generate';
import type { Model } from '#/llm-adapter/model/catalog';
import { type GenerateCall } from './snapshots';
export interface LegacyGenerateResult {
    readonly id: string | null;
    readonly message: AssistantMessage;
    readonly usage: TokenUsage | null;
    readonly finishReason: FinishReason | null;
    readonly rawFinishReason: string | null;
    readonly requestId?: string | null;
}
export type LegacyGenerateFn = (provider: {
    readonly name: string;
    readonly modelName: string;
}, systemPrompt: string, tools: readonly Tool[], history: Message[], callbacks?: {
    onMessagePart?: (part: StreamedMessagePart) => void | Promise<void>;
}, options?: {
    readonly signal?: AbortSignal;
    readonly auth?: {
        readonly apiKey?: string;
    };
    readonly cacheKey?: string;
    readonly sampling?: SamplingOptions;
    readonly thinking?: ThinkingRequestOptions;
    readonly maxCompletionTokens?: number;
    readonly maxContextTokens?: number;
    readonly usedContextTokens?: number;
}) => Promise<LegacyGenerateResult>;
export declare function generateCallOf(config: LlmRequestConfig, content: LlmRequestContent): GenerateCall;
export declare function requesterFromGenerateFn(fn: LegacyGenerateFn): LlmRequester;
export declare function createScriptedGenerate(): {
    requester: LlmRequester;
    calls: GenerateCall[];
    lastInput(): import("./snapshots").GenerateInputSnapshot;
    inputs(): import("./snapshots").GenerateInputsSnapshot;
    mockNextResponse: (...response: StreamedMessagePart[]) => void;
    mockNextProviderResponse: (input: {
        readonly parts?: readonly StreamedMessagePart[] | undefined;
        readonly finishReason?: FinishReason | null | undefined;
        readonly rawFinishReason?: string | null | undefined;
        readonly requestId?: string | null | undefined;
        readonly error?: Error | undefined;
    }) => void;
};
export declare function coreRequesterFromA(initial: InitializedLlmRequester, requester: LlmRequester): InitializedLlmRequester;
export interface ModelEventRequester {
    readonly model: Model;
    request(input: ModelRequestInput, signal?: AbortSignal, params?: ModelRequestParams): AsyncIterable<ModelRequestEvent>;
}
export declare function aRequesterFromModelEvents(requester: ModelEventRequester): LlmRequester;
interface StreamDecodeStats {
    readonly serverDecodeMs: number;
    readonly clientConsumeMs: number;
    readonly clientBlockedMs?: number;
}
export declare function buildStreamTiming(requestStartedAt: number, requestSentAt: number | undefined, firstChunkAt: number, streamEndedAt: number | undefined, decodeStats: StreamDecodeStats | undefined): ModelRequestTiming;
export {};
