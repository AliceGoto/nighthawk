import type { ContentPart, Message, ToolDescription as Tool } from '#human/llm/message';
export interface TokenCharCounts {
    readonly ascii: number;
    readonly nonAscii: number;
}
export declare function countTokenChars(text: string): TokenCharCounts;
export declare function tokensForCharCounts(counts: TokenCharCounts): number;
export declare function estimateTokens(text: string): number;
export declare function estimateTokensForMessages(messages: readonly Message[]): number;
export declare function estimateTokensForTools(tools: readonly Tool[]): number;
export declare function estimateTokensForMessage(message: Message): number;
export declare function estimateTokensForContentParts(parts: readonly ContentPart[]): number;
export declare const MEDIA_TOKEN_ESTIMATE = 2000;
export declare function estimateTokensForContentPart(part: ContentPart): number;
