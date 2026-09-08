# plugin-sdk 内部实现

本页说明 `packages/plugin-sdk` 的关键内部模块与设计思路。

## 关键模块

- `src/types.ts`：定义插件开发者需要的全部类型
- `src/index.ts`：作为包入口重新导出 `./types`

## 设计重点

plugin-sdk 是纯类型/工具包，用于让插件开发者不依赖引擎内部实现即可声明：

- `PluginManifest`：`nighthawk.plugin.json` 的 schema
- `McpServerConfig`：stdio / http / sse / acp 四种 MCP 传输配置
- `HookDefConfig`：插件 Hook 定义
- `MarketplaceManifest`：`plugins/marketplace.json` 格式
- `PLUGIN_NAME_REGEX` 与 `normalizePluginId`：插件名校验/规范化

## 与其他包的关系

plugin-sdk 被插件开发者使用，也可能被引擎侧用于校验插件 manifest；当前包本身无运行时依赖。

## 可证明路径

- `packages/plugin-sdk/src/index.ts`
- `packages/plugin-sdk/src/types.ts`

## 证据与代码位置

- `packages/plugin-sdk/src/types.ts`
- `packages/plugin-sdk/src/index.ts`
- `packages/plugin-sdk/package.json`
