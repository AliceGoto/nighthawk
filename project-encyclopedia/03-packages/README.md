# 包文档索引

本目录为每个 workspace 包提供 overview / internals / usage 三篇文档。

## 包列表

| 包 | 定位 |
| --- | --- |
| `agent-core` | v1 统一 Agent 引擎、安全工具生产代码 |
| `agent-core-v2` | v2 DI×Scope 引擎、Feature 系统 |
| `kap-server` | NightHawk Server：REST + WebSocket |
| `klient` | 契约驱动客户端 SDK |
| `node-sdk` | 公开 TypeScript SDK |
| `kosong` | LLM 供应商抽象 |
| `kaos` | 执行环境抽象 |
| `pi-tui` | 终端 UI 组件框架 |
| `minidb` | 嵌入式 KV/文档库 |
| `transcript` | transcript 数据层 |
| `protocol` | 共享协议 schema |
| `oauth` | OAuth 工具包 |
| `telemetry` | 遥测基础设施 |
| `migration-legacy` | 旧版数据迁移 |
| `acp-adapter` | ACP v1 适配 |
| `acp-server` | ACP v2 宿主 |
| `tree-sitter-bash` | 纯 TS Bash 解析器 |
| `plugin-sdk` | 插件开发者类型与工具 |
| `security-core` | 已弃用安全引擎参考实现 |

## 约束文件

每个包目录都有 `CONSTRAINTS.md`，`src/` 和 `test/` 也有对应的 `CONSTRAINTS.md`。修改前必须阅读。

## 证据与代码位置

- `packages/*/package.json`
- `packages/*/CONSTRAINTS.md`
- `project-encyclopedia/03-packages/`
