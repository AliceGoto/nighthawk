# scripts 约束与提示词

本目录包含构建、守卫、安全冒烟、Nix 校验等脚本。

## 开发提示词

```text
请修改 scripts/ 下的脚本。
先阅读目标脚本和根 CONSTRAINTS.md。
保持脚本职责单一，不把业务逻辑塞进脚本。
修改后运行相关验证。
```

## 硬约束

- 不破坏 `pnpm lint`、`pnpm typecheck`、`pnpm test` 依赖的守卫脚本。
- 安全冒烟脚本 `smoke-security.ts` 必须保持可独立运行。
- 不添加需要联网才能完成核心验证的脚本。
- 新增脚本必须在 `package.json` 或文档中说明用途。

## 验证命令

```sh
node scripts/check-no-comments.mjs
node scripts/check-nix-workspace.mjs
node scripts/smoke-security.ts
```

## 证据与代码位置

- `scripts/`
- `package.json`
