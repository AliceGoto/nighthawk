import Anthropic from '@anthropic-ai/sdk';
import { type RawChunk, type RawResponse } from './decode';
import type { AnthropicExtraParams } from './extra-params';
import { type AnthropicParams, type Request } from './lower';
export { CONTEXT_MANAGEMENT_BETA } from './contract';
export type { RawBlock as AnthropicRawBlock, RawChunk as AnthropicRawChunk, RawResponse as AnthropicRawResponse, RawUsage as AnthropicRawUsage, } from './decode';
export type { AnthropicExtraParams } from './extra-params';
export { lowerMessage, type AnthropicParams, type Request as AnthropicRequest, type NativeMessage as AnthropicNativeMessage, type NativePart as AnthropicNativePart, } from './lower';
export interface AnthropicOptions {
    readonly betaApi?: boolean;
    readonly extras?: AnthropicExtraParams;
}
export declare const anthropicProtocol: import("#/llm/protocol/protocol").DefinedProtocol<AnthropicOptions, import("./contract").AnthropicWireMessage, Readonly<Record<string, unknown>>, AnthropicParams, Request, RawResponse, RawChunk, Anthropic>;
