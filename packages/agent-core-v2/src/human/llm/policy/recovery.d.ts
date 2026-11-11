import type { LlmEndpoint, LlmRequest } from '#/llm/request';
import type { LlmErrorMessage } from '#/llm/response';
export interface LlmRecoveryRecord {
    readonly strategy: string;
    readonly action: string;
}
export interface LlmRecoveryContext {
    readonly error: LlmErrorMessage;
    readonly request: LlmRequest;
    readonly appliedRecoveries: readonly LlmRecoveryRecord[];
    readonly endpoint?: LlmEndpoint;
}
export type LlmRequestRewrite = (request: LlmRequest) => LlmRequest;
export interface LlmRecoveryProposal {
    readonly action: string;
    readonly rewrite?: LlmRequestRewrite;
    readonly beforeNextAttempt?: () => void;
}
export type LlmRecoveryEntry = LlmRecoveryProposal & LlmRecoveryRecord;
export interface LlmRecovery {
    propose(ctx: LlmRecoveryContext): LlmRecoveryEntry | undefined;
}
export interface LlmRecoveryLedger {
    readonly applied: readonly LlmRecoveryRecord[];
    apply(request: LlmRequest): LlmRequest;
    record(entry: LlmRecoveryEntry): void;
    fork(filter?: (entry: LlmRecoveryEntry) => boolean): LlmRecoveryLedger;
    map(mapper: (entry: LlmRecoveryEntry) => LlmRecoveryEntry): LlmRecoveryLedger;
}
export declare function createRecoveryLedger(seed?: readonly LlmRecoveryEntry[]): LlmRecoveryLedger;
export declare function proposeFirst(recoveries: readonly LlmRecovery[], ctx: LlmRecoveryContext): LlmRecoveryEntry | undefined;
