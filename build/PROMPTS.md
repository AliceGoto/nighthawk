# build 提示词

> 约束见 `CONSTRAINTS.md`。

## 开发提示词

```text
请修改 build/ 下的构建插件。
保持通用性，不绑定具体业务。
修改后验证各包 build 仍通过。
```

## 验证

```sh
pnpm run build:packages
```

## 证据与代码位置

- `build/CONSTRAINTS.md`
- `build/`
