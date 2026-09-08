# vscode 提示词

> 本文件提供本模块的推荐提示词。约束见同目录 `CONSTRAINTS.md`。

## 标准开发提示词

```text
请修改 apps/vscode。
先阅读本目录 CONSTRAINTS.md、AGENTS.md（如有）、README.md（如有）和相关源码。
遵循项目根 AGENTS.md、CONSTRAINTS.md、PROMPTS.md。
实现后运行对应测试、typecheck、lint，并汇报变更。
```

## 审查提示词

```text
请审查 apps/vscode 的改动。
重点：正确性、安全性、性能、风格、测试覆盖。
```

## 安全提示词

```text
请对 apps/vscode 相关改动执行安全审计。
使用 SecurityScan / SecretScan / TaintTrace / DepAudit。
```

## 相关文档

- `project-encyclopedia/03-packages/vscode/`（如果存在）
- `project-encyclopedia/13-vibe-coding/`
- `project-encyclopedia/14-prompts-constraints/`

## 证据与代码位置

- `apps/vscode/CONSTRAINTS.md`
- `apps/vscode/PROMPTS.md`
