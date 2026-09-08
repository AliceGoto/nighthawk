# docs 约束与提示词

本目录是 VitePress 双语用户文档。

## 开发提示词

```text
请更新 docs/ 下的用户文档。
遵循 docs/AGENTS.md 的风格与术语表。
非 changelog 页面需要保持 en/zh 镜像。
```

## 硬约束

- 不手改 `docs/en/release-notes/changelog.md`，由脚本同步。
- 不写真实内部端点、密钥、账户名，使用 example 占位符。
- 中英文术语遵循 `docs/AGENTS.md` 术语表。
- 新增页面需要同步 `.vitepress/config.ts`。

## 验证命令

```sh
pnpm dev:docs
```

## 证据与代码位置

- `docs/AGENTS.md`
- `docs/.vitepress/config.ts`
- `docs/en/`
- `docs/zh/`
