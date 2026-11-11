import type { Message } from '#/llm/message';
import type { ModelLegality } from '#/llm/protocol/rules/model';
import type { Pattern } from '#/llm/protocol/pattern';
export declare function resolveOpenAIReasoningKey(messages: readonly Message[], reasoningKey?: string, detectedReasoningKey?: string): string;
export declare function openAIThinkingHistoryPatterns(messages: readonly Message[], reasoningKey?: string, detectedReasoningKey?: string): readonly Pattern<Message>[];
export declare const openAIModelLegality: ModelLegality;
