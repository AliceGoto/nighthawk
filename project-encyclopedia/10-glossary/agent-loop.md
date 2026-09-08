# Agent Loop 术语

解释 Turn、Step、Tool Call、LLM Requester。NightHawk 的实际 Agent 循环是 Turn/Step 循环，不是 Plan/Act/Observe/Reflect 四阶段循环。

## Turn

一次用户输入到最终 assistant 回复的完整循环。

## Step

循环内一次 LLM 请求或工具执行。

## Tool Call

模型请求调用工具的 JSON 结构。

## Compaction

上下文过长时压缩旧消息。

## 专业实现要点（开发流程视角）

### 需求分析

术语表帮助新读者快速理解文档中的专有名词。

### 设计决策

术语按领域分组，给出简短定义和代码映射。

### 实现步骤

从核心文档提取高频术语 → 对照源码确认含义 → 编写定义。

### 验证方式

检查术语是否在正文中被一致使用。

### 维护注意

新增概念时应同步补充术语表。

## 逐函数实现说明

以下按源码文件列出可验证的导出函数/类，并给出实现职责说明。

### packages/agent-core-v2/src/agent/loop/loop.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `createMaxStepsExceededError` | 19 | `export function createMaxStepsExceededError(maxSteps: number, message?: string): LoopError {` | `createMaxStepsExceededError` 负责创建/构建相关对象或流程。 |
| `isMaxStepsExceededError` | 28 | `export function isMaxStepsExceededError(error: unknown): boolean {` | `isMaxStepsExceededError` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `LoopError` | 12 | `export class LoopError extends Error2 {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/agent/loop/loopContinuationService.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `AgentLoopContinuationService` | 9 | `export class AgentLoopContinuationService` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/agent/loop/loopService.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `AgentLoopService` | 85 | `export class AgentLoopService extends Disposable implements IAgentLoopService {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/agent/loop/stepRequest.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `StepRequest` | 26 | `export abstract class StepRequest {` | 该类封装本文模块的核心状态与行为。 |
| `MessageStepRequest` | 77 | `export class MessageStepRequest extends StepRequest {` | 该类封装本文模块的核心状态与行为。 |
| `ContinuationStepRequest` | 97 | `export class ContinuationStepRequest extends StepRequest {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/agent/loop/stepRequestQueue.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `StepRequestQueue` | 8 | `export class StepRequestQueue {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/agent/loop/turnEvents.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `turnPromptText` | 33 | `export function turnPromptText(` | `turnPromptText` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `turnPromptAttachments` | 49 | `export function turnPromptAttachments(` | `turnPromptAttachments` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `isDisplayablePromptOrigin` | 72 | `export function isDisplayablePromptOrigin(origin: PromptOrigin): boolean {` | `isDisplayablePromptOrigin` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `TurnStarted` | 27 | `export class TurnStarted extends AgentEvent2<TurnStartedPayload> {` | 该类封装本文模块的核心状态与行为。 |
| `TurnStepStarted` | 87 | `export class TurnStepStarted extends AgentEvent2<TurnStepStartedPayload> {` | 该类封装本文模块的核心状态与行为。 |
| `TurnStepCompleted` | 110 | `export class TurnStepCompleted extends AgentEvent2<TurnStepCompletedPayload> {` | 该类封装本文模块的核心状态与行为。 |
| `TurnStepInterrupted` | 125 | `export class TurnStepInterrupted extends AgentEvent2<TurnStepInterruptedPayload> {` | 该类封装本文模块的核心状态与行为。 |
| `AssistantDelta` | 137 | `export class AssistantDelta extends AgentEvent2<AssistantDeltaPayload> {` | 该类封装本文模块的核心状态与行为。 |
| `ThinkingDelta` | 149 | `export class ThinkingDelta extends AgentEvent2<ThinkingDeltaPayload> {` | 该类封装本文模块的核心状态与行为。 |
| `ToolCallDelta` | 163 | `export class ToolCallDelta extends AgentEvent2<ToolCallDeltaPayload> {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/agent/loop/turnOps.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `TurnPrompt` | 31 | `export class TurnPrompt extends AgentEvent2<z.infer<typeof turnPromptSchema>> {` | 该类封装本文模块的核心状态与行为。 |
| `TurnSteer` | 44 | `export class TurnSteer extends AgentEvent2<z.infer<typeof turnSteerSchema>> {` | 该类封装本文模块的核心状态与行为。 |
| `TurnCancel` | 62 | `export class TurnCancel extends AgentEvent2<z.infer<typeof turnCancelSchema>> {` | 该类封装本文模块的核心状态与行为。 |
| `TurnEnded` | 91 | `export class TurnEnded extends AgentEvent2<TurnEndedPayload> {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core/src/loop/errors.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `createMaxStepsExceededError` | 7 | `export function createMaxStepsExceededError(maxSteps: number, message?: string): NighthawkError {` | `createMaxStepsExceededError` 负责创建/构建相关对象或流程。 |
| `isMaxStepsExceededError` | 18 | `export function isMaxStepsExceededError(error: unknown): boolean {` | `isMaxStepsExceededError` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `isAbortError` | 22 | `export function isAbortError(err: unknown): boolean {` | `isAbortError` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `errorMessage` | 29 | `export function errorMessage(err: unknown): string {` | `errorMessage` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### packages/agent-core/src/loop/events.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `createLoopEventDispatcher` | 165 | `export function createLoopEventDispatcher(` | `createLoopEventDispatcher` 负责创建/构建相关对象或流程。 |

### packages/agent-core/src/loop/llm.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `LLMRequestTraceState` | 75 | `export class LLMRequestTraceState implements LLMRequestTrace {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core/src/loop/retry.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `chatWithRetry` | 38 | `export async function chatWithRetry(input: ChatWithRetryInput): Promise<LLMChatResponse> {` | `chatWithRetry` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `findAPIStatusError` | 123 | `export function findAPIStatusError(error: unknown): APIStatusError \| undefined {` | `findAPIStatusError` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `retryBackoffDelays` | 155 | `export function retryBackoffDelays(maxAttempts: number): number[] {` | `retryBackoffDelays` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `sleepForRetry` | 179 | `export async function sleepForRetry(delayMs: number, signal: AbortSignal): Promise<void> {` | `sleepForRetry` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### packages/agent-core/src/loop/run-turn.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `runTurn` | 89 | `export async function runTurn(input: RunTurnInput): Promise<TurnResult> {` | `runTurn` 负责执行核心流程。 |

### packages/agent-core/src/loop/tool-args-parse.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `parseToolCallArguments` | 10 | `export function parseToolCallArguments(raw: string \| null): ParseToolArgsResult {` | `parseToolCallArguments` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### packages/agent-core/src/loop/tool-call.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `runToolCallBatch` | 138 | `export async function runToolCallBatch(` | `runToolCallBatch` 负责执行核心流程。 |
| `recordUnexecutedToolCalls` | 199 | `export async function recordUnexecutedToolCalls(` | `recordUnexecutedToolCalls` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### packages/agent-core/src/loop/tool-scheduler.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `ToolScheduler` | 28 | `export class ToolScheduler<Result> {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core/src/loop/turn-step.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `executeLoopStep` | 79 | `export async function executeLoopStep(deps: ExecuteLoopStepDeps): Promise<{` | `executeLoopStep` 负责执行核心流程。 |


## 核心代码片段

以下片段直接从仓库源码截取，用于展示关键实现形态；完整实现请打开对应文件。

### 来自 `packages/agent-core-v2/src/agent/loop/loop.ts` 的 `createMaxStepsExceededError`

源码位置：`packages/agent-core-v2/src/agent/loop/loop.ts:19` 附近。

```ts
export function createMaxStepsExceededError(maxSteps: number, message?: string): LoopError {
  return new LoopError(
    LoopErrors.codes.LOOP_MAX_STEPS_EXCEEDED,
    message ??
      `Turn exceeded maxSteps=${maxSteps}. If max_steps_per_turn is too small, raise it in config.toml (loop_control.max_steps_per_turn), or run "/update-config" to update it, then "/reload".`,
    { details: { maxSteps } },
  );
}
```

### 来自 `packages/agent-core-v2/src/agent/loop/loopContinuationService.ts` 的 `AgentLoopContinuationService`

源码位置：`packages/agent-core-v2/src/agent/loop/loopContinuationService.ts:9` 附近。

```ts
export class AgentLoopContinuationService
  extends Service
  implements IAgentLoopContinuationService
{
  declare readonly _serviceBrand: undefined;

  constructor(@IAgentLoopService loop: IAgentLoopService) {
    super();
    this._register(
      loop.hooks.onDidFinishStep.register('loop-continuation', async (ctx, next) => {
        await next();
        if (ctx.stopTurn || ctx.finishReason !== 'tool_calls') return;
        loop.enqueue(new ContinuationStepRequest());
      }),
    );
  }
}
```

### 来自 `packages/agent-core-v2/src/agent/loop/loopService.ts` 的 `AgentLoopService`

源码位置：`packages/agent-core-v2/src/agent/loop/loopService.ts:85` 附近。

```ts
export class AgentLoopService extends Disposable implements IAgentLoopService {
  declare readonly _serviceBrand: undefined;

  readonly hooks: IAgentLoopService['hooks'] = {
    onWillBeginStep: new OrderedHookSlot(),
    onDidFinishStep: new OrderedHookSlot(),
  };

  private readonly standaloneStepQueue = new StepRequestQueue();
  private readonly pendingAssignments = new Map<StepRequest, ReturnType<typeof createControlledPromise<import('./loop').StepAssignment>>>();
  private readonly errorHandlers: LoopErrorHandler[] = [];
  private readonly pendingTurns: TurnJob[] = [];
  private readonly heldAdmissions: HeldAdmission[] = [];
  private activeTurnJob: TurnJob | undefined;
  private readonly settleWaiters: Array<() => void> = [];
  private quiescenceDepth = 0;
  private activeRequestTrace: LLMRequestTrace | undefined;

  constructor(
    @IAgentContextMemoryService private readonly context: IAgentContextMemoryService,
    @IAgentLLMRequesterService private readonly llmRequester: IAgentLLMRequesterService,
    @IAgentToolExecutorService private readonly toolExecutor: IAgentToolExecutorService,
    @IConfigService private readonly config: IConfigService,
    @IEventDispatcher private readonly dispatcher: IEventDispatcher,
// ...
```


## 时序/状态图

```mermaid
flowchart LR
    A[入口/调用方] --> B[本文核心模块]
    B --> C[依赖服务/数据层]
    C --> D[输出/事件/持久化]
```

> 图注：`10-glossary/agent-loop.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `packages/agent-core-v2/src/agent/loop//` 目录下源码文件示例：
    - `packages/agent-core-v2/src/agent/loop/configSection.ts`
    - `packages/agent-core-v2/src/agent/loop/errors.ts`
    - `packages/agent-core-v2/src/agent/loop/loop.ts`
    - `packages/agent-core-v2/src/agent/loop/loopContinuation.ts`
    - `packages/agent-core-v2/src/agent/loop/loopContinuationService.ts`
    - `packages/agent-core-v2/src/agent/loop/loopService.ts`
    - `packages/agent-core-v2/src/agent/loop/stepRequest.ts`
    - `packages/agent-core-v2/src/agent/loop/stepRequestQueue.ts`
    - `packages/agent-core-v2/src/agent/loop/turnEvents.ts`
    - `packages/agent-core-v2/src/agent/loop/turnOps.ts`
  - `packages/agent-core/src/loop//` 目录下源码文件示例：
    - `packages/agent-core/src/loop/errors.ts`
    - `packages/agent-core/src/loop/events.ts`
    - `packages/agent-core/src/loop/index.ts`
    - `packages/agent-core/src/loop/llm.ts`
    - `packages/agent-core/src/loop/retry.ts`
    - `packages/agent-core/src/loop/run-turn.ts`
    - `packages/agent-core/src/loop/tool-access.ts`
    - `packages/agent-core/src/loop/tool-args-parse.ts`
    - `packages/agent-core/src/loop/tool-call.ts`
    - `packages/agent-core/src/loop/tool-scheduler.ts`
    - `packages/agent-core/src/loop/turn-step.ts`
    - `packages/agent-core/src/loop/types.ts`

## 证据与代码位置

- `packages/agent-core-v2/src/agent/loop/`
- `packages/agent-core/src/loop/`

> 本文所有路径均相对仓库根目录；引用内容以仓库当前 `HEAD` 为准。
