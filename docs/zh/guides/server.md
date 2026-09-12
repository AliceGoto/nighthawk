# 本地服务与 API

NightHawk CLI 仍内置轻量级本地 web server 子命令 `nighthawk web`：它从 `dist-web/` 提供 Web UI，并暴露 OpenAI 兼容代理（`/v1/chat/completions` 与 `/v1/models`），把请求转发给本地引擎。TUI 中的 `/web` 命令以及 REST API（`/api/v1`）与 WebSocket 事件流（`/api/v1/ws`）已移除——`nighthawk web` 不再提供这两类程序化接口。

REST 与 WebSocket 的协议文档仍保留在 [服务 API](../reference/server-api.md) 页面，供仍需要对接已移除服务的集成方参考。

## 在浏览器中查看会话

如需在浏览器中轻量地跟进一次会话，可以使用会话可视化工具：

```sh
nighthawk vis                 # 启动可视化工具并打开浏览器
nighthawk vis 01HZ...XYZ      # 打开指定会话
```

`nighthawk vis` 会在 `127.0.0.1` 上启动一个本地服务（自动挑选空闲端口），打印访问地址、打开浏览器，并保持前台运行直到你按下 `Ctrl-C`。它提供会话可视化页面和一组 `/api/sessions/...` 检查端点——这是一个查看面，不是已移除的 REST/WebSocket API 的替代品：它不能创建会话，也不能提交提示词。完整选项见 [nighthawk 命令](../reference/nighthawk-command.md#nighthawk-vis) 参考。

## 下一步

- [服务 API](../reference/server-api.md) — REST 端点全集、错误码、WebSocket 事件与转录协议
- [nighthawk 命令](../reference/nighthawk-command.md) — 全部 `nighthawk` 子命令与 flag
