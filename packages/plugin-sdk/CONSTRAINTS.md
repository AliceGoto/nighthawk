# plugin-sdk 约束与提示词

> 本文件由仓库文档工程自动生成，用于约束 AI 工具在该目录下的行为。

## 本模块定位

插件开发者 TypeScript 类型与工具包，提供 `PluginManifest`、MCP 配置、Hook 定义、marketplace 类型与插件名校验工具。

## 开发提示词

```text
请修改 packages/plugin-sdk。
先阅读本目录 CONSTRAINTS.md、AGENTS.md（如有）、README.md（如有）和相关源码。
遵循项目根 AGENTS.md 和本文件约束。
实现后运行对应测试、typecheck、lint，并汇报变更。
```

## 硬约束

```markdown
- 只修改 packages/plugin-sdk 下与任务直接相关的文件。
- 保持纯类型/轻量工具，不依赖引擎运行时。
- 新 manifest 字段必须同步引擎校验逻辑。
- 保持 Marketplace 类型与 plugins/marketplace.json 一致。
- 修改后必须运行 `pnpm -C packages/plugin-sdk typecheck`。
```

## 验证命令

```sh
pnpm -C packages/plugin-sdk typecheck
```

## 相关文档

- `project-encyclopedia/03-packages/plugin-sdk/`
- `project-encyclopedia/14-prompts-constraints/per-package-prompts.md`

## 证据与代码位置

- `packages/plugin-sdk/package.json`
- `packages/plugin-sdk/CONSTRAINTS.md`
