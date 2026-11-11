import type { MediaPart } from '#/llm/message';
import type { LlmFileInput } from '#/llm/request';
export declare const BASELINE_IMAGE_MIMES: ReadonlySet<string>;
export declare const BASELINE_INLINE_IMAGE_BYTE_BUDGET: number;
export declare const IMAGE_MIME_BY_EXT: Record<string, string>;
export declare const VIDEO_MIME_BY_EXT: Record<string, string>;
export interface ProviderImagePolicy {
    readonly acceptedMimes: ReadonlySet<string>;
    readonly inlineByteBudget: number;
}
export declare const DEFAULT_INLINE_IMAGE_BYTE_BUDGET: number;
export declare function providerImagePolicy(provider?: string): ProviderImagePolicy;
export declare function mediaUrlOf(part: MediaPart): string;
export declare function mediaFileIdOf(part: MediaPart): string | undefined;
export interface InlineMedia {
    readonly mimeType: string;
    readonly data: string;
}
export declare function inlineMediaOf(part: MediaPart): InlineMedia | undefined;
export declare function uploadFilename(file: LlmFileInput): string;
