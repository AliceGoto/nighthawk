export { classifyNightHawkQuotaError } from './errors';
export { NIGHTHAWK_DEFAULT_BASE_URL, nighthawkAnthropicProtocol, nighthawkOpenAIProtocol, nighthawkResponsesProtocol } from './protocol';
export declare const nighthawkRequester: import("#/llm/requester").LlmRequester<"endpoint" | "protocol">;
export declare const nighthawkAnthropicRequester: import("#/llm/requester").LlmRequester<"endpoint" | "protocol">;
export declare const nighthawkResponsesRequester: import("#/llm/requester").LlmRequester<"endpoint" | "protocol">;
export declare const nighthawkRequesters: {
    readonly openai: import("#/llm/requester").LlmRequester<"endpoint" | "protocol">;
    readonly anthropic: import("#/llm/requester").LlmRequester<"endpoint" | "protocol">;
    readonly openai_responses: import("#/llm/requester").LlmRequester<"endpoint" | "protocol">;
};
