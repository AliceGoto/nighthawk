import { type LlmRunControl } from '#/llm/policy/policy';
import type { LlmOutcome } from '#/llm/response';
import type { LlmRequest } from '#/llm/request';
export type LlmDimension = keyof LlmRequest;
type RequiredDimension = 'protocol' | 'model' | 'content';
type DimensionOf<K extends LlmDimension> = NonNullable<LlmRequest[K]>;
export type LlmRequestPart = {
    readonly [K in LlmDimension]?: Partial<DimensionOf<K>>;
};
export type LlmRequestFill<F extends LlmDimension> = {
    readonly [K in Exclude<LlmDimension, F>]?: DimensionOf<K>;
} & {
    readonly [K in F]?: Partial<DimensionOf<K>>;
};
export type LlmRequestRest<F extends LlmDimension> = LlmRequestFill<F> & {
    readonly [K in Exclude<RequiredDimension, F>]-?: DimensionOf<K>;
};
export declare const requesterContents: unique symbol;
export interface LlmRequester<F extends LlmDimension = never> {
    readonly [requesterContents]?: LlmRequestPart;
    with<G extends LlmDimension>(other: LlmRequester<G>): LlmRequester<F | G>;
    with<P extends LlmRequestFill<F>>(part: P): LlmRequester<F | Extract<keyof P, LlmDimension>>;
    request(rest: LlmRequestRest<F>): LlmRequest;
    generate(rest: LlmRequestRest<F>, control: LlmRunControl): Promise<LlmOutcome>;
}
type Fields = Readonly<Record<string, unknown>>;
export declare function mergeFields(prev: Fields | undefined, next: Fields | undefined): Fields | undefined;
export declare function contentsOf(part: LlmRequestPart | LlmRequester<LlmDimension>): LlmRequestPart;
export declare function createRequester(): LlmRequester;
export {};
