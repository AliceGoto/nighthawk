import type { LlmModelSpec, LlmRequestModel, LlmSampling, ResponseFormat } from '#/llm/request';
import type { PassContext } from '../pipeline';
import type { LlmModule, Protocol } from '../protocol';
export declare function withProtocolCapabilities(spec: LlmModelSpec, protocol: Pick<Protocol, 'capability'>): LlmModelSpec;
export interface ModelLegality {
    readonly sampling: readonly (keyof LlmSampling)[];
    readonly responseFormats?: readonly ResponseFormat['type'][];
    readonly clampMaxOutputTokens?: (maxOutputTokens: number, model: LlmModelSpec) => number;
    readonly fillMaxOutputTokens?: (model: LlmModelSpec, usedTokens: number | undefined) => number | undefined;
    readonly verify?: (model: LlmRequestModel, ctx: PassContext) => void;
}
export declare function legalizeModel(module: LlmModule<unknown>, legality: ModelLegality, keepCacheKey: boolean, ctx: PassContext): LlmRequestModel;
