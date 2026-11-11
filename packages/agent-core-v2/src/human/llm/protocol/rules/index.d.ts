import type { Message } from '#/llm/message';
import { type Pattern } from '../pattern';
import type { PassContext, PassRunner } from '../pipeline';
import type { LlmModule } from '../protocol';
import { type MediaSupport } from './media';
import { type ModelLegality } from './model';
import { type ToolCallIdPolicy } from './tool-call-ids';
export type PatternSet<TOptions> = (module: LlmModule<TOptions>, ctx: PassContext) => readonly Pattern<Message>[];
export interface LegalizeSpec<TOptions> {
    readonly media: MediaSupport;
    readonly toolCallId?: ToolCallIdPolicy;
    readonly patterns?: PatternSet<TOptions>;
    readonly thinkingHistory?: PatternSet<TOptions>;
    readonly legality: ModelLegality;
}
export declare function legalize<TOptions>(input: LlmModule<TOptions>, spec: LegalizeSpec<TOptions>, keepCacheKey: boolean, pass: PassRunner<TOptions>): LlmModule<TOptions>;
