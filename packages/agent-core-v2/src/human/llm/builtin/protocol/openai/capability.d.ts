export declare const OPENAI_REASONING_CAPABILITY: Readonly<{
    image_in: false;
    video_in: false;
    audio_in: false;
    thinking: true;
    tool_use: true;
}>;
export declare const OPENAI_VISION_TOOL_CAPABILITY: Readonly<{
    image_in: true;
    video_in: false;
    audio_in: false;
    thinking: false;
    tool_use: true;
}>;
export declare const OPENAI_TEXT_TOOL_CAPABILITY: Readonly<{
    image_in: false;
    video_in: false;
    audio_in: false;
    thinking: false;
    tool_use: true;
}>;
export declare const OPENAI_VISION_TOOL_PREFIXES: readonly ['gpt-4o', 'gpt-4-turbo', 'gpt-4.1', 'gpt-4.5'];
export declare function isOpenAIReasoningModel(normalizedModelName: string): boolean;
export declare function hasModelPrefix(modelName: string, prefixes: readonly string[]): boolean;
export declare function getOpenAILegacyModelCapability(modelName: string): Readonly<{
    image_in: false;
    video_in: false;
    audio_in: false;
    thinking: true;
    tool_use: true;
}> | Readonly<{
    image_in: true;
    video_in: false;
    audio_in: false;
    thinking: false;
    tool_use: true;
}> | Readonly<{
    image_in: false;
    video_in: false;
    audio_in: false;
    thinking: false;
    tool_use: true;
}> | undefined;
