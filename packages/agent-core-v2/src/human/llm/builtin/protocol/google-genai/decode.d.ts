import type { LlmRemoteErrorMessage } from '#/llm/response';
import type { DecodeSink, Decoder } from '#/llm/protocol/protocol';
export declare function replay(response: unknown): unknown[];
export declare function createDecoder(sink: DecodeSink): Decoder;
export declare function decodeError(error: unknown, source?: 'stream'): LlmRemoteErrorMessage;
