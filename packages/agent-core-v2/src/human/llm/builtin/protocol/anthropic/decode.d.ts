import type { LlmRemoteErrorMessage } from '#/llm/response';
import type { DecodeSink, Decoder } from '#/llm/protocol/protocol';
export type RawUsage = {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
};
export type RawBlock = {
    type: string;
    text?: string;
    thinking?: string;
    signature?: string;
    data?: string;
    id?: string;
    name?: string;
    input?: unknown;
};
export type RawResponse = {
    id?: string;
    stop_reason?: string | null;
    usage?: RawUsage;
    content?: RawBlock[];
};
export type RawChunk = {
    type: string;
    index?: number;
    content_block?: RawBlock;
    delta?: {
        type?: string;
        text?: string;
        thinking?: string;
        partial_json?: string;
        signature?: string;
        stop_reason?: string | null;
        stop_sequence?: string | null;
    };
    message?: {
        id?: string;
        usage?: RawUsage;
    };
    usage?: RawUsage;
};
export declare function replay(response: RawResponse): RawChunk[];
export declare function createDecoder(sink: DecodeSink): Decoder<RawChunk>;
export declare function decodeError(error: unknown, source?: 'stream'): LlmRemoteErrorMessage;
