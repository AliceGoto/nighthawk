import type { Message } from '#/llm/message';
import type { ModelLegality } from '#/llm/protocol/rules/model';
import type { Pattern } from '#/llm/protocol/pattern';
export declare const googleGenAIModelLegality: ModelLegality;
export declare const sortToolRunByCallOrder: Pattern<Message>;
