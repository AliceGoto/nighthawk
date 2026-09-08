# NightHawk 是什么

NightHawk 是一个安全优先的终端 AI Agent，把现代 coding agent 的 Turn/Step 循环与原生安全引擎放进同一个终端产品。

## 一句话定位

NightHawk 是“安全为先的终端 AI Agent —— 渗透测试、代码审计与高强度编程，同一个闭环”。它不是一个纯扫描器，也不是一个纯聊天机器人，而是一个既能读代码、改代码、跑命令，又能主动审计漏洞、追踪污点、扫描密钥的 agent harness。

## 核心能力

它包含：现代化 agent 内核（Turn/Step、子 Agent、MCP、Skills、持久记忆）、安全工具箱（116 条漏洞规则、密钥检测、跨文件污点追踪、依赖审计）、REST/WebSocket 服务端、CLI/TUI、VS Code 扩展、Web inspector 和可视化调试器。

## 目标用户

适合安全工程师、开发工程师、DevOps、代码审计人员，以及想在终端里获得完整 agent 工作流而不依赖 IDE 的用户。

## 代码事实

根 `README.zh-CN.md` 明确写了产品定位；`apps/nighthawk/package.json` 的 `bin.nighthawk` 是 CLI 入口；`packages/agent-core-v2` 是当前 v2 引擎。

## 专业实现要点（开发流程视角）

### 需求分析

先明确产品要解决的核心问题：终端 AI Agent 需要同时具备编程、代码审计、渗透测试能力。

### 架构选型

选择 TypeScript monorepo，让应用、服务端、SDK、数据层共享类型；选择 pnpm workspace 管理依赖。

### 实现步骤

先做 Agent 内核（v1），再沉淀公共包（kosong/kaos），随后演进 v2 DI×Scope 引擎，最后包装 CLI/TUI/VS Code/Server。

### 验证方式

使用 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`node scripts/smoke-security.ts` 形成回归防线。

### 维护注意

新增包必须同步 `pnpm-workspace.yaml` 与 `flake.nix`；公开 API 变更需 changeset。

## 逐函数实现说明

以下按源码文件列出可验证的导出函数/类，并给出实现职责说明。


## 核心代码片段

以下片段直接从仓库源码截取，用于展示关键实现形态；完整实现请打开对应文件。

> 本文证据路径没有可直接展示的 TS 源码片段。

## 时序/状态图

```mermaid
flowchart LR
    A[入口/调用方] --> B[本文核心模块]
    B --> C[依赖服务/数据层]
    C --> D[输出/事件/持久化]
```

> 图注：`00-overview/what-is-nighthawk.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `README.zh-CN.md`（非 TS 源码，可直接阅读）
  - `apps/nighthawk/package.json`（非 TS 源码，可直接阅读）
  - `packages/agent-core-v2/src/index.ts`：
    - 导出签名/声明：
      - `export type {`
      - `export type { SkillSource } from '#/features/skill/catalog/types';`
      - `export type { DaemonFileRef, MediaKind } from '#/agent/media/mediaRef';`
      - `export type { AgentToolContributionOptions } from '#/agent/toolRegistry/toolContribution';`
    - 再导出：`#/_base/di/descriptors`, `#/_base/di/errors`, `#/_base/di/graph`, `#/_base/di/instantiation`, `#/_base/di/instantiationService`, `#/_base/di/lifecycle`, `#/_base/di/scope`, `./app/scopes`, `#/_base/di/serviceCollection`, `#/_base/di/cascadeEngine`, `#/_base/di/dependencyGraph`, `#/_base/lifecycle/ledger`, `./errors`, `#/runtime/runtime`, `#/runtime/runtimeRegistry`, `#/runtime/runtimeWorkspaceView`, `#/runtime/runtimeProvider`, `#/runtime/runtimeUnitHost`, `#/runtime/localRuntime`, `#/runtime/standaloneRuntime`, `#/runtime/kaosRuntime`, `#/program/program`, `#/workspace/workspaceInstance/workspaceInstance`, `#/workspace/workspaceInstance/workspaceInstanceManager`, `#/workspace/workspaceInstance/workspaceInstanceManagerService`, `#/agent/runtimeBinding/runtimeBinding`, `#/agent/runtimeBinding/runtimeBindingService`, `#/agent/runtimeBinding/agentRuntime`, `#/app/sessionManager/sessionManager`, `#/app/sessionManager/sessionManagerService`

## 证据与代码位置

- `README.zh-CN.md`
- `apps/nighthawk/package.json`
- `packages/agent-core-v2/src/index.ts`

> 本文所有路径均相对仓库根目录；引用内容以仓库当前 `HEAD` 为准。
