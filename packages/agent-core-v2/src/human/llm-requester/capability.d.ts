export interface ModelCapability {
    readonly image_in: boolean;
    readonly video_in: boolean;
    readonly audio_in: boolean;
    readonly thinking: boolean;
    readonly tool_use: boolean;
    readonly dynamically_loaded_tools?: boolean;
}
export declare const UNKNOWN_CAPABILITY: ModelCapability;
export declare function isUnknownCapability(capability: ModelCapability): boolean;
