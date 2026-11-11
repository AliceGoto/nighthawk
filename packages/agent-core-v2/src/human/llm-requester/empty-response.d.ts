import type { LlmErrorMessage } from '#/llm-requester/errors';
import type { FinishInfo } from '#/llm-requester/finish-reason';
import type { AssistantMessage } from '#/llm/message';
import type { LlmModel } from '#/llm-requester/model';
export declare function createEmptyResponseError(model: LlmModel, finish: FinishInfo, thinkOnly: boolean): LlmErrorMessage<'empty_response'>;
export declare function emptyResponseError(message: AssistantMessage, model: LlmModel, finish: FinishInfo): LlmErrorMessage<'empty_response'> | null;
