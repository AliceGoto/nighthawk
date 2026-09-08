# build 约束与提示词

本目录包含 raw-text loader/plugin，用于在打包时把 `.md` 等资源作为字符串导入。

## 开发提示词

```text
请修改 build/ 下的构建插件。
保持 loader/plugin 通用性，不绑定具体业务。
修改后验证各包 `pnpm run build` 仍通过。
```

## 硬约束

- 不改变 raw text import 的既有语法（`?raw`）。
- 不引入额外运行时依赖。
- 不影响 Vite/Rolldown/tsdown 的正常打包。

## 验证命令

```sh
pnpm run build:packages
```

## 证据与代码位置

- `build/`
- `package.json`
