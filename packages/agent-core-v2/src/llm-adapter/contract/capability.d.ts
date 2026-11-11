import type { ModelCapability as LlmModelCapability } from '#human/llm-requester/capability';
export interface ModelCapability {
    readonly image_in: boolean;
    readonly video_in: boolean;
    readonly audio_in: boolean;
    readonly thinking: boolean;
    readonly tool_use: boolean;
    readonly max_context_tokens: number;
    readonly max_input_tokens?: number;
    readonly dynamically_loaded_tools?: boolean;
}
export declare const UNKNOWN_CAPABILITY: ModelCapability;
export declare function isUnknownCapability(capability: ModelCapability): boolean;
export declare function toLlmCapability(capability: ModelCapability): LlmModelCapability;
