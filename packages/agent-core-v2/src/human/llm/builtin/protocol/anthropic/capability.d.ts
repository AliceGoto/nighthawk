export declare function getAnthropicModelCapability(modelName: string): Readonly<{
    image_in: true;
    video_in: false;
    audio_in: false;
    thinking: false;
    tool_use: true;
}> | Readonly<{
    image_in: true;
    video_in: false;
    audio_in: false;
    thinking: true;
    tool_use: true;
}> | undefined;
