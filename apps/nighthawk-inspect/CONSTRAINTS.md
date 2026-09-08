# nighthawk-inspect 约束与提示词

> 本文件由仓库文档工程自动生成，用于约束 AI 工具在该目录下的行为。

## 本模块定位

kap-server debug RPC 的 Web 检查器：查看 workspace/session/agent 服务和 DI 单元。

## 开发提示词

当要求 AI 修改 `apps/nighthawk-inspect` 时，必须使用以下提示词框架：

```text
请修改 apps/nighthawk-inspect。
先阅读本目录 CONSTRAINTS.md、AGENTS.md（如有）、README.md（如有）和相关源码。
遵循项目根 AGENTS.md 和本文件约束。
实现后运行对应测试、typecheck、lint，并汇报变更。
```

## 硬约束

```markdown
- 只修改 `apps/nighthawk-inspect` 下与任务直接相关的文件。
- 不破坏该包的公开导出和协议兼容性。
- 新功能必须包含测试。
- 修改后必须运行 `pnpm -C {kind}/{name} typecheck`、`pnpm -C {kind}/{name} test`。
- 不提交敏感信息、临时文件、设计稿。
```

## 验证命令

```sh
pnpm -C apps/nighthawk-inspect typecheck
pnpm -C apps/nighthawk-inspect test
```

## 相关文档

- `project-encyclopedia/03-packages/nighthawk-inspect/`（包文档）
- `project-encyclopedia/14-prompts-constraints/per-package-prompts.md`

## 证据与代码位置

- `apps/nighthawk-inspect/package.json`
- `apps/nighthawk-inspect/CONSTRAINTS.md`
