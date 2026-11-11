import type { Message, ToolDescription } from '#/llm/message';
import type { LlmModelSpec, LlmRequestModel, LlmSampling, ResponseFormat, ThinkingRequestOptions } from '#/llm/request';
import type { LlmNotice, LlmNoticeSink } from '#/llm/response';
import { type Pattern } from './pattern';
import type { LlmModule } from './protocol';
import { type LegalizeSpec } from './rules';
export type PassTrace = (pass: string, output: unknown) => void;
export interface PassContext {
    readonly report: LlmNoticeSink;
}
export interface EncodeHooks {
    readonly trace?: PassTrace;
    readonly report?: (notice: LlmNotice) => void;
}
export interface PassRunner<TOptions> {
    readonly messages: (pass: string, module: LlmModule<TOptions>, rewrite: (messages: readonly Message[], ctx: PassContext) => readonly Message[]) => LlmModule<TOptions>;
    readonly model: (pass: string, module: LlmModule<TOptions>, rewrite: (module: LlmModule<TOptions>, ctx: PassContext) => LlmRequestModel) => LlmModule<TOptions>;
}
export interface NativeModule<TMessage, TTool, TParams> {
    readonly system: string | undefined;
    readonly messages: readonly TMessage[];
    readonly tools: readonly TTool[];
    readonly params: TParams;
}
export interface PipelineSpec<TOptions, TMessage, TTool, TParams, TRequest> extends LegalizeSpec<TOptions> {
    readonly cacheKey?: (key: string) => Partial<TParams>;
    readonly thinking: (thinking: ThinkingRequestOptions | undefined, module: LlmModule<TOptions>) => Partial<TParams> | undefined;
    readonly responseFormat: (params: TParams, format: ResponseFormat) => TParams;
    readonly maxOutputTokens: (maxOutputTokens: number, model: LlmModelSpec) => Partial<TParams>;
    readonly sampling: (sampling: LlmSampling) => Partial<TParams>;
    readonly tool: (tool: ToolDescription) => TTool;
    readonly message: (message: Message, module: LlmModule<TOptions>) => readonly TMessage[];
    readonly mergeTurns?: readonly Pattern<TMessage>[];
    readonly annotate?: (native: NativeModule<TMessage, TTool, TParams>) => NativeModule<TMessage, TTool, TParams>;
    readonly finalize?: (native: NativeModule<TMessage, TTool, TParams>, module: LlmModule<TOptions>) => NativeModule<TMessage, TTool, TParams>;
    readonly flatten: (native: NativeModule<TMessage, TTool, TParams>, module: LlmModule<TOptions>) => TRequest;
}
export declare function runPipeline<TOptions, TMessage, TTool, TParams extends object, TRequest>(pipeline: PipelineSpec<TOptions, TMessage, TTool, TParams, TRequest>, input: LlmModule<TOptions>, hooks?: EncodeHooks): TRequest;
