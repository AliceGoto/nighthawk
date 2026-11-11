import type Anthropic from '@anthropic-ai/sdk';
import type { Message } from '#/llm/message';
import type { PipelineSpec } from '#/llm/protocol/pipeline';
import type { MediaSupport } from '#/llm/protocol/rules/media';
import type { AnthropicWireContentBlock, AnthropicWireMessage } from './contract';
import type { AnthropicOptions } from './index';
export type NativePart = AnthropicWireContentBlock;
export type NativeMessage = AnthropicWireMessage;
export type NativeTool = Readonly<Record<string, unknown>>;
export type AnthropicParams = {
    readonly thinking?: Record<string, unknown>;
    readonly output_config?: Record<string, unknown>;
    readonly max_tokens?: number;
    readonly metadata?: {
        readonly user_id: string;
    };
    readonly context_management?: {
        readonly edits?: readonly {
            readonly type: string;
            readonly keep?: string;
        }[];
    };
    readonly betaFeatures?: readonly string[];
    readonly temperature?: number;
    readonly top_p?: number;
    readonly top_k?: number;
    readonly stop_sequences?: readonly string[];
} & Readonly<Record<string, unknown>>;
export interface Request {
    readonly params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'stream'>;
    readonly betas: readonly string[];
    readonly useBetaApi: boolean;
}
export declare function lowerMessage(message: Message, acceptedMimes?: ReadonlySet<string>): NativeMessage[];
export declare const anthropicMedia: MediaSupport;
export declare const anthropicPipeline: PipelineSpec<AnthropicOptions, NativeMessage, NativeTool, AnthropicParams, Request>;
