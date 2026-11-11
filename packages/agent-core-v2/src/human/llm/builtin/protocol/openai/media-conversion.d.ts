import type { Message } from '#/llm/message';
import type { Pattern } from '#/llm/protocol/pattern';
import type { ToolMessageConversion } from '#/llm/protocol/protocol';
export declare const TOOL_RESULT_MEDIA_PROMPT = "Attached media from tool result:";
export declare const TOOL_RESULT_MEDIA_PLACEHOLDER = "(see attached media)";
export declare const extractToolMedia: Pattern<Message>;
export declare function openAIMediaConversionPatterns(conversion: ToolMessageConversion | undefined): readonly Pattern<Message>[];
