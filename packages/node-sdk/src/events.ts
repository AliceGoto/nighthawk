import type {
  ApprovalRequest,
  ApprovalResponse,
  QuestionRequest,
  QuestionResult,
} from '#/interaction';

export type { NightHawkErrorPayload } from '#/errors';

export type { Event, ToolResultEvent } from '@nighthawk/agent-core-v2/events';

export { MCP_OAUTH_AUTHORIZATION_URL_TOOL_UPDATE } from '@nighthawk/agent-core-v2/tool/toolContract';

export type { AgentStatusUpdatedEvent } from '@nighthawk/agent-core-v2/agent/usage/usageEvents';
export type { EnvironmentStatusChangedEvent } from '@nighthawk/agent-core-v2/agent/environmentBinding/environmentEvents';
export type { SessionMetaUpdatedEvent } from '@nighthawk/agent-core-v2/session/sessionMetadata/sessionMetaEvents';
export type { GoalUpdatedEvent } from '@nighthawk/agent-core-v2/features/goal/goalOps';
export type { SkillActivatedEvent } from '@nighthawk/agent-core-v2/features/skill/skillOps';
export type { PluginCommandActivatedEvent } from '@nighthawk/agent-core-v2/agent/pluginCommand/pluginCommand';
export type { ErrorEvent, WarningEvent } from '@nighthawk/agent-core-v2/errors';
export type { UsageStatus } from '@nighthawk/agent-core-v2/agent/usage/usage';

export type {
  TurnStartedEvent,
  TurnStepStartedEvent,
  TurnStepCompletedEvent,
  TurnStepRetryingEvent,
  TurnStepInterruptedEvent,
  TurnEndReason,
} from '@nighthawk/agent-core-v2/agent/loop/turnEvents';
export type { TurnEndedEvent } from '@nighthawk/agent-core-v2/agent/loop/turnOps';

export type {
  AssistantDeltaEvent,
  ThinkingDeltaEvent,
} from '@nighthawk/agent-core-v2/agent/loop/turnEvents';

export type { HookResultEvent } from '@nighthawk/agent-core-v2/features/externalHooks/agent/agentExternalHooksService';

export type {
  ToolCallStartedEvent,
  ToolCallDeltaEvent,
  ToolProgressEvent,
} from '@nighthawk/agent-core-v2/agent/toolExecutor/toolExecutorEvents';

export type { ToolUpdate } from '@nighthawk/agent-core-v2/tool/toolContract';
export type { McpOAuthAuthorizationUrlUpdateData } from '@nighthawk/agent-core-v2/agent/mcp/tools/auth';

export type { ToolCallRequest, ToolCallResponse } from '#/interaction';

export type {
  ToolListUpdatedEvent,
  McpServerStatusEvent,
} from '@nighthawk/agent-core-v2/agent/toolExecutor/toolExecutorEvents';
export type {
  ToolListUpdatedReason,
  McpServerStatusPayload,
} from '@nighthawk/agent-core-v2/agent/mcp/mcpEvents';

export type { ApprovalRequest, ApprovalScope } from '#/interaction';
export type { ApprovalDecision, ApprovalResponse } from '#/interaction';

export type { ToolInputDisplay } from '@nighthawk/agent-core-v2/tool/toolInputDisplay';

export type {
  QuestionRequest,
  QuestionItem,
  QuestionOption,
  QuestionAnswerMethod,
  QuestionAnswers,
  QuestionResponse,
  QuestionResult,
} from '#/interaction';

export type {
  SubagentSpawnedEvent,
  SubagentStartedEvent,
  SubagentCompletedEvent,
  SubagentFailedEvent,
  SubagentCancelledEvent,
} from '@nighthawk/agent-core-v2/session/subagent/mirrorAgentRun';
export type { SubagentSuspendedEvent } from '@nighthawk/agent-core-v2/features/swarm/session/sessionSwarmService';

export type {
  CompactionStartedEvent,
  CompactionBlockedEvent,
  CompactionCancelledEvent,
  CompactionCompletedEvent,
} from '@nighthawk/agent-core-v2/agent/fullCompaction/compactionOps';
export type { CompactionResult } from '@nighthawk/agent-core-v2/agent/fullCompaction/types';

export type {
  BackgroundTaskStartedEvent,
  BackgroundTaskTerminatedEvent,
} from '@nighthawk/agent-core-v2/agent/task/types';

export type { CronFiredEvent } from '@nighthawk/agent-core-v2/features/cron/cronOps';

export type MaybePromise<T> = T | Promise<T>;

export type ApprovalHandler = (request: ApprovalRequest) => MaybePromise<ApprovalResponse>;

export type QuestionHandler = (request: QuestionRequest) => MaybePromise<QuestionResult>;

/**
 * Called after a call was rejected because another client updated the
 * session, the session was reloaded from disk, and before the call is retried.
 */
export type StaleReloadHandler = () => Promise<void>;
