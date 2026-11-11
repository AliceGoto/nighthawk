import type { LlmRequest } from '#/llm/request';
import type { LlmOutcome, LlmRunEvent, LlmRunStarted } from '#/llm/response';
import { type LlmRecovery, type LlmRecoveryLedger } from './recovery';
import type { LlmResolver } from './resolver';
import { type LlmRetryable, type LlmRetryOptions } from './retry';
import { settleLlmRequest } from './settle';
export type LlmPolicyList<T> = readonly T[] | (() => readonly T[]);
export interface LlmPolicy {
    readonly resolvers?: LlmPolicyList<LlmResolver>;
    readonly recoveries?: LlmPolicyList<LlmRecovery>;
    readonly retryables?: LlmPolicyList<LlmRetryable>;
    readonly retry?: LlmRetryOptions;
}
export interface LlmRunControl {
    readonly signal: AbortSignal;
    readonly recoveries?: LlmRecoveryLedger;
    readonly onAttempt?: (request: LlmRequest) => void;
    readonly onEvent?: (event: LlmRunEvent) => void;
}
export declare function llmStartedEvent(request: LlmRequest): LlmRunStarted;
export declare function runLlmRequest(request: LlmRequest, control: LlmRunControl, settle?: typeof settleLlmRequest): Promise<LlmOutcome>;
