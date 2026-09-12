# `nighthawk acp` Subcommand

`nighthawk acp` switches NightHawk CLI to **ACP (Agent Client Protocol)** mode: it communicates with an ACP client (such as Zed, JetBrains AI Chat, etc.) via JSON-RPC over stdin/stdout, letting the IDE directly drive NightHawk's sessions, prompts, and tool calls.

```sh
nighthawk acp
```

Once started, the command prints no banner and immediately waits for the ACP client to send an `initialize` request on stdin. Logs are written to stderr (as well as the diagnostic log under `~/.nighthawk/logs/`), so the ACP channel itself stays clean.

::: tip Who calls this?
You typically do not need to run `nighthawk acp` manually — this command is the subprocess entry point for IDEs. For IDE-side configuration, see [Using in IDEs](../guides/ides.md).
:::

## Capability Matrix

The table below lists the capabilities declared by the current ACP adapter layer. The `agentCapabilities` field is returned in full in the `initialize` response, so the IDE can adjust its UI accordingly.

| Capability | Value | Description |
| --- | --- | --- |
| `promptCapabilities.image` | `true` | Supports ACP `image` content blocks (base64 + mimeType) |
| `promptCapabilities.audio` | `false` | Audio prompts not yet supported |
| `promptCapabilities.embeddedContext` | `true` | Client may send `resource`/`resource_link` embedded resource blocks; text content is injected into the prompt as `<resource uri="...">...</resource>`; blob resources are dropped with a warn |
| `mcpCapabilities.http` | `true` | Forwards HTTP MCP services configured by the IDE |
| `mcpCapabilities.sse` | `true` | Forwards legacy SSE MCP services configured by the IDE |
| `mcpCapabilities.acp` | `true` | Forwards ACP MCP services configured by the IDE |
| `loadSession` | `true` | Supports `session/load` to resume an existing session, replaying history on load |
| `sessionCapabilities.list` | `{}` | Supports `session/list` to enumerate the current user's sessions |

## ACP Method Coverage

The spec divides methods into a **stable** surface and an evolving **unstable** surface (handlers mounted with the `unstable_*` prefix in `@agentclientprotocol/sdk@0.23.0`). The two have entirely different stability guarantees — the stable surface covers methods every production ACP client uses, while the unstable surface covers experimental extensions (inline-edit prediction, document buffer sync, provider management, elicitation, etc.) — so they are tracked separately.

**Summary: stable agent-side 12/12 (100%) + client reverse-RPC 5/9 (56%); unstable surface has `session/set_model` + `elicitation/create` (2/19).** All methods needed for a normal agent flow (initialize → auth → new/load/resume → prompt → cancel + file I/O + tool approval + terminal execution + question elicitation) are implemented.

### Stable agent-side — IDE → agent (12 / 12)

| Method | Implemented | Description |
| --- | --- | --- |
| `initialize` | Yes | Version negotiation; returns `agentInfo: { name: 'NightHawk CLI', version }`, capability matrix, and `authMethods` |
| `authenticate` | Yes | Validates `method_id='login'`; returns `authRequired (-32000)` if token is missing, `invalidParams (-32602)` for unknown ID |
| `session/new` | Yes | Accepts `cwd` / `mcpServers`; returns `configOptions[]` |
| `session/load` | Yes | Restores a session from disk and replays history via `session/update` |
| `session/resume` | Yes | Lightweight sibling of `session/load`; skips history replay |
| `session/prompt` | Yes | Accepts `text` / `image` / `resource` / `resource_link` content blocks; streams `agent_message_chunk` |
| `session/cancel` | Yes | Interrupts the current turn |
| `session/list` | Yes | Enumerates sessions on disk (advertised via `sessionCapabilities.list = {}`) |
| `session/set_mode` | Yes | Compatibility path; dispatches to the same handler as `set_config_option({configId:'mode'})` |
| `session/set_config_option` | Yes | Unified model / thinking / mode picker dispatcher |
| `session/close` | Yes | Closes a live session; best-effort (unknown or already-closed session is not an error) |
| `logout` | Yes | Clears stored credentials via `oauthService.logout` |

### Stable client-side reverse-RPC — agent → IDE (5 / 9)

| Method | Implemented | Description |
| --- | --- | --- |
| `session/update` | Yes | Streams `agent_message_chunk` / `tool_call*` / `plan` / `config_option_update` / `available_commands_update` |
| `session/request_permission` | Yes | Shared channel for tool approval and question elicitation; used as the fallback for `AskUserQuestion` when `elicitation/form` is unavailable |
| `fs/read_text_file` | Yes | File reads at the kaos layer are routed to the client (advertised via `fsCapabilities`) |
| `fs/write_text_file` | Yes | File writes at the kaos layer are routed to the client |
| `terminal/create` · `output` · `release` · `kill` · `wait_for_exit` | Yes | Terminal reverse-RPC for Bash execution; enabled when the client advertises `clientCapabilities.terminal` at `initialize`; falls back to local execution when not advertised |

### Unstable surface (2 / 19)

| Method | Implemented | Description |
| --- | --- | --- |
| `session/set_model` | Yes | Compatibility path; equivalent to `set_config_option({configId:'model'})` |
| `elicitation/create` | Yes | Form-mode question elicitation; enables native multi-question + multi-select when the client advertises `clientCapabilities.elicitation.form` at `initialize`; falls back to `session/request_permission` on failure |
| Remaining 17 methods | No | Includes session lifecycle extensions, buffer sync, inline-edit prediction, provider management, etc. |

::: warning Known boundary
When the client does not advertise `elicitation/form`, `AskUserQuestion` falls back to the `session/request_permission` bridge. In that fallback mode only the first question is sent, `multiSelect` is collapsed to single-select, and the synthetic `Other` free-text option is unsupported.
:::

All methods not listed above return `methodNotFound`.

## MCP Forwarding

When an ACP client provides `mcpServers` in `session/new` or `session/load`, the adapter layer performs the following conversions:

- `http` → NightHawk's `transport: 'http'` configuration
- `stdio` → NightHawk's `transport: 'stdio'` configuration
- `sse` → NightHawk's `transport: 'sse'` configuration
- `acp` → NightHawk's `transport: 'acp'` configuration, with `serverId` taken from the ACP MCP server's `id`

## Next steps

- [Using in IDEs](../guides/ides.md) — Zed / JetBrains configuration steps and troubleshooting
- [`nighthawk` Command Reference](./nighthawk-command.md) — Complete subcommand list
