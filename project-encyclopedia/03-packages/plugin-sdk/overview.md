# plugin-sdk 包概览

本页介绍 `packages/plugin-sdk` 包的定位、版本、目录结构和依赖。

## 定位

TypeScript types and utilities for NightHawk plugin developers.

`plugin-sdk` 是给插件开发者使用的公共类型与工具包，用于编写 `nighthawk.plugin.json` manifest、MCP server 配置、Hook 定义和 marketplace 条目。

## 元数据

| 属性 | 值 |
| --- | --- |
| 包名 | `@nighthawk/plugin-sdk` |
| 版本 | 0.1.0 |
| 说明 | TypeScript types and utilities for NightHawk plugin developers. |
| 源码文件数 | 2 |
| 顶层源码目录 | `src/index.ts`, `src/types.ts` |
| 主要 scripts | typecheck, clean |
| 依赖数 | 0 |

## 顶层模块

- `src/types.ts`：插件 manifest、MCP 配置、Hook 定义、marketplace 类型
- `src/index.ts`：导出所有类型与工具函数

## 测试规模

当前没有测试目录；包以纯类型和少量工具函数为主。

## 证据与代码位置

- `packages/plugin-sdk/package.json`
- `packages/plugin-sdk/src/index.ts`
- `packages/plugin-sdk/src/types.ts`
