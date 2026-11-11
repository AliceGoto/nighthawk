import type { LlmRequest, LlmRequestModel, LlmProtocolBinding, LlmEndpoint, LlmSampling } from '#human/llm/request';
import { type LlmRequester } from '#human/llm/requester';
import type { LlmRunEvent } from '#human/llm/response';
import type { LlmRecovery, LlmRecoveryLedger } from '#human/llm/policy/recovery';
import type { LlmResolver } from '#human/llm/policy/resolver';
import type { FinishReason } from '#human/llm-requester/finish-reason';
import type { ResponseFormat } from '#human/llm-requester/response-format';
import type { ThinkingEffort } from '#human/llm-requester/thinking';
import type { TokenUsage } from '#human/llm-requester/usage';
import type { AssistantMessage, Message, StreamedMessagePart, ToolDescription as Tool } from '#human/llm/message';
export type SamplingOptions = LlmSampling;
export interface ModelRequestInput {
    readonly systemPrompt: string;
    readonly tools?: readonly Tool[];
    readonly messages: readonly Message[];
    readonly responseFormat?: ResponseFormat;
}
export interface ModelRequestTiming {
    readonly firstTokenLatencyMs: number;
    readonly streamDurationMs: number;
    readonly requestBuildMs?: number;
    readonly serverFirstTokenMs?: number;
    readonly serverDecodeMs?: number;
    readonly clientConsumeMs?: number;
    readonly clientBlockedMs?: number;
}
export type ModelRequestEvent = {
    readonly type: 'part';
    readonly part: StreamedMessagePart;
} | {
    readonly type: 'usage';
    readonly usage: TokenUsage;
    readonly model?: string;
} | {
    readonly type: 'finish';
    readonly message: AssistantMessage;
    readonly providerFinishReason?: FinishReason;
    readonly rawFinishReason?: string;
    readonly id?: string;
    readonly requestId?: string;
} | ({
    readonly type: 'timing';
} & ModelRequestTiming);
export interface ModelRequestParams {
    readonly cacheKey?: string;
    readonly sampling?: SamplingOptions;
    readonly thinkingEffort?: ThinkingEffort;
    readonly thinkingKeep?: string;
    readonly maxCompletionTokens?: number;
    readonly usedContextTokens?: number;
    readonly maxContextTokens?: number;
    readonly stream?: boolean;
    readonly onRequestId?: (requestId: string | undefined) => void;
}
export interface ModelRequestPolicy {
    readonly recoveries: readonly LlmRecovery[];
    readonly resolvers?: readonly LlmResolver[];
    readonly recoveryLedger?: LlmRecoveryLedger;
    readonly onAttempt?: (input: ModelRequestInput, request: LlmRequest) => void;
    readonly onRecovery?: (event: Extract<LlmRunEvent, {
        readonly reason: 'recovery';
    }>) => void;
}
export interface LlmRequestInitialization {
    readonly protocol: LlmProtocolBinding;
    readonly endpoint?: LlmEndpoint;
    readonly model: LlmRequestModel;
}
export type InitializedLlmRequester = LlmRequester<'protocol' | 'model' | 'endpoint'>;
export declare function effectiveMaxCompletionTokens(params?: ModelRequestParams): number | undefined;
export declare function generateModel(initial: InitializedLlmRequester, input: ModelRequestInput, signal: AbortSignal | undefined, params?: ModelRequestParams, policy?: ModelRequestPolicy): AsyncIterable<ModelRequestEvent>;
