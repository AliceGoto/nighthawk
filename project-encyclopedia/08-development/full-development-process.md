# NightHawk 完整开发流程（从需求到发布）

本文把 NightHawk 仓库的工程实践串成一条可执行的完整开发流程，覆盖需求、设计、实现、测试、审查、文档、发布。

## 1. 需求与影响评估

```sh
git log main..HEAD --oneline
git diff main..HEAD --stat
ls .changeset/*.md
```

- 先判断改动是否影响用户可感知行为。
- 如果不影响用户，不需要文档和 changeset。
- 如果影响用户，按 `gen-docs` skill 更新文档。

## 2. 本地环境

```sh
# Node >= 24.15.0, pnpm 10.33.0
pnpm install
pnpm run build:packages
```

- `.npmrc` 有 `engine-strict=true`，Node 版本不满足会直接失败。

## 3. 设计

- 如果是 `agent-core-v2` 改动，阅读 `packages/agent-core-v2/AGENTS.md` 和 `docs/`。
- 确定 Service 的 Scope：App / Workspace / Session / Agent。
- 优先复用现有 Contribution 和 Feature 机制。
- 不要给 session 状态使用 App 级 Map。

## 4. 实现规范

- 核心区域遵守 comment-free 规则。
- 可选对象属性直接传 `undefined`，不要条件展开。
- 包入口 `index.ts` 使用 `export * from './module'`。
- 新增 workspace 包必须同步 `pnpm-workspace.yaml` 与 `flake.nix`。

## 5. 测试

```sh
pnpm -C packages/agent-core test
pnpm -C packages/agent-core-v2 test
pnpm -C apps/nighthawk test
pnpm test
```

- 优先把测试加到已有测试文件。
- v2 测试通过接口解析服务，不要直接 `new` 生产服务。
- 安全引擎改动后运行 `node scripts/smoke-security.ts`。

## 6. Lint 与类型检查

```sh
pnpm lint
pnpm typecheck
pnpm sherif
pnpm lint:pkg
```

- `lint` 会运行 comment-free 守卫、Nix workspace 校验、服务命名校验。
- 提交前确保 `git diff --check` 没有空白错误。

## 7. 文档

- 用户可见行为变化：使用 `gen-docs` skill。
- 中英文页面同步：使用 `translate-docs` skill。
- Changelog：由 `sync-changelog` 自动同步，不要手改 `docs/en/release-notes/changelog.md`。

## 8. Changeset

```sh
pnpm changeset
```

- 用户可感知变更才需要 changeset。
- 默认 minor，修复 patch；不要自行决定 major，除非用户明确确认。

## 9. PR

- 标题遵循 Conventional Commit，例如 `feat(tui): add /status command`。
- 填写 `.github/pull_request_template.md`。
- 不要提交 scratch 文件、设计稿、handoff 文档。
- 提交前运行 `git status` 和 `git diff --staged --stat`。

## 10. 发布

- CI：GitHub Actions 构建、分片测试、lint、typecheck、安全 smoke。
- 发布：Changesets 管理版本与 changelog。
- Native：`build:native:release` 构建 SEA 二进制。

## 专业实现要点（开发流程视角）

### 需求分析

开发流程要让贡献者能快速搭建、构建、测试、提交。

### 设计决策

根 AGENTS.md 作为热路径规则；各包 AGENTS.md 记录局部约定；skill 目录沉淀可复用流程。

### 实现步骤

安装依赖 → 构建包 → 修改代码 → 运行相关测试 → lint → 生成 changeset → PR。

### 验证方式

本地 `pnpm lint && pnpm typecheck && pnpm test`；CI 分片验证。

### 维护注意

提交前清理 scratch 文件，遵循 Conventional Commit，不泄露内部标识。

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

> 图注：`08-development/full-development-process.md` 的抽象流程；具体参与者与状态以源码和上文函数说明为准。

## 核心实现细节（源码导出）

以下是本文涉及路径中的真实源码导出/结构，帮助你把概念映射到函数、类与方法：

  - `CONTRIBUTING.md`（非 TS 源码，可直接阅读）
  - `CONTRIBUTING.zh-CN.md`（非 TS 源码，可直接阅读）
  - `AGENTS.md`（非 TS 源码，可直接阅读）
  - `.agents/skills/gen-docs/SKILL.md`（非 TS 源码，可直接阅读）
  - `.agents/skills/gen-changesets/SKILL.md`（非 TS 源码，可直接阅读）
  - `.agents/skills/translate-docs/SKILL.md`（非 TS 源码，可直接阅读）
  - `.github/workflows/release.yml`（非 TS 源码，可直接阅读）
  - `package.json`（非 TS 源码，可直接阅读）

## 证据与代码位置

- `CONTRIBUTING.md`
- `CONTRIBUTING.zh-CN.md`
- `AGENTS.md`
- `.agents/skills/gen-docs/SKILL.md`
- `.agents/skills/gen-changesets/SKILL.md`
- `.agents/skills/translate-docs/SKILL.md`
- `.github/workflows/release.yml`
- `package.json`
