export declare function getGoogleGenAIModelCapability(modelName: string): Readonly<{
    image_in: true;
    video_in: true;
    audio_in: true;
    thinking: false;
    tool_use: true;
}> | Readonly<{
    image_in: true;
    video_in: true;
    audio_in: true;
    thinking: true;
    tool_use: true;
}> | undefined;
