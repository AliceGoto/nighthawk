import { type AssistantMessage } from '#/llm/message';
import type { LlmModelSpec, LlmRequest } from '#/llm/request';
import { type FinishInfo, type LlmErrorMessage, type LlmOutcome, type LlmSentEvent, type LlmStreamEvent } from '#/llm/response';
export declare function usableOutputOf(message: AssistantMessage): AssistantMessage | null;
export declare function emptyResponseError(message: AssistantMessage, model: LlmModelSpec, finish: FinishInfo): LlmErrorMessage<'empty_response'> | null;
export interface LlmSettleControl {
    readonly signal: AbortSignal;
    readonly onEvent?: (event: LlmStreamEvent | LlmSentEvent) => void;
}
export declare function settleLlmRequest(request: LlmRequest, control: LlmSettleControl): Promise<LlmOutcome>;
