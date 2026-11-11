import { type MediaKind, type MediaPart, type Message } from '#/llm/message';
export type MediaPosition = 'content' | 'tool_result';
export interface MediaKindSupport {
    readonly mimes: ReadonlySet<string> | 'any';
    readonly sources: readonly ('url' | 'inline' | 'file')[];
    readonly url?: (url: string) => boolean;
    readonly inToolResult: 'native' | 'relocate' | 'unsupported';
    readonly inlineByteBudget?: number;
}
export interface MediaSupport {
    readonly kinds: Partial<Readonly<Record<MediaKind, MediaKindSupport>>>;
}
export declare function mediaSupportAt(support: MediaSupport, kind: MediaKind, position: MediaPosition): MediaKindSupport | undefined;
export declare function acceptsMime(spec: MediaKindSupport, mimeType: string): boolean;
export declare function acceptsSource(spec: MediaKindSupport, part: MediaPart): boolean;
export declare function legalizeMedia(messages: readonly Message[], support: MediaSupport): readonly Message[];
export declare function relocateToolMedia(messages: readonly Message[], support: MediaSupport): readonly Message[];
