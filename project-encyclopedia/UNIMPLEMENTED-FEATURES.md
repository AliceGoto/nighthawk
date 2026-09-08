# NightHawk 未实现/未完整实现功能清单

> 本文通过遍历仓库生产源码、SDK 迁移层、ACP 适配层、TUI 与文档，整理当前 coding agent 尚未实现、部分实现、实验性默认关闭或预留未做的功能。所有条目均附代码位置，可自行验证。
>
> 已验证：0.41.0 版本以上条目均保持准确（MiniDb 2PC 仍为 stub，ACP v1 扩展方法仍为 MethodNotFound，v2 SDK 适配层仍通过客户端重建部分能力）。

## A. 明确未实现（代码抛错 / no-op stub）

### 1. MiniDb 跨分片两阶段提交（2PC）未实现
- 现象：`crossShard: '2pc'` 直接抛错，仅 `best-effort` / `none` 可用。
- 代码位置：
  - `packages/minidb/src/cluster/index.ts:84`
  - `packages/minidb/src/cluster/coordinator.ts:26`
- 影响：ClusterDb 尚不支持严格跨分片原子提交。

## B. 已实现但存在版本差异或降级

### 1. ACP AskUserQuestion：v1 为 legacy fallback，v2 支持表单能力
- 现象：v1 ACP `request_permission` bridge 采用 legacy fallback，只处理单问题；v2 ACP 支持 form-capable 的多问题/多选交互。
- 代码位置：
  - `packages/acp-adapter/src/question.ts:32-42`
  - `packages/acp-server/src/question.ts:125`
- 影响：同一 `AskUserQuestion` 能力在 v1 与 v2 的 ACP 交互形态和选项语义不同。

### 2. ACP `extMethod` / `extNotification`：v1 为 stub，v2 已注册正式方法
- 现象：v1 ACP 客户端调用扩展方法仍会得到 `MethodNotFound`；v2 已将正式扩展方法注册到 nighthawk registry。
- 代码位置：`packages/acp-adapter/src/server.ts:804-835`
- 影响：ACP 扩展能力取决于引擎版本，不能将 v1 stub 结论套用于 v2。

### 3. v1 若干能力在 v2 没有独立服务，由 SDK 适配层重建
- 例子：`getSessionWarnings`、`listWorkspaceSkills`、print policy。
- 代码位置：
  - `packages/node-sdk/src/sdk-rpc-client-v2.ts:603-621`
  - `packages/node-sdk/src/sdk-rpc-client-v2.ts:2004-2020`
  - `packages/node-sdk/src/sdk-rpc-client-v2.ts:2271-2300`
- 影响：不是用户功能缺失，但 v2 服务层未聚合这些能力，维护成本在客户端。

## C. 实验性功能（已实现，默认关闭）

| 功能 | Flag | 默认 | 位置 |
| --- | --- | --- | --- |
| Tool select（渐进式工具披露） | `tool-select` | false | `packages/agent-core-v2/src/agent/toolSelect/flag.ts` |
| Secondary model for subagents | `secondary-model` | false | `packages/agent-core-v2/src/session/subagent/flag.ts` |
| Subagent fork context | `subagent_fork` | false | `packages/agent-core-v2/src/session/subagent/flag.ts` |
| AI session titles | `auto_session_title` | false | `packages/agent-core-v2/src/session/sessionTitle/flag.ts` |
| Tower mode | `tower` | false | `packages/agent-core-v2/src/features/tower/flag.ts` |
| v1 Tool select | `tool-select` | false | `packages/agent-core/src/flags/registry.ts` |
| v1 Secondary model | `secondary-model` | false | `packages/agent-core/src/flags/registry.ts` |
| Micro compaction | 已禁用/移除 | — | `packages/agent-core/src/flags/registry.ts` 注释保留 |

默认开启但属于实验性可回退的功能：
- `search_worker`（默认 ON）：`packages/kap-server/src/search/searchService.ts:86`
- `persistence_minidb_readmodel`（默认 ON）：`packages/agent-core-v2/src/persistence/backends/minidb/flag.ts`

## D. 设计保留 / 未来预留

- MiniDb `crossShard: '2pc'` 为未来 release 保留。
- `event.di.*` debug feed 目前只允许 `client_id: 'nighthawk-inspect'` 的连接，属于临时 gate，未来会做客户端声明式事件白名单。
  - 证据：`packages/kap-server/AGENTS.md` 中 “a temporary gate until a client-declared event whitelist exists”。
- `nighthawk-webbridge` 是平台矩阵限制：仅在 darwin/linux/win32 的常见架构提供二进制；这不是“未实现”。
  - 证据：`packages/agent-core-v2/src/app/capability/entries/nighthawkWebbridge.ts:198`

## 验证命令

```sh
# 查看生产源码中的未实现标记
grep -R "not implemented\|not yet implemented\|NotImplementedError\|no-op stub" -n \
  packages/*/src apps/*/src --include='*.ts' --include='*.tsx' \
  | grep -v node_modules | grep -v dist | grep -v test
```

> 本文是快照式报告，基于当前 `HEAD` 与工作区源码。后续代码更新后应以实际源码为准。

## 逐函数实现说明

以下按源码文件列出可验证的导出函数/类，并给出实现职责说明。

### packages/minidb/src/cluster/index.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `ClusterDb` | 69 | `export class ClusterDb<V = unknown> {` | 该类封装本文模块的核心状态与行为。 |

### packages/minidb/src/cluster/coordinator.ts

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `Coordinator` | 13 | `export class Coordinator<V = unknown> {` | 该类封装本文模块的核心状态与行为。 |

### packages/acp-adapter/src/server.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `runAcpServerWithStream` | 1015 | `export async function runAcpServerWithStream(` | `runAcpServerWithStream` 负责执行核心流程。 |
| `runAcpServer` | 1047 | `export async function runAcpServer(` | `runAcpServer` 负责执行核心流程。 |

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `AcpServer` | 219 | `export class AcpServer implements Agent {` | 该类封装本文模块的核心状态与行为。 |

### packages/node-sdk/src/sdk-rpc-client-v2.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `createNighthawkHarnessV2` | 2679 | `export function createNighthawkHarnessV2(options: NighthawkHarnessOptions): NighthawkHarness {` | `createNighthawkHarnessV2` 负责创建/构建相关对象或流程。 |

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `SDKRpcClientV2` | 368 | `export class SDKRpcClientV2 extends SDKRpcClientBase {` | 该类封装本文模块的核心状态与行为。 |

### packages/acp-adapter/src/question.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `questionItemToPermissionOptions` | 50 | `export function questionItemToPermissionOptions(` | `questionItemToPermissionOptions` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `outcomeToQuestionAnswer` | 81 | `export function outcomeToQuestionAnswer(` | `outcomeToQuestionAnswer` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### packages/acp-adapter/src/events-map.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `assistantDeltaToSessionUpdate` | 34 | `export function assistantDeltaToSessionUpdate(` | `assistantDeltaToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `turnEndReasonToStopReason` | 67 | `export function turnEndReasonToStopReason(` | `turnEndReasonToStopReason` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `acpToolCallId` | 93 | `export function acpToolCallId(turnId: number, toolCallId: string): string {` | `acpToolCallId` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `inferToolKind` | 106 | `export function inferToolKind(name: string): ToolKind {` | `inferToolKind` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `stringifyArgs` | 141 | `export function stringifyArgs(args: unknown): string {` | `stringifyArgs` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `toolCallStartToSessionUpdate` | 158 | `export function toolCallStartToSessionUpdate(` | `toolCallStartToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `toolCallDeltaToSessionUpdate` | 203 | `export function toolCallDeltaToSessionUpdate(` | `toolCallDeltaToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `toolCallLazyCreateToSessionUpdate` | 251 | `export function toolCallLazyCreateToSessionUpdate(` | `toolCallLazyCreateToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `toolCallStartedUpgradeToSessionUpdate` | 291 | `export function toolCallStartedUpgradeToSessionUpdate(` | `toolCallStartedUpgradeToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `toolProgressToSessionUpdate` | 331 | `export function toolProgressToSessionUpdate(` | `toolProgressToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `thinkingDeltaToSessionUpdate` | 354 | `export function thinkingDeltaToSessionUpdate(` | `thinkingDeltaToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `toolResultToSessionUpdate` | 379 | `export function toolResultToSessionUpdate(` | `toolResultToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `todoListToSessionUpdate` | 417 | `export function todoListToSessionUpdate(` | `todoListToSessionUpdate` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `planFromDisplayBlock` | 466 | `export function planFromDisplayBlock(` | `planFromDisplayBlock` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `availableCommandsUpdateNotification` | 485 | `export function availableCommandsUpdateNotification(` | `availableCommandsUpdateNotification` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |
| `configOptionUpdateNotification` | 516 | `export function configOptionUpdateNotification(` | `configOptionUpdateNotification` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

### packages/kap-server/src/search/searchService.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `drainGlobalSearchDisposals` | 100 | `export async function drainGlobalSearchDisposals(): Promise<void> {` | `drainGlobalSearchDisposals` 是本文涉及模块中的一个导出函数/类，具体语义以源码实现为准。 |

| 类 | 行号 | 声明 | 实现说明 |
| --- | --- | --- | --- |
| `InlineSearchBackend` | 219 | `export class InlineSearchBackend implements SearchBackend {` | 该类封装本文模块的核心状态与行为。 |
| `GlobalSearchService` | 268 | `export class GlobalSearchService implements IGlobalSearchService {` | 该类封装本文模块的核心状态与行为。 |

### packages/agent-core-v2/src/app/capability/entries/nighthawkWebbridge.ts

| 函数 | 行号 | 签名 | 实现说明 |
| --- | --- | --- | --- |
| `createNighthawkWebbridgeEntry` | 51 | `export function createNighthawkWebbridgeEntry(ctx: CapabilityEntryContext): CapabilityEntry {` | `createNighthawkWebbridgeEntry` 负责创建/构建相关对象或流程。 |


## 核心代码片段

以下片段直接从仓库源码截取，用于展示关键实现形态；完整实现请打开对应文件。

## 时序/状态图

```mermaid
flowchart LR
    A[入口/调用方] --> B[本文核心模块]
    B --> C[依赖服务/数据层]
    C --> D[输出/事件/持久化]
```

> 图注：`UNIMPLEMENTED-FEATURES.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `packages/minidb/src/cluster/index.ts`：
    - 导出签名/声明：
      - `export type {`
      - `export type { ShardOpenOptions } from './shard.js';`
      - `export class ClusterDb<V = unknown>`
  - `packages/minidb/src/cluster/coordinator.ts`：
    - 导出签名/声明：
      - `export class Coordinator<V = unknown>`
  - `packages/acp-adapter/src/server.ts`：
    - 导出签名/声明：
      - `export interface SlashCommandsSnapshot {`
      - `export class AcpServer implements Agent`
      - `export async function runAcpServerWithStream(
  harness: NighthawkHarness,
  stream: Stream,
  opts?:`
      - `export async function runAcpServer(
  harness: NighthawkHarness,
  opts?:`
    - 类内方法（节选）：`setTimeout`
  - `packages/acp-adapter/src/question.ts`：
    - 导出签名/声明：
      - `export function questionItemToPermissionOptions(
  question: QuestionItem,
  questionIndex: number,
): readonly PermissionOption[]`
      - `export function outcomeToQuestionAnswer(
  question: QuestionItem,
  response: RequestPermissionResponse,
): QuestionAnswers | null`
      - `export function questionRequestValidationError(
  questions: readonly QuestionItem[],
): string | null`
  - `packages/acp-adapter/src/events-map.ts`：
    - 导出签名/声明：
      - `export function assistantDeltaToSessionUpdate(
  sessionId: string,
  event: AssistantDeltaEvent,
): SessionNotification`
      - `export function turnEndReasonToStopReason(
  reason: TurnEndReason,
  error?:`
      - `export function acpToolCallId(turnId: number, toolCallId: string): string`
      - `export function inferToolKind(name: string): ToolKind`
      - `export function stringifyArgs(args: unknown): string`
      - `export function toolCallStartToSessionUpdate(
  sessionId: string,
  event: ToolCallStartedEvent,
): SessionNotification`
      - `export function toolCallDeltaToSessionUpdate(
  sessionId: string,
  event: ToolCallDeltaEvent,
  accumulator:`
      - `export function toolCallLazyCreateToSessionUpdate(
  sessionId: string,
  event: ToolCallDeltaEvent,
): SessionNotification`
      - `export function toolCallStartedUpgradeToSessionUpdate(
  sessionId: string,
  event: ToolCallStartedEvent,
): SessionNotification`
      - `export function toolProgressToSessionUpdate(
  sessionId: string,
  event: ToolProgressEvent,
): SessionNotification | null`
      - `export function thinkingDeltaToSessionUpdate(
  sessionId: string,
  event: ThinkingDeltaEvent,
): SessionNotification`
      - `export function toolResultToSessionUpdate(
  sessionId: string,
  event: ToolResultEvent,
): SessionNotification`
      - `export function todoListToSessionUpdate(
  sessionId: string,
  turnId: number,
  items: ReadonlyArray<`
      - `export function planFromDisplayBlock(
  sessionId: string,
  turnId: number,
  display: ToolInputDisplay,
): SessionNotification | null`
      - `export const PLAN_ID = 'default';`
      - `export function planRemovedToSessionUpdate(sessionId: string): SessionNotification`
      - `export function availableCommandsUpdateNotification(
  sessionId: string,
  commands: ReadonlyArray<AvailableCommand> = [],
): SessionNotification`
      - `export function configOptionUpdateNotification(
  sessionId: string,
  configOptions: readonly SessionConfigOption[],
): SessionNotification`
  - `packages/agent-core/src/flags/registry.ts`：
    - 导出签名/声明：
      - `export const FLAG_DEFINITIONS = [`
      - `export type FlagId = (typeof FLAG_DEFINITIONS)[number]['id'];`
  - `packages/agent-core-v2/src/features/tower/flag.ts`：
    - 导出签名/声明：
      - `export const TOWER_FLAG_ENV = 'NIGHTHAWK_EXPERIMENTAL_TOWER';`
      - `export const towerFlag: FlagDefinitionInput = {`
  - `packages/agent-core-v2/src/session/subagent/flag.ts`：
    - 导出签名/声明：
      - `export const SECONDARY_MODEL_FLAG_ID = 'secondary-model';`
      - `export const SECONDARY_MODEL_FLAG_ENV = 'NIGHTHAWK_EXPERIMENTAL_SECONDARY_MODEL';`
      - `export const secondaryModelFlag: FlagDefinitionInput = {`
      - `export const SUBAGENT_FORK_FLAG_ID = 'subagent_fork';`
      - `export const SUBAGENT_FORK_FLAG_ENV = 'NIGHTHAWK_EXPERIMENTAL_SUBAGENT_FORK';`
      - `export const subagentForkFlag: FlagDefinitionInput = {`
  - `packages/agent-core-v2/src/session/sessionTitle/flag.ts`：
    - 导出签名/声明：
      - `export const AUTO_SESSION_TITLE_FLAG_ID = 'auto_session_title';`
      - `export const AUTO_SESSION_TITLE_FLAG_ENV = 'NIGHTHAWK_EXPERIMENTAL_AUTO_SESSION_TITLE';`
      - `export const sessionTitleFlag: FlagDefinitionInput = {`
  - `packages/kap-server/src/search/searchService.ts`：
    - 导出签名/声明：
      - `export type { GlobalSearchErrorReason } from './contract';`
      - `export const SEARCH_WORKER_FLAG_ID = 'search_worker';`
      - `export async function drainGlobalSearchDisposals(): Promise<void>`
      - `export interface IGlobalSearchService {`
      - `export const IGlobalSearchService = createDecorator<IGlobalSearchService>('globalSearch');`
      - `export interface LiveTranscriptSource {`
      - `export interface SearchBackend {`
      - `export class InlineSearchBackend implements SearchBackend`
      - `export class GlobalSearchService implements IGlobalSearchService`
    - 类内方法（节选）：`dropLiveLockToken`
  - `packages/agent-core-v2/src/app/capability/entries/nighthawkWebbridge.ts`：
    - 导出签名/声明：
      - `export function createNighthawkWebbridgeEntry(ctx: CapabilityEntryContext): CapabilityEntry`
      - `export const __nighthawkWebbridgeInternals = { binaryAssetName, renameAcrossDevicesFallback };`

## 证据与代码位置

- `packages/minidb/src/cluster/index.ts`
- `packages/minidb/src/cluster/coordinator.ts`
- `packages/acp-adapter/src/server.ts`
- `packages/acp-adapter/src/question.ts`
- `packages/acp-adapter/src/events-map.ts`
- `packages/agent-core/src/flags/registry.ts`
- `packages/agent-core-v2/src/features/tower/flag.ts`
- `packages/agent-core-v2/src/session/subagent/flag.ts`
- `packages/agent-core-v2/src/session/sessionTitle/flag.ts`
- `packages/kap-server/src/search/searchService.ts`
- `packages/agent-core-v2/src/app/capability/entries/nighthawkWebbridge.ts`

> 本文所有路径均相对仓库根目录；引用内容以仓库当前 `HEAD` 为准。

