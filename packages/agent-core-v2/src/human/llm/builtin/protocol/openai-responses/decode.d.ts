import type { DecodeSink, Decoder } from '#/llm/protocol/protocol';
export type RawChunk = Record<string, unknown>;
export type RawResponse = Record<string, unknown>;
export type RawUsage = {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: {
        cached_tokens?: number;
    } | null;
};
type RawObject = Record<string, unknown>;
export declare function asRawObject(value: unknown): RawObject | null;
export declare function replay(response: RawResponse): RawChunk[];
export declare function createDecoder(sink: DecodeSink): Decoder<RawChunk>;
export {};
