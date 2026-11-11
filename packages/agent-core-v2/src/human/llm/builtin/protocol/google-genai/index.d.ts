import { GoogleGenAI as GenAIClient } from '@google/genai';
import type { GoogleGenAIExtraParams } from './extra-params';
import { type Request } from './lower';
export type { GoogleGenAIParams, Request as GoogleGenAIRequest, NativeMessage as GoogleGenAINativeMessage, NativePart as GoogleGenAINativePart, } from './lower';
export interface GoogleGenAIOptions {
    readonly vertexai?: boolean;
    readonly extras?: GoogleGenAIExtraParams;
}
export declare const googleGenAIProtocol: import("#/llm/protocol/protocol").DefinedProtocol<GoogleGenAIOptions, import("./contract").GoogleContent, Readonly<Record<string, unknown>>, import("./lower").GoogleGenAIParams, Request, unknown, unknown, GenAIClient>;
