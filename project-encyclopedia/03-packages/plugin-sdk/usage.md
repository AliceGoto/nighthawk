# plugin-sdk 使用与开发

本页提供 `packages/plugin-sdk` 的常用命令与集成方式。

## 常用命令

```sh
pnpm -C packages/plugin-sdk typecheck
pnpm -C packages/plugin-sdk clean
```

## 构建

当前包没有 build 脚本，以源码直接发布/引用为主；如后续需要构建，应输出到 `dist/`。

## 测试

当前没有测试脚本；新增工具函数时应补充 Vitest 测试。

## 集成注意

- 插件开发者通过 `@nighthawk/plugin-sdk` 导入类型。
- 该包不依赖引擎运行时，保持轻量。
- 新增 manifest 字段需要同步更新引擎侧校验逻辑。

## 证据与代码位置

- `packages/plugin-sdk/package.json`
- `packages/plugin-sdk/tsconfig.json`
- `packages/plugin-sdk/src/index.ts`
