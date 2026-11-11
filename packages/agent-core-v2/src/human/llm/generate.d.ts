import type { LlmRequest } from '#/llm/request';
import type { LlmErrorMessage, LlmStreamEvent } from '#/llm/response';
export type LlmAttemptEvent = LlmStreamEvent | {
    readonly type: 'attempt.sending';
} | {
    readonly type: 'attempt.tool_call_end';
    readonly index?: number | string;
} | {
    readonly type: 'attempt.failed';
    readonly error: LlmErrorMessage;
    readonly rawError?: unknown;
};
export interface LlmAttemptControl {
    readonly signal: AbortSignal;
    readonly onEvent?: (event: LlmAttemptEvent) => void;
}
export declare function generate(request: LlmRequest, control: LlmAttemptControl): Promise<void>;
