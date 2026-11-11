import type { GenerateContentParameters } from '@google/genai';
import type { Message } from '#/llm/message';
import type { PipelineSpec } from '#/llm/protocol/pipeline';
import type { LlmModule } from '#/llm/protocol/protocol';
import type { MediaSupport } from '#/llm/protocol/rules/media';
import type { GoogleContent, GooglePart } from './contract';
import type { GoogleGenAIOptions } from './index';
export type NativeMessage = GoogleContent;
export type NativePart = GooglePart;
export type NativeTool = Readonly<Record<string, unknown>>;
export type GoogleGenAIParams = {
    readonly thinkingConfig?: Record<string, unknown>;
    readonly responseMimeType?: string;
    readonly responseJsonSchema?: Record<string, unknown>;
    readonly responseSchema?: unknown;
    readonly maxOutputTokens?: number;
    readonly temperature?: number;
    readonly topP?: number;
    readonly topK?: number;
    readonly stopSequences?: readonly string[];
    readonly seed?: number;
    readonly presencePenalty?: number;
    readonly frequencyPenalty?: number;
} & Readonly<Record<string, unknown>>;
export interface Request {
    readonly params: GenerateContentParameters;
}
type GoogleGenAIModule = LlmModule<GoogleGenAIOptions>;
export declare function lowerMessage(message: Message, module: GoogleGenAIModule): NativeMessage[];
export declare const googleGenAIMedia: MediaSupport;
export declare const googleGenAIPipeline: PipelineSpec<GoogleGenAIOptions, NativeMessage, NativeTool, GoogleGenAIParams, Request>;
export {};
