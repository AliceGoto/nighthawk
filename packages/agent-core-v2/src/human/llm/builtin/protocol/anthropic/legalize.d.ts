import type { Message } from '#/llm/message';
import type { ModelLegality } from '#/llm/protocol/rules/model';
import type { Pattern } from '#/llm/protocol/pattern';
import type { LlmModelSpec } from '#/llm/request';
export declare const audioToPlaceholder: Pattern<Message>;
export declare function anthropicPatterns(): readonly Pattern<Message>[];
type AnthropicThinkingMode = 'budget' | 'adaptive';
export interface AnthropicModelProfile {
    readonly mode: AnthropicThinkingMode;
    readonly efforts: readonly string[];
    readonly supportsEffortParam: boolean;
    readonly canDisableThinking: boolean;
}
export declare const BUDGET_THINKING_EFFORTS: readonly ['low', 'medium', 'high'];
export declare function resolveDefaultMaxTokens(model: string, override?: number): number;
export declare function matchKnownAnthropicModelProfile(model: string): AnthropicModelProfile | undefined;
export declare function matchUnknownClaudeProfile(model: string): AnthropicModelProfile | undefined;
export declare function resolveThinkingProfile(model: LlmModelSpec): AnthropicModelProfile;
export declare function anthropicThinkingHistoryPatterns(model: LlmModelSpec): readonly Pattern<Message>[];
export declare const anthropicModelLegality: ModelLegality;
export {};
