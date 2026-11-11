import type { Message } from '#/llm/message';
import { type ToolCallIdPolicy } from '#/llm/protocol/rules/tool-call-ids';
export { sanitizeToolCallId } from '#/llm/protocol/kit/ids';
export declare function sanitizeOpenAIResponsesCallId(id: string, maxLength?: number): string;
export declare function normalizeToolCallIdsForProvider(messages: readonly Message[], policy: ToolCallIdPolicy): Message[];
