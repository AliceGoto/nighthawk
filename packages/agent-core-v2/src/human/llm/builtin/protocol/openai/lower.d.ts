import type OpenAI from 'openai';
import { type Message } from '#/llm/message';
import type { LlmModelSpec, ThinkingRequestOptions } from '#/llm/request';
import type { PipelineSpec } from '#/llm/protocol/pipeline';
import type { ToolMessageConversion } from '#/llm/protocol/protocol';
import type { MediaSupport } from '#/llm/protocol/rules/media';
import type { OpenAIContentPart, OpenAIWireMessage, OpenAIWireToolCall } from './contract';
import type { OpenAIOptions } from './index';
export type NativePart = OpenAIContentPart;
export type NativeToolCall = OpenAIWireToolCall;
export type NativeMessage = OpenAIWireMessage & {
    [extension: string]: unknown;
};
export type NativeTool = Readonly<Record<string, unknown>>;
export type OpenAIParams = {
    readonly prompt_cache_key?: string;
    readonly reasoning_effort?: string;
    readonly response_format?: Record<string, unknown>;
    readonly max_tokens?: number;
    readonly max_completion_tokens?: number;
    readonly temperature?: number;
    readonly top_p?: number;
    readonly top_k?: number;
    readonly stop?: readonly string[];
    readonly seed?: number;
    readonly presence_penalty?: number;
    readonly frequency_penalty?: number;
} & Readonly<Record<string, unknown>>;
export interface Request {
    readonly params: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'stream'>;
}
export interface OpenAILowerContext {
    readonly reasoningKey: string;
    readonly preserveThinking: boolean;
    readonly toolMessageConversion: ToolMessageConversion | undefined;
}
export declare function lowerMessage(message: Message, lower: OpenAILowerContext): NativeMessage[];
export declare function resolveReasoningEffort(thinking: ThinkingRequestOptions, model: LlmModelSpec): string | undefined;
export declare const openAIChatMedia: MediaSupport;
export declare const openAIPipeline: PipelineSpec<OpenAIOptions, NativeMessage, NativeTool, OpenAIParams, Request>;
