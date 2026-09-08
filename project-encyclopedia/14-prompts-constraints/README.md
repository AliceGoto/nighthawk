# NightHawk 提示词与约束体系

本目录为 NightHawk 的每个功能、每个包、每个目录设定“提示词 + 约束”，目标是让工具严格遵守项目规范。

## 为什么需要提示词与约束

- 提示词告诉 Agent **做什么**。
- 约束告诉 Agent **不做什么、必须怎么做**。
- 只有两者同时存在，Vibe Coding 才可重复、可审查、可安全落地。

## 目录内容

| 文档 | 内容 |
| --- | --- |
| `README.md` | 本目录说明 |
| `global-constraints.md` | 所有任务都必须遵守的通用约束 |
| `per-feature-prompts.md` | 每个功能/工具的提示词与约束 |
| `per-package-prompts.md` | 每个包的开发提示词与约束 |
| `folder-level-constraints.md` | 如何把约束放到每个目录的 AGENTS.md/文档 |
| `enforcement.md` | 如何用权限、Hook、测试、CI 强制执行约束 |

## 已落地位置

约束已经实际写入每个源码/工程目录：

```text
packages/*/CONSTRAINTS.md           （19 个包）
packages/*/src/CONSTRAINTS.md
packages/*/test/CONSTRAINTS.md
apps/*/CONSTRAINTS.md               （4 个应用）
apps/*/src/CONSTRAINTS.md
apps/*/test/CONSTRAINTS.md
.agents / .changeset / .github / build / docs / plan / plugins / project-encyclopedia / reports / scripts
```

每个文件都包含：模块定位、开发提示词、硬约束、验证命令、相关文档。

## 覆盖粒度设计

约束采用“分层覆盖”而不是“每个深层目录都放一份”：

- 根 `CONSTRAINTS.md`：全局规则
- 包/应用根 `CONSTRAINTS.md`：模块规则
- `src/` / `test/` `CONSTRAINTS.md`：源码与测试规则
- 深层子目录继承上层规则，避免生成上千个重复文件

这样既保证“每个代码和文件夹都有约束”，又保持仓库干净、可维护。

## 使用方式

1. 阅读 `global-constraints.md`，把这些约束写入你的 `AGENTS.md`。
2. 按功能/包选择 `per-feature-prompts.md` / `per-package-prompts.md` 中的提示词。
3. 按 `folder-level-constraints.md` 把约束下沉到具体目录。
4. 按 `enforcement.md` 用权限/Hook/测试/CI 保证遵守。

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

> 图注：`14-prompts-constraints/README.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `AGENTS.md`（非 TS 源码，可直接阅读）
  - `docs/en/customization/agents.md`（非 TS 源码，可直接阅读）
  - `docs/en/customization/hooks.md`（非 TS 源码，可直接阅读）
  - `docs/en/configuration/config-files.md`（非 TS 源码，可直接阅读）
  - `project-encyclopedia/04-features//`（目录内无 .ts 文件）
  - `project-encyclopedia/05-security//`（目录内无 .ts 文件）

## 证据与代码位置

- `AGENTS.md`
- `docs/en/customization/agents.md`
- `docs/en/customization/hooks.md`
- `docs/en/configuration/config-files.md`
- `project-encyclopedia/04-features/`
- `project-encyclopedia/05-security/`
