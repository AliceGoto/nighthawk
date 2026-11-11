export interface ToolDescription {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    deferred?: true;
}
export interface ContentPartMeta {
    readonly kind?: string;
    readonly [key: string]: unknown;
}
export interface ContentPartBase {
    contentType?: string;
    meta?: ContentPartMeta;
}
export interface TextPart extends ContentPartBase {
    type: 'text';
    text: string;
}
export interface ThinkPart extends ContentPartBase {
    type: 'think';
    think: string;
    encrypted?: string;
    detailsIndex?: number;
    hidden?: boolean;
    reasoningKey?: string;
}
export interface ImageURLPart {
    type: 'image_url';
    imageUrl: {
        url: string;
        id?: string;
        name?: string;
    };
}
export interface AudioURLPart {
    type: 'audio_url';
    audioUrl: {
        url: string;
        id?: string;
    };
}
export interface VideoURLPart {
    type: 'video_url';
    videoUrl: {
        url: string;
        id?: string;
        name?: string;
    };
}
export type MediaPart = ImageURLPart | AudioURLPart | VideoURLPart;
export declare function isMediaPart(part: ContentPart): part is MediaPart;
export type MediaKind = 'image' | 'video' | 'audio';
export declare function mediaKindOfPart(part: MediaPart): MediaKind;
export declare function mediaKeyOf(part: MediaPart): string;
export type MediaPlaceholderReason = 'degraded' | 'stripped' | 'budget' | 'unsupported' | 'protocol_unsupported' | 'unavailable';
export declare function mediaPlaceholderText(kind: MediaKind, reason: MediaPlaceholderReason): string;
export type ContentPart = TextPart | ThinkPart | ImageURLPart | AudioURLPart | VideoURLPart;
export interface ToolCall {
    type: 'function';
    id: string;
    name: string;
    arguments: string | null;
    extras?: Record<string, unknown>;
    rawId?: string;
    _streamIndex?: number | string;
}
export interface ToolCallPart {
    type: 'tool_call_part';
    argumentsPart: string | null;
    index?: number | string;
}
export type StreamedMessagePart = ContentPart | ToolCall | ToolCallPart;
export interface SystemMessage {
    readonly role: 'system';
    content: ContentPart[];
    readonly tools?: ToolDescription[];
}
export interface UserMessage {
    readonly role: 'user';
    content: ContentPart[];
}
export interface AssistantMessage {
    readonly role: 'assistant';
    content: ContentPart[];
    toolCalls: ToolCall[];
}
export interface ToolMessage {
    readonly role: 'tool';
    content: ContentPart[];
    readonly toolCallId: string;
}
export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;
export declare function isVacuousContentPart(part: ContentPart): boolean;
export declare function extractText(message: {
    readonly content: readonly ContentPart[];
}, sep?: string): string;
export declare function createUserMessage(content: string): UserMessage;
export declare function createAssistantMessage(content: ContentPart[], toolCalls?: ToolCall[]): AssistantMessage;
export declare function createToolMessage(toolCallId: string, output: string | ContentPart[]): ToolMessage;
export declare function isContentPart(part: StreamedMessagePart): part is ContentPart;
export declare function isToolCall(part: StreamedMessagePart): part is ToolCall;
export declare function isToolCallPart(part: StreamedMessagePart): part is ToolCallPart;
export declare function mergeInPlace(target: StreamedMessagePart, source: StreamedMessagePart): boolean;
export declare function salvageInterruptedMessage(message: AssistantMessage): AssistantMessage | null;
export interface MessageAccumulator {
    push(part: StreamedMessagePart): void;
    toolCallEnd(index?: number | string): ToolCall | undefined;
    finish(): AssistantMessage;
}
export declare function createMessageAccumulator(): MessageAccumulator;
