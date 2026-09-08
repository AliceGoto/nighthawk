# 包级提示词与约束

本文为每个 workspace 包提供开发提示词与硬约束，适合放入各包的 `AGENTS.md` 或开发文档。

## packages/agent-core

```text
请修改 v1 Agent 引擎。
约束：
- 不破坏 Agent 独立可用性。
- 安全工具生产代码在这里，改动后运行 scripts/smoke-security.ts。
- 不引入对 Session 的强依赖。
```

## packages/agent-core-v2

```text
请修改 v2 DI×Scope 引擎。
约束：
- 遵循四层 Scope：App/Workspace/Session/Agent。
- 不把 session 状态放到 App 级 Map。
- 新能力优先用 Feature/Contribution。
- 遵守 comment-free 规则。
- 运行 agent-core-dev 技能。
```

## packages/kap-server

```text
请修改 NightHawk Server。
约束：
- 保持 REST/WS 的 envelope 协议兼容。
- 不暴露未授权 debug 端点。
- 路由改动同步 protocol schema。
- 遵守 comment-free 规则。
```

## packages/klient

```text
请修改客户端 SDK。
约束：
- 不暴露引擎内部 service token。
- 新方法必须加 zod contract。
- memory 和 IPC 必须跑同一套 conformance suite。
```

## packages/node-sdk

```text
请修改公开 TypeScript SDK。
约束：
- 不直接暴露 agent-core 内部实现。
- 公共 API 变更必须同步类型和文档。
- 保持 v1/v2 兼容层稳定。
```

## packages/kosong

```text
请修改 LLM 抽象层。
约束：
- 保持 provider 无关。
- 新 provider 必须支持流式、tool calling、usage、错误分级。
- 不把单一厂商逻辑泄漏到上层。
```

## packages/kaos

```text
请修改执行环境抽象。
约束：
- 本地/SSH 行为保持接口一致。
- 不直接依赖 node:fs/child_process 的业务代码。
- 远程环境探测未实现前不得假装支持。
```

## packages/pi-tui

```text
请修改 TUI 组件库。
约束：
- 保持 differential rendering 和 synchronized output。
- 组件 render 行宽不能超过 width。
- 不引入非必要依赖。
```

## packages/minidb

```text
请修改嵌入式数据库。
约束：
- 保持零运行时依赖。
- WAL、snapshot、generation 必须崩溃安全。
- 2PC 未实现前不得声称支持。
```

## packages/transcript

```text
请修改 transcript 数据层。
约束：
- 保持 L1-L4 分层。
- op 必须幂等。
- 不依赖 agent 引擎。
```

## packages/protocol

```text
请修改共享协议 schema。
约束：
- 保持向后兼容。
- 新协议字段必须加 zod schema。
- 不引入运行时依赖。
```

## packages/oauth

```text
请修改 OAuth 工具包。
约束：
- token 写入必须串行化。
- 不泄漏凭据到日志。
```

## packages/telemetry

```text
请修改遥测基础设施。
约束：
- 不采集敏感内容。
- 失败不能阻塞主流程。
```

## packages/migration-legacy

```text
请修改迁移工具。
约束：
- 迁移必须可报告、可失败恢复。
- 不覆盖用户未确认的数据。
```

## packages/acp-adapter / acp-server

```text
请修改 ACP 适配/宿主。
约束：
- 保持 JSON-RPC 协议兼容。
- 扩展方法未实现前返回 MethodNotFound，不静默吞掉。
- 多问题/plan_removed 等未完整能力必须明确降级。
```

## packages/tree-sitter-bash

```text
请修改 Bash 解析器。
约束：
- 保持无 wasm、无原生依赖。
- 解析必须带预算和错误恢复。
- 不改变与 tree-sitter-bash 的已记录差异。
```

## packages/plugin-sdk

```text
请修改插件开发者 SDK。
约束：
- 保持纯类型/轻量工具，不依赖引擎运行时。
- 新 manifest 字段必须同步引擎校验逻辑。
- 保持 Marketplace 类型与 plugins/marketplace.json 一致。
```

## packages/security-core

```text
请修改参考安全引擎。
约束：
- 已弃用，不新增生产依赖。
- 新安全逻辑应放入 agent-core 的 security 目录。
```

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

> 图注：`14-prompts-constraints/per-package-prompts.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `packages/*/AGENTS.md`（路径不存在，请以仓库实际文件为准）
  - `packages/*/package.json`（路径不存在，请以仓库实际文件为准）
  - `project-encyclopedia/03-packages//`（目录内无 .ts 文件）

## 证据与代码位置

- `packages/*/AGENTS.md`
- `packages/*/package.json`
- `project-encyclopedia/03-packages/`
