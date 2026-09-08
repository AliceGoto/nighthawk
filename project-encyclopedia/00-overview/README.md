# 阅读指南与文档地图

本文档是 NightHawk 项目百科全书的入口，说明如何阅读 198 篇 Markdown、文档分类和证据约定。

## 文档目标

这套文档的目标是让读者能够从零讲清楚 NightHawk 是什么、为什么这样设计、代码如何组织、数据如何流动，以及它和市面 coding agent 的差异。所有结论都尽量给出仓库内代码路径作为证据。

## 文档分类

文档分为：项目概览、全仓库遍历、完整源码地图、架构、应用层、核心包、功能特性、安全引擎、数据流、技术栈、开发、竞品对比、术语表、参考手册、Vibe Coding 指南、提示词与约束体系、未实现功能清单。每一篇都独立可读，同时通过链接互相引用。

### 推荐入口

- [全仓库遍历报告](./full-traversal.md)：先看仓库到底有什么。
- [完整源码地图](./complete-source-map.md)：逐文件列出所有源码/文档/配置。
- [build/reports/scripts 说明](./build-and-reports.md)：看非业务但支撑工程的目录。
- [Vibe Coding 指南](../13-vibe-coding/README.md)：直接开始用 NightHawk 写代码。
- [提示词与约束体系](../14-prompts-constraints/README.md)：让工具严格遵守规范。
- [未实现功能清单](../UNIMPLEMENTED-FEATURES.md)：了解当前边界。


## 证据约定

每篇文档的“证据与代码位置”列出相关源码文件。仓库根目录是 `/Users/zhuyao/project/nighthawk`。文档不替代源码，只帮助你更快定位源码。

## 数量说明

本目录包含 198 篇 Markdown 文档，覆盖 23 个应用/包、核心 Agent 循环、安全工具、服务端、SDK、TUI、VS Code 扩展、数据层、工程化设施、Vibe Coding 提示词、官方插件、仓库技能、包导出索引、关键架构决策、提示词与约束体系、覆盖验证、完成报告、未实现功能报告。

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

> 图注：`00-overview/README.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `README.md`（非 TS 源码，可直接阅读）
  - `AGENTS.md`（非 TS 源码，可直接阅读）

## 证据与代码位置

- `README.md`
- `AGENTS.md`

> 本文所有路径均相对仓库根目录；引用内容以仓库当前 `HEAD` 为准。
