import { type AssistantMessage, type Message, type StreamedMessagePart } from '#/llm/message';
export interface ToolCallIdPolicy {
    normalize: (id: string) => string;
    maxLength?: number;
}
export interface ToolCallIdNormalizer {
    normalizePart(part: StreamedMessagePart): StreamedMessagePart;
    finish(message: AssistantMessage): AssistantMessage;
}
export declare function legalizeToolCallIds(messages: readonly Message[], policy: ToolCallIdPolicy | undefined): readonly Message[];
export declare function createToolCallIdNormalizer(history: readonly Message[], policy?: ToolCallIdPolicy): ToolCallIdNormalizer;
