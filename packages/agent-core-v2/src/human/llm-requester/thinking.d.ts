import type { LlmErrorMessage } from '#/llm-requester/errors';
import type { LlmModel } from '#/llm-requester/model';
import { SyntaxRequestFormatError } from '#/llm-requester/syntax-errors';
export type ThinkingEffort = 'off' | 'on' | (string & {});
export interface ThinkingRequestOptions {
    readonly effort: ThinkingEffort;
    readonly keep?: string;
}
export interface ModelThinkingMetadata {
    readonly supportEfforts?: readonly string[];
    readonly defaultEffort?: string;
    readonly offEffort?: string;
    readonly alwaysThinking?: boolean;
    readonly adaptiveThinking?: boolean;
}
export interface ThinkingDefaults {
    readonly enabled?: boolean;
    readonly effort?: string;
}
export type ThinkingConfigErrorCode = 'effort-not-supported' | 'thinking-unsupported' | 'thinking-cannot-disable' | 'off-needs-offeffort';
export declare class ThinkingConfigError extends SyntaxRequestFormatError {
    readonly code: ThinkingConfigErrorCode;
    constructor(code: ThinkingConfigErrorCode, message: string);
    toLlmErrorMessage(): LlmErrorMessage<'syntax'>;
}
export type ThinkingResolution = {
    readonly ok: true;
    readonly encode: 'silent';
} | {
    readonly ok: true;
    readonly encode: 'effort';
    readonly value: string;
} | {
    readonly ok: false;
    readonly error: ThinkingConfigError;
};
export declare function thinkingMetadataOf(model: LlmModel): ModelThinkingMetadata | undefined;
export declare function resolveThinkingEffort(options: ThinkingRequestOptions, model: LlmModel, strictValidation?: boolean): ThinkingResolution;
export declare function encodeReasoningEffortFallback(thinking: ThinkingRequestOptions, model: LlmModel, strictValidation?: boolean): Record<string, unknown> | undefined;
export declare function normalizeRequestedThinkingEffort(requested: string | undefined): ThinkingEffort | undefined;
export declare function modelSupportsThinking(model: LlmModel): boolean;
export declare function defaultThinkingEffortForModel(model: LlmModel): ThinkingEffort;
export declare function resolveThinkingEffortForModel(requested: string | undefined, defaults: ThinkingDefaults | undefined, model: LlmModel, strictValidation?: boolean): ThinkingEffort;
export declare function resolveThinkingKeep(envKeep: string | undefined, configKeep: string | undefined, thinkingEffort: ThinkingEffort): string | undefined;
