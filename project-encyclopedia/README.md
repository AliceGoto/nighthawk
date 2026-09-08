# NightHawk 项目百科全书

本目录是自动生成、可验证的 NightHawk 项目深度文档集，共 198 个 Markdown 文件（含本 README 索引与辅助文件）。

## 根目录导航

仓库根目录还有以下强制/导航文件：

- [`AGENTS.md`](../AGENTS.md) — 仓库级 Agent 指令
- [`CONSTRAINTS.md`](../CONSTRAINTS.md) — 全局硬约束
- [`PROMPTS.md`](../PROMPTS.md) — 全局提示词库
- [`INDEX.md`](../INDEX.md) — 仓库快速导航


## 怎么读

- 从 [00-overview/README.md](00-overview/README.md) 开始了解项目全貌。
- 按主题进入：架构、应用、包、特性、安全、数据流、技术栈、开发、竞品对比、术语、参考。

## 快速入口

- [完成报告](./COMPLETION.md)
- [覆盖验证](./VERIFICATION.md)
- [未实现功能清单](./UNIMPLEMENTED-FEATURES.md)
- [Vibe Coding 指南](./13-vibe-coding/README.md)
- [提示词与约束体系](./14-prompts-constraints/README.md)
- [包文档索引](./03-packages/README.md)

- 每篇文末都有“证据与代码位置”，指向仓库内真实文件。

## 文档分类

| 分类 | 数量 | 说明 |
| --- | --- | --- |
| 00-overview | 13 | 项目概览、定位、仓库地图、快速开始、全仓库遍历、完整源码地图、build/reports/scripts |
| 01-architecture | 15 | 分层、DI×Scope、生命周期、Feature、服务端、传输、关键决策 |
| 02-applications | 10 | CLI/TUI、VS Code、inspect、vis、ACP、迁移 |
| 03-packages | 58 | 19 个包的 overview / internals / usage + 包索引 |
| 04-features | 11 | Plan、Goal、Skill、MCP、子 Agent、权限、Hook、插件、官方插件 |
| 05-security | 12 | 安全引擎、规则、SecretScan、TaintTrace、DepAudit |
| 06-data-flow | 10 | 端到端数据流、会话、工具、MCP、事件、持久化 |
| 07-tech-stack | 11 | TypeScript、pnpm、tsdown、Vitest、oxlint、Nix、仓库技能 |
| 08-development | 9 | 搭建、构建、测试、lint、贡献、Native、完整开发流程 |
| 09-comparison | 9 | 与 Codex、Claude Code、Cursor、Aider 等差异 |
| 10-glossary | 6 | 核心术语 |
| 11-reference | 13 | CLI、命令、配置、API、WS、SDK、排障、包导出索引 |
| 13-vibe-coding | 8 | Vibe Coding 指南、提示词库、全流程、安全审计、提示词工程、AGENTS.md/Skills、角色化提示词、实战示例 |
| 14-prompts-constraints | 7 | 提示词与约束体系：全局约束、功能级提示词、包级提示词、目录级约束、强制执行、文件索引 |
| 覆盖验证 | 1 | `VERIFICATION.md` 自动验证包/应用/文档/约束覆盖 |
| 完成报告 | 1 | `COMPLETION.md` 文档项目最终状态 |
| 未实现清单 | 1 | `UNIMPLEMENTED-FEATURES.md` 未实现/部分实现功能报告 |

## 文档增强

每篇正文文档现在都包含：

- **专业实现要点（开发流程视角）**：需求分析、设计决策、实现步骤、验证方式、维护注意。
- **逐函数实现说明**：从真实源码提取的导出函数/类表格，包含文件、行号、签名和实现职责。
- **核心代码片段**：直接从仓库源码截取的关键实现片段，展示真实代码形态。
- **时序/状态图**：Mermaid 图，展示模块的调用/状态流转。
- **核心实现细节（源码导出）**：从真实源码提取的导出签名、类、函数与方法，帮助把概念映射到代码。
- **证据与代码位置**：指向仓库内可验证路径。

## 验证方式

所有文档在生成时读取了仓库的 `package.json`、`AGENTS.md`、源码目录结构和关键实现文件。要验证某一篇结论，请打开文末列出的代码路径。
