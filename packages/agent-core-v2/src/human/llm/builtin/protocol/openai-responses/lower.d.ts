import type OpenAI from 'openai';
import type { PipelineSpec } from '#/llm/protocol/pipeline';
import type { MediaSupport } from '#/llm/protocol/rules/media';
import type { ResponsesInputContentItem, ResponsesInputItem } from './contract';
import type { OpenAIResponsesOptions } from './index';
export type NativePart = ResponsesInputContentItem;
export type NativeMessage = ResponsesInputItem;
export type NativeTool = Readonly<Record<string, unknown>>;
export type OpenAIResponsesParams = {
    readonly prompt_cache_key?: string;
    readonly reasoning?: {
        readonly effort?: string;
        readonly summary?: string;
    };
    readonly include?: readonly string[];
    readonly text?: Record<string, unknown>;
    readonly max_output_tokens?: number;
    readonly temperature?: number;
    readonly top_p?: number;
} & Readonly<Record<string, unknown>>;
export interface Request {
    readonly params: Omit<OpenAI.Responses.ResponseCreateParamsNonStreaming, 'stream'>;
}
export declare const openAIResponsesMedia: MediaSupport;
export declare const openAIResponsesPipeline: PipelineSpec<OpenAIResponsesOptions, NativeMessage, NativeTool, OpenAIResponsesParams, Request>;
