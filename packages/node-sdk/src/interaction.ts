import type { ToolInputDisplay } from '@nighthawk/agent-core-v2/tool/toolInputDisplay';
import type { ContentPart } from '@nighthawk/agent-core-v2';
import type { QuestionRequest as CoreQuestionRequest } from '@nighthawk/agent-core-v2/agent/interaction/question';

export type {
  ApprovalDecision,
  ApprovalResponse,
} from '@nighthawk/agent-core-v2/agent/interaction/approval';
export type {
  QuestionAnswerMethod,
  QuestionAnswers,
  QuestionItem,
  QuestionOption,
  QuestionResponse,
  QuestionResult,
} from '@nighthawk/agent-core-v2/agent/interaction/question';

export type ApprovalScope = 'session';

export interface ApprovalRequest {
  readonly agentId?: string;
  readonly turnId?: number | undefined;
  readonly toolCallId: string;
  readonly toolName: string;
  readonly action: string;
  readonly display: ToolInputDisplay;
}

export interface QuestionRequest extends CoreQuestionRequest {
  readonly agentId?: string;
}

export interface ToolCallRequest {
  readonly turnId?: number | undefined;
  readonly toolCallId: string;
  readonly args: unknown;
}

export interface ToolCallResponse {
  readonly output: string | ContentPart[];
  readonly isError?: boolean | undefined;
}
