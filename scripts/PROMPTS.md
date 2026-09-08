# scripts 提示词

> 约束见 `CONSTRAINTS.md`。

## 开发提示词

```text
请修改 scripts/ 下的脚本。
先阅读 CONSTRAINTS.md 和根 AGENTS.md。
保持脚本职责单一。
修改后运行相关验证。
```

## 验证

```sh
node scripts/check-no-comments.mjs
node scripts/check-nix-workspace.mjs
node scripts/smoke-security.ts
```

## 证据与代码位置

- `scripts/CONSTRAINTS.md`
- `scripts/`
