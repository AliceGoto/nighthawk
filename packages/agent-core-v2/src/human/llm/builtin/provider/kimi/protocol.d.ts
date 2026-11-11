import { type OpenAINativeMessage, type OpenAIRawChunk } from '#/llm/builtin/protocol/openai/index';
export declare const NIGHTHAWK_DEFAULT_BASE_URL = "https://api.moonshot.ai/v1";
export interface NightHawkThinkingConfig {
    type?: 'enabled' | 'disabled';
    effort?: string;
    keep?: unknown;
    [key: string]: unknown;
}
export declare const nighthawkOpenAIProtocol: import("#/llm/protocol/protocol").DefinedProtocol<import("#/llm/builtin/protocol/openai/index").OpenAIOptions, OpenAINativeMessage, Readonly<Record<string, unknown>>, import("#/llm/builtin/protocol/openai/index").OpenAIParams, import("#/llm/builtin/protocol/openai/index").OpenAIRequest, import("#/llm/builtin/protocol/openai/index").OpenAIRawResponse, OpenAIRawChunk, import("openai").OpenAI>;
export declare const nighthawkAnthropicProtocol: import("#/llm/protocol/protocol").DefinedProtocol<import("#/llm/builtin/protocol/anthropic/index").AnthropicOptions, import("../../protocol/anthropic/contract").AnthropicWireMessage, Readonly<Record<string, unknown>>, import("#/llm/builtin/protocol/anthropic/index").AnthropicParams, import("#/llm/builtin/protocol/anthropic/index").AnthropicRequest, import("#/llm/builtin/protocol/anthropic/index").AnthropicRawResponse, import("#/llm/builtin/protocol/anthropic/index").AnthropicRawChunk, import("@anthropic-ai/sdk").Anthropic>;
export declare const nighthawkResponsesProtocol: import("#/llm/protocol/protocol").DefinedProtocol<import("#/llm/builtin/protocol/openai-responses/index").OpenAIResponsesOptions, import("../../protocol/openai-responses/contract").ResponsesInputItem, Readonly<Record<string, unknown>>, import("#/llm/builtin/protocol/openai-responses/index").OpenAIResponsesParams, import("#/llm/builtin/protocol/openai-responses/index").OpenAIResponsesRequest, import("#/llm/builtin/protocol/openai-responses/index").OpenAIResponsesRawResponse, import("#/llm/builtin/protocol/openai-responses/index").OpenAIResponsesRawChunk, import("openai").OpenAI>;
