# CI/CD

GitHub Actions 做构建、分片测试、lint、typecheck、安全 smoke。

## Workflows

全部 CI/CD 统一在 `.github/workflows/release.yml` 一个文件里。文件名必须保持 `release.yml`：npm Trusted Publishing 绑定的是该文件路径。PR 触发检查、Nix 构建、pkg.pr.new 预览包与 PR 标题检查；push 到 `main` 时额外触发 changesets 发布、GitHub Pages 部署、原生包构建与 Homebrew formula 更新。

## 测试分片

5 个 vitest shard；pi-tui 单独；VS Code legacy 单独。

## Lint

oxlint + sherif + 仓库守卫。

## 发布

Changesets action 管理版本 PR 和 npm publish。原生包与 Homebrew formula 只在发布时（或手动 dispatch 指定 tag 时）构建，不再随每次 push 触发。

## 专业实现要点（开发流程视角）

### 需求分析

技术栈选择要支撑大型 monorepo、严格类型、快速构建、可复现环境。

### 设计决策

TypeScript strict + tsdown + pnpm workspace + Nix flake；用 oxlint 而非传统 eslint。

### 实现步骤

先搭 workspace 与 tsconfig，再引入 tsdown/vitest/oxlint/changesets/CI。

### 验证方式

执行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm run build`。

### 维护注意

依赖版本锁定在 packageManager；Nix 路径与 pnpm workspace 保持一致。

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

> 图注：`07-tech-stack/github-actions.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `.github/workflows//`（目录内无 .ts 文件）
  - `AGENTS.md`（非 TS 源码，可直接阅读）
  - `package.json`（非 TS 源码，可直接阅读）

## 证据与代码位置

- `.github/workflows/`
- `AGENTS.md`
- `package.json`

> 本文所有路径均相对仓库根目录；引用内容以仓库当前 `HEAD` 为准。
