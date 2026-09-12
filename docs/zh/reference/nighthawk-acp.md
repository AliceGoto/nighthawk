# `nighthawk acp` 子命令

`nighthawk acp` 把 NightHawk CLI 切换到 **ACP (Agent Client Protocol)** 模式：在标准输入/输出上以 JSON-RPC 形式与 ACP 客户端（如 Zed、JetBrains AI Chat 等）对话，让 IDE 直接驱动 NightHawk 的会话、prompt 与工具调用。

```sh
nighthawk acp
```

启动后命令不会打印任何 banner，立刻等待 ACP 客户端在 stdin 上发出 `initialize` 请求。日志会写到标准错误（以及 `~/.nighthawk/logs/` 下的诊断日志），所以 ACP 通道本身保持干净。

::: tip 谁会调用它？
你通常不需要手动跑 `nighthawk acp`——这个命令是给 IDE 的子进程入口准备的。IDE 端的配置见[在 IDE 中使用](../guides/ides.md)。
:::

## 能力矩阵

下表列出当前 ACP 适配层声明的能力。`agentCapabilities` 字段在 `initialize` 响应里完整返回，IDE 端可据此调整 UI。

| 能力 | 取值 | 说明 |
| --- | --- | --- |
| `promptCapabilities.image` | `true` | 支持 ACP `image` 内容块（base64 + mimeType） |
| `promptCapabilities.audio` | `false` | 暂不支持音频 prompt |
| `promptCapabilities.embeddedContext` | `true` | 客户端可发送 `resource`/`resource_link` 嵌入式资源块，文本内容会以 `<resource uri="...">...</resource>` 形式注入 prompt；blob 资源被丢弃并写 warn |
| `mcpCapabilities.http` | `true` | 转发 IDE 配置的 HTTP MCP 服务 |
| `mcpCapabilities.sse` | `true` | 转发 IDE 配置的旧式 SSE MCP 服务 |
| `mcpCapabilities.acp` | `true` | 转发 IDE 配置的 ACP MCP 服务 |
| `loadSession` | `true` | 支持 `session/load` 续接已有会话，加载时会同步回放历史 |
| `sessionCapabilities.list` | `{}` | 支持 `session/list` 枚举当前用户的会话 |
| `sessionCapabilities.close` | `{}` | 支持 `session/close` 关闭活跃会话 |
| `sessionCapabilities.delete` | `{}` | 支持 `session/delete` 从磁盘删除已持久化的会话 |
| `sessionCapabilities.fork` | `{}` | 支持 `session/fork` 从已有会话创建新会话 |
| `auth.logout` | `{}` | 支持 `logout` 清除已存储的凭证 |

## ACP 方法覆盖

规范把方法分为**稳定**面和仍在演化的**不稳定**面（`@agentclientprotocol/sdk@0.23.0` 中以 `unstable_*` 前缀挂载的 handler）。两部分稳定性保证完全不同——稳定面是任何生产 ACP 客户端都会用到的方法，不稳定面覆盖实验性扩展（inline-edit 预测、document 缓冲区同步、provider 管理、elicitation 等），因此分开追踪。

**概览：稳定面 agent-side 实现 12/12（100%）+ client reverse-RPC 实现 5/9（56%）；不稳定面接入了 `session/set_model` + `elicitation/create`（2/19）。** 任何正常 agent 流程所需的方法（initialize → auth → new/load/resume → prompt → cancel + 文件 I/O + 工具审批 + 终端执行 + 问题 elicitation）都已实现。

### 稳定面 agent-side — IDE → agent（12 / 12）

| 方法 | 状态 | 说明 |
| --- | --- | --- |
| `initialize` | 是 | 版本协商；返回 `agentInfo: { name: 'NightHawk CLI', version }`、能力矩阵、`authMethods` |
| `authenticate` | 是 | 校验 `method_id='login'`；token 缺失返回 `authRequired (-32000)`，未知 id 返回 `invalidParams (-32602)` |
| `session/new` | 是 | 接受 `cwd` / `mcpServers`，返回 `configOptions[]` |
| `session/load` | 是 | 恢复磁盘会话并把历史以 `session/update` 同步回放 |
| `session/resume` | 是 | `session/load` 的轻量兄弟方法，跳过历史回放 |
| `session/prompt` | 是 | 接受 `text` / `image` / `resource` / `resource_link` 内容块，流式输出 `agent_message_chunk` |
| `session/cancel` | 是 | 中断当前 turn |
| `session/list` | 是 | 枚举磁盘会话（通过 `sessionCapabilities.list = {}` 公告） |
| `session/set_mode` | 是 | 兼容路径，与 `set_config_option({configId:'mode'})` 走同一 dispatcher |
| `session/set_config_option` | 是 | 统一的 model / thinking / mode picker 分发 |
| `session/close` | 是 | 关闭活跃会话；尽力操作（未知或已关闭的会话不报错） |
| `logout` | 是 | 通过 `oauthService.logout` 清除已存储的凭证 |

### 稳定面 client-side reverse-RPC — agent → IDE（5 / 9）

| 方法 | 状态 | 说明 |
| --- | --- | --- |
| `session/update` | 是 | 流式推送 `agent_message_chunk` / `tool_call*` / `plan` / `config_option_update` / `available_commands_update` |
| `session/request_permission` | 是 | 工具审批和问题 elicitation 共用此通道；当 `elicitation/form` 不可用时，作为 `AskUserQuestion` 的降级通道 |
| `fs/read_text_file` | 是 | kaos 层文件读取路由到客户端（通过 `fsCapabilities` 公告） |
| `fs/write_text_file` | 是 | kaos 层文件写入路由到客户端 |
| `terminal/create` · `output` · `release` · `kill` · `wait_for_exit` | 是 | 终端 reverse-RPC，用于 Bash 执行；客户端在 `initialize` 中公告 `clientCapabilities.terminal` 时启用；未公告时降级为本地执行 |

### 不稳定面（2 / 19）

| 方法 | 状态 | 说明 |
| --- | --- | --- |
| `session/set_model` | 是 | 兼容路径，等价于 `set_config_option({configId:'model'})` |
| `elicitation/create` | 是 | 表单模式的问题 elicitation；客户端在 `initialize` 中公告 `clientCapabilities.elicitation.form` 时启用原生多题 + 多选；失败时降级到 `session/request_permission` |
| 其余 17 个方法 | 否 | 包括 session 生命周期扩展、缓冲区同步、inline-edit 预测、provider 管理等 |

::: warning 已知边界
当客户端未公告 `elicitation/form` 时，`AskUserQuestion` 会降级到 `session/request_permission` 通道；该通道仅发送第一个问题，`multiSelect` 被折叠为单选，合成的 `Other` 自由文本选项也不受支持。
:::

上述未列出的方法一律返回 `methodNotFound`。

## MCP 转发

ACP 客户端在 `session/new` 或 `session/load` 中提供 `mcpServers` 时，适配层做如下转换：

- `http` → NightHawk 的 `transport: 'http'` 配置
- `stdio` → NightHawk 的 `transport: 'stdio'` 配置
- `sse` → NightHawk 的 `transport: 'sse'` 配置
- `acp` → NightHawk 的 `transport: 'acp'` 配置，`serverId` 取自 ACP MCP server 的 `id` 字段

## 下一步

- [在 IDE 中使用](../guides/ides.md) — Zed / JetBrains 配置步骤和故障排查
- [nighthawk 命令参考](./nighthawk-command.md) — 完整子命令列表
