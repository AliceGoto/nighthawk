# transcript 约束与提示词

> 本文件由仓库文档工程自动生成，用于约束 AI 工具在该目录下的行为。

## 本模块定位

同构 transcript 数据层：L1 store、L2 idempotent ops、L3 订阅粒度、L4 view registry；拥有契约类型。

## 开发提示词

当要求 AI 修改 `packages/transcript` 时，必须使用以下提示词框架：

```text
请修改 packages/transcript。
先阅读本目录 CONSTRAINTS.md、AGENTS.md（如有）、README.md（如有）和相关源码。
遵循项目根 AGENTS.md 和本文件约束。
实现后运行对应测试、typecheck、lint，并汇报变更。
```

## 硬约束

```markdown
- 只修改 `packages/transcript` 下与任务直接相关的文件。
- 不破坏该包的公开导出和协议兼容性。
- 新功能必须包含测试。
- 修改后必须运行 `pnpm -C {kind}/{name} typecheck`、`pnpm -C {kind}/{name} test`。
- 不提交敏感信息、临时文件、设计稿。
```

## 验证命令

```sh
pnpm -C packages/transcript typecheck
pnpm -C packages/transcript test
```

## 相关文档

- `project-encyclopedia/03-packages/transcript/`（包文档）
- `project-encyclopedia/14-prompts-constraints/per-package-prompts.md`

## 证据与代码位置

- `packages/transcript/package.json`
- `packages/transcript/CONSTRAINTS.md`
