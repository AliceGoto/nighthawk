import OpenAI from 'openai';
import { type ToolMessageConversion } from '#/llm/protocol/protocol';
import { type RawChunk, type RawResponse } from './decode';
import type { OpenAIExtraParams } from './extra-params';
import { type NativeMessage, type OpenAIParams, type Request } from './lower';
export { KNOWN_REASONING_KEYS as OPENAI_REASONING_KEYS } from './decode';
export type { RawChunk as OpenAIRawChunk, RawResponse as OpenAIRawResponse, RawStreamToolCallDelta as OpenAIRawStreamToolCallDelta, RawUsage as OpenAIRawUsage, } from './decode';
export { lowerMessage, openAIPipeline, type NativeMessage as OpenAINativeMessage, type OpenAILowerContext, type Request as OpenAIRequest, type NativePart as OpenAINativePart, type NativeToolCall as OpenAINativeToolCall, type OpenAIParams, } from './lower';
export { openAIModelLegality, resolveOpenAIReasoningKey } from './legalize';
export interface OpenAIOptions {
    readonly extras?: OpenAIExtraParams;
    readonly reasoningKey?: string;
    readonly detectedReasoningKey?: string;
    readonly onReasoningKey?: (reasoningKey: string) => void;
    readonly toolMessageConversion?: ToolMessageConversion;
}
export declare const openAIProtocol: import("#/llm/protocol/protocol").DefinedProtocol<OpenAIOptions, NativeMessage, Readonly<Record<string, unknown>>, OpenAIParams, Request, RawResponse, RawChunk, OpenAI>;
