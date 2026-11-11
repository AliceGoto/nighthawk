import OpenAI from 'openai';
import { type ToolMessageConversion } from '#/llm/protocol/protocol';
import { type RawChunk, type RawResponse } from './decode';
import type { OpenAIResponsesExtraParams } from './extra-params';
import { type OpenAIResponsesParams, type Request } from './lower';
export type { RawChunk as OpenAIResponsesRawChunk, RawResponse as OpenAIResponsesRawResponse, RawUsage as OpenAIResponsesRawUsage, } from './decode';
export { openAIResponsesModelLegality } from './legalize';
export { openAIResponsesPipeline, type Request as OpenAIResponsesRequest, type NativeMessage as OpenAIResponsesNativeMessage, type NativePart as OpenAIResponsesNativePart, type OpenAIResponsesParams, } from './lower';
export interface OpenAIResponsesOptions {
    readonly extras?: OpenAIResponsesExtraParams;
    readonly toolMessageConversion?: ToolMessageConversion;
}
export declare const openAIResponsesProtocol: import("#/llm/protocol/protocol").DefinedProtocol<OpenAIResponsesOptions, import("./contract").ResponsesInputItem, Readonly<Record<string, unknown>>, OpenAIResponsesParams, Request, RawResponse, RawChunk, OpenAI>;
