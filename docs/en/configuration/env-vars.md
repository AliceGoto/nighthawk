# Environment variables

NightHawk CLI uses environment variables to control a small number of runtime behaviors: relocating the data directory, turning off telemetry, and temporarily switching models without touching the config file.

::: warning Important: API keys are not configured here
Credential variables such as `NIGHTHAWK_API_KEY`, `ANTHROPIC_API_KEY`, and `OPENAI_API_KEY` are **not** read automatically from shell environment variables. Running `export NIGHTHAWK_API_KEY=xxx` in the terminal does not give any provider its key. They must be written in `config.toml` under `[providers.<name>]` or the `[providers.<name>.env]` sub-table.

The only exceptions are the `NIGHTHAWK_MODEL_*` family and a provider's `api_key_env` field, two explicit channels that *do* read credentials from the shell. See [Define a model from environment variables](#define-a-model-from-environment-variables-nighthawk_model_) and [Provider credential key names](#provider-credential-key-names-written-in-configtoml).

For background, see [Config overrides: provider credentials](./overrides.md#provider-credentials).
:::

## Core paths

### `NIGHTHAWK_HOME`

Overrides the data root directory; the default is `~/.nighthawk`. Once set, the config file, sessions, logs, OAuth credentials, and all other data land under the new path:

```sh
export NIGHTHAWK_HOME="/path/to/custom/nighthawk"
```

> Make sure the directory is writable. Multiple `nighthawk` instances sharing the same `NIGHTHAWK_HOME` will share config and credential files.

For the complete data directory structure, see [Data locations](./data-locations.md).

### `NIGHTHAWK_DISABLE_TELEMETRY`

Set to `1` to turn off anonymous telemetry reporting (also accepts `true`, `yes`, `y`, case-insensitive):

```sh
export NIGHTHAWK_DISABLE_TELEMETRY=1
```

### `NIGHTHAWK_MODEL_*` family

Switch models temporarily without modifying `config.toml`: when `NIGHTHAWK_MODEL_NAME` is set, the CLI synthesizes a temporary provider in memory, and the change does not persist after restart. See [Define a model from environment variables](#define-a-model-from-environment-variables-nighthawk_model_).

### `NIGHTHAWK_CUSTOM_HEADERS`

::: info Added
Added in 0.20.2.
:::

Attaches custom HTTP headers to every outbound model request: both LLM chat requests (across all provider protocols) and `/models` listing requests carry them. Useful when a gateway routes by header, for example to pin a specific cluster:

```sh
export NIGHTHAWK_CUSTOM_HEADERS=$'X-Gateway-Cluster: my-cluster\nX-Custom-Tag: debug'
```

The format mirrors `ANTHROPIC_CUSTOM_HEADERS`: newline-separated `Name: Value` lines. Names and values are trimmed, and lines without a colon are ignored.

> Precedence: the NightHawk identity headers (`User-Agent`, `X-Msh-*`) and a provider's `custom_headers` in `config.toml` (see [Config files](./config-files.md#providers)) override same-named entries here. Authentication is protocol-dependent: on the `nighthawk`, `openai`, and `openai_responses` protocols an exact `Authorization` entry replaces the generated bearer token, while `/models` listing requests keep their own authentication. A case variant such as `authorization` is never treated as the same name. It merges with the real header, which can break requests. Do not use this variable for authentication or other reserved headers. Use `custom_headers` when headers need to differ per provider.

## Provider credential key names (written in config.toml)

The key names below are not read directly from the shell. They are key names written inside the `[providers.<name>.env]` sub-table of `config.toml`, serving as fallback values for `api_key` / `base_url`. The CLI reads only from the config file, not from `process.env`.

These conventional names are fixed per provider type. If you would rather keep the key in the shell environment under a name of your choosing, set [`api_key_env`](./config-files.md#providers) on the provider instead: the CLI then reads the key from that variable on every request.

This design lets you keep familiar key name conventions while centralizing secret management in the config file:

```toml
[providers.nighthawk.env]
NIGHTHAWK_API_KEY = "sk-xxx"
NIGHTHAWK_BASE_URL = "https://api.moonshot.ai/v1"
```

Key names per provider:

| Key | Applicable provider | Default |
| --- | --- | --- |
| `NIGHTHAWK_API_KEY` | NightHawk / Moonshot | None |
| `NIGHTHAWK_BASE_URL` | NightHawk / Moonshot | `https://api.moonshot.ai/v1` |
| `ANTHROPIC_API_KEY` | Anthropic | None |
| `ANTHROPIC_BASE_URL` | Anthropic | Follows Anthropic SDK default |
| `OPENAI_API_KEY` | OpenAI (`openai` and `openai_responses`) | None |
| `OPENAI_BASE_URL` | OpenAI (`openai` and `openai_responses`) | `https://api.openai.com/v1` |
| `GOOGLE_API_KEY` | Google GenAI, Vertex AI | None |
| `VERTEXAI_API_KEY` | Vertex AI | None |
| `GOOGLE_CLOUD_PROJECT` | Vertex AI | None |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI | None |

::: warning
`GOOGLE_APPLICATION_CREDENTIALS` (path to a service account JSON file) is the only exception that goes through the system environment variable mechanism. It is read by the Google SDK directly via the standard ADC flow; the CLI does not participate. All other key names must be placed in the `[providers.<name>.env]` sub-table to take effect.
:::

For the full provider type and field reference, see [Providers and models](./providers.md).

## OAuth and managed services

This group of variables redirects OAuth authentication and managed service endpoints to a self-hosted or test environment. They are not needed for everyday use.

| Variable | Purpose | Default |
| --- | --- | --- |
| `NIGHTHAWK_OAUTH_HOST` | OAuth auth host; highest priority | Falls back to `NIGHTHAWK_OAUTH_HOST` when unset |
| `KIMI_OAUTH_HOST` | OAuth auth host; fallback for `NIGHTHAWK_OAUTH_HOST` | Falls back to `https://auth.kimi.com` when unset |
| `NIGHTHAWK_BASE_URL` | Managed API base URL used after OAuth login | `https://api.kimi.com/coding/v1` |
| `NIGHTHAWK_REGION_MARKER` | Install-channel marker and logged-out local region inference | Enabled; set `off` to disable both and use the `mainland-cn` default |

::: warning
`NIGHTHAWK_BASE_URL` (OAuth-managed service, targeting `kimi.com`) and `KIMI_BASE_URL` (direct API key connection, targeting `moonshot.ai`) are two distinct variables. Use each one in its appropriate context.
:::

## Define a model from environment variables (`NIGHTHAWK_MODEL_*`)

Want to switch models for testing without touching `config.toml`? When `NIGHTHAWK_MODEL_NAME` is set, the CLI synthesizes a temporary provider and model alias from the `NIGHTHAWK_MODEL_*` variables in memory; nothing is written back to the config file. These variables take priority over `default_model` in `config.toml`, but the `-m <alias>` option at startup still has the highest priority.

```sh
export NIGHTHAWK_MODEL_NAME="kimi-for-coding"
export NIGHTHAWK_MODEL_API_KEY="YOUR_API_KEY"
export NIGHTHAWK_MODEL_BASE_URL="https://api.example.com/v1"
export NIGHTHAWK_MODEL_MAX_CONTEXT_SIZE="262144"
export NIGHTHAWK_MODEL_CAPABILITIES="image_in,thinking"
nighthawk
```

Complete variable list:

| Variable | Required | Purpose | Default |
| --- | --- | --- | --- |
| `NIGHTHAWK_MODEL_NAME` | Yes (also the enable switch) | Model id sent to the API | — |
| `NIGHTHAWK_MODEL_API_KEY` | Yes | API key | — |
| `NIGHTHAWK_MODEL_PROVIDER_TYPE` | No | Provider type: `nighthawk`, `anthropic`, `openai` | `nighthawk` |
| `NIGHTHAWK_MODEL_BASE_URL` | No | API base URL | Each type has its own default |
| `NIGHTHAWK_MODEL_MAX_CONTEXT_SIZE` | No | Maximum context length (tokens) | `262144` (256 K) |
| `NIGHTHAWK_MODEL_CAPABILITIES` | No | Comma-separated capability tags, unioned with auto-detected capabilities | `image_in,thinking` |
| `NIGHTHAWK_MODEL_DISPLAY_NAME` | No | Name shown in `/model` | Falls back to `NIGHTHAWK_MODEL_NAME` |
| `NIGHTHAWK_MODEL_MAX_OUTPUT_SIZE` | No | Per-request output cap (`anthropic` only); when set, overrides the built-in Claude ceiling | Model default |
| `NIGHTHAWK_MODEL_REASONING_KEY` | No | Reasoning field name override (`openai` only) | Auto-detected |
| `NIGHTHAWK_MODEL_THINKING_EFFORT` | No | Thinking effort level: `low`/`medium`/`high`/`xhigh`/`max` | — |
| `NIGHTHAWK_MODEL_ADAPTIVE_THINKING` | No | Force adaptive thinking on or off (`anthropic` only) | Inferred from model name |

If `NIGHTHAWK_MODEL_NAME` is set but a required variable is missing, startup fails immediately with a clear error message.

## Environment switches

Switches that control the behavior of subsystems such as telemetry, background tasks, and the plugin marketplace:

| Variable | Purpose | Valid values |
| --- | --- | --- |
| `NIGHTHAWK_DISABLE_TELEMETRY` | Disable anonymous telemetry reporting | `1`, `true`, `yes`, `y` (case-insensitive) |
| `NIGHTHAWK_PASSWORD` | Parallel auth credential for `nighthawk web`, recommended when binding beyond loopback (see [Security notes](../guides/web.md#security-notes)) | Any non-empty string; when unset, only the token is valid |
| `NIGHTHAWK_SESSION_IDLE_RECLAIM_MS` | How long (ms) a `nighthawk web` session may stay idle before it is unloaded from memory; the session resumes transparently on next access (default `1800000`; `0` = never unload) | Non-negative integer; invalid values fail fast |
| `NIGHTHAWK_BACKGROUND_KEEP_ALIVE_ON_EXIT` | Keep background tasks when the session closes; higher priority than `config.toml` (default: stop them on exit) | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_BACKGROUND_MAX_RUNNING_TASKS` | Cap on concurrently running background tasks and Tower workers/reviewers; overrides `[task]` and legacy `[background]` `max_running_tasks`; Tower defaults to 256 when no value is configured | Positive integer; invalid values are ignored |
| `NIGHTHAWK_BACKGROUND_BASH_TASK_TIMEOUT_S` | Default timeout (seconds) for background `Bash` tasks, also used to re-arm foreground commands moved to the background; higher priority than `[task] bash_task_timeout_s` (`0` = no timeout) | Non-negative integer; invalid values are ignored |
| `NIGHTHAWK_BACKGROUND_PRINT_BACKGROUND_MODE` | What `nighthawk -p` does while background tasks are still pending after the main turn; higher priority than `[task] print_background_mode` | `exit`, `drain`, or `steer`; invalid values are ignored |
| `NIGHTHAWK_BACKGROUND_PRINT_WAIT_CEILING_S` | Wall-clock ceiling (seconds) for the print-mode drain/steer wait; higher priority than `[task] print_wait_ceiling_s` | Positive integer; invalid values are ignored |
| `NIGHTHAWK_BACKGROUND_PRINT_MAX_TURNS` | Max number of new turns triggered by background-task completions in print mode; higher priority than `[task] print_max_turns` | Positive integer; invalid values are ignored |
| `NIGHTHAWK_IMAGE_MAX_EDGE_PX` | Longest-edge ceiling (px) for image compression; higher priority than `[image] max_edge_px` (default `2000`) | Positive integer; invalid values are ignored |
| `NIGHTHAWK_IMAGE_READ_BYTE_BUDGET` | Per-image byte budget for model-initiated image reads; higher priority than `[image] read_byte_budget` (default `262144`) | Positive integer; invalid values are ignored |
| `NIGHTHAWK_PLUGIN_MARKETPLACE_URL` | Override the marketplace JSON loaded by `/plugins`; defaults to `${baseURL}/plugins/marketplace`, derived from the managed provider configuration or `NIGHTHAWK_BASE_URL` | Also accepts `http://`, `file://` URLs, and local paths |
| `NIGHTHAWK_AGENT_SWARM_MAX_CONCURRENCY` | Cap on AgentSwarm subagents running concurrently during the initial ramp; unset = no cap | Positive integer; invalid values fail fast |
| `NIGHTHAWK_SUBAGENT_SCOPE_CACHE_SIZE` | How many completed subagent scopes stay resident for fast resume; older ones are evicted and rebuilt from persisted state on demand (default `32`; `0` or negative = never evict) | Integer; invalid values fail fast |
| `NIGHTHAWK_SUBAGENT_SCOPE_EVICT_TIMEOUT_MS` | Max wall-clock time (ms) a single subagent scope eviction may take before the eviction queue skips it and moves on (default `15000`) | Positive integer; invalid values fail fast |
| `NIGHTHAWK_SUBAGENT_TIMEOUT_MS` | Max wall-clock time (ms) a single `Agent` subagent may run; higher priority than `[subagent] timeout_ms` | Positive integer; invalid values fall back to the config or default |
| `NIGHTHAWK_SWARM_TIMEOUT_MS` | Max wall-clock time (ms) an `AgentSwarm` subagent may run; higher priority than `[swarm] timeout_ms` | Positive integer; invalid values fall back to the config or default |
| `NIGHTHAWK_IDENTITY_NAME` | Name the agent calls itself in the system prompt; higher priority than `[identity] name`, never written back | Any non-empty string; blank values read as unset |
| `NIGHTHAWK_IDENTITY_SLUG` | `User-Agent` product token and MCP client name; higher priority than `[identity] slug`; derived from the name when unset | Any non-empty string; normalized to lowercase with non-alphanumeric runs folded to `-` |
| `NIGHTHAWK_BUILTIN_PRODUCT_SKILLS` | Offer the built-in skills documenting NightHawk itself to the model; higher priority than `builtin_product_skills` | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_REPEAT_BREAKER` | Whether repeating the same tool call many times in a row injects reminders and eventually force-stops the turn. Unset keeps this on | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off`; any other value is ignored |
| `NIGHTHAWK_SESSION_LOCK` | Whether this process takes the cross-process session lock that stops two NightHawk processes from writing the same session at once. Unset keeps it on; turning it off brings back pre-lock behavior, so concurrent writers can interleave the session history | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off`; any other value is ignored |
| `NIGHTHAWK_EXPERIMENTAL_SUBAGENT_FORK` | Experimental `fork` parameter on `Agent`/`AgentSwarm`: start the subagent from a snapshot of the caller's history instead of an empty context; `NIGHTHAWK_EXPERIMENTAL_FLAG=1` also enables it | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_EXPERIMENTAL_TOOL_SELECT` | Experimental on-demand tool loading: tools of MCP servers marked `deferred: true` stay out of the top-level tool list and are loaded via `select_tools`; also requires the model to declare the `dynamically_loaded_tools` capability — see [MCP](../customization/mcp.md#loading-tools-on-demand) | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_EXPERIMENTAL_TOWER` | Enable experimental [Tower multi-agent coordination](../guides/tower.md) and the `/tower` command; set it before launch. The persistent equivalent is `[experimental] tower = true` in `config.toml`; changing that setting in a running CLI requires a restart. `NIGHTHAWK_EXPERIMENTAL_FLAG=1` enables Tower only when `[experimental] tower` is not set in `config.toml`; an explicit `tower = false` takes precedence over the master flag, while this per-feature variable overrides the config | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_WATCH` | Attach filesystem watchers that reload config and workspace files; higher priority than `[watch] enabled` (default `true`) | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_GLOBAL_SEARCH` | Build the global full-text search index and serve `POST /api/v1/search`; higher priority than `[database] global_search` (default `false`) | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_SEARCH_WORKER` | With global search enabled, run the index in a dedicated worker thread; higher priority than `[database] search` (default `true`) | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_PERSISTENCE_MINIDB_READMODEL` | Use the minidb-backed read model for session indexing; higher priority than `[database] base` (default `true`) | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_MCP_STARTUP_TIMEOUT_MS` | Global default connection timeout (ms) for MCP servers; overrides the config file, but `mcp.json` `startupTimeoutMs` still wins | Integer from `1` to `2147483647`; invalid values are ignored |
| `NIGHTHAWK_MCP_TOOL_TIMEOUT_MS` | Global default single tool-call timeout (ms) for MCP servers; overrides the config file, but `mcp.json` `toolTimeoutMs` still wins | Integer from `1` to `2147483647`; invalid values are ignored |
| `NIGHTHAWK_MCP_RECONNECT_INITIAL_DELAY_MS` | Initial delay (ms) before the first automatic reconnect attempt for a workspace-level MCP server that failed to connect or dropped unexpectedly; overrides the config file | Integer from `1` to `2147483647`; invalid values are ignored |
| `NIGHTHAWK_MCP_RECONNECT_MAX_DELAY_MS` | Cap (ms) for the automatic reconnect backoff delay of workspace-level MCP servers; overrides the config file | Integer from `1` to `2147483647`; invalid values are ignored |
| `NIGHTHAWK_TRUST_WORKSPACE` | Mark the current workspace as trusted, equivalent to choosing "Trust this folder" at the interactive trust prompt; takes effect per process and does not write a persistent trust record. This is independent of [`[workspace] require_trust`](./config-files.md#workspace-trust); a falsy value does not re-enable trust when that setting is `false` | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_LOOP_MAX_STEPS_PER_TURN` | Max Agent steps per turn; higher priority than `[loop_control] max_steps_per_turn` (`0` = unlimited) | Non-negative integer; invalid values are ignored |
| `NIGHTHAWK_LOOP_MAX_ATTEMPTS_PER_STEP` | Max total attempts for a failing step (including the first); higher priority than `[loop_control] max_attempts_per_step` | Non-negative integer; invalid values are ignored |
| `NIGHTHAWK_INFINITE_RETRY` | Retry failed LLM requests indefinitely; exponential backoff (32 s cap) honoring `Retry-After`; aborting still cancels immediately | Truthy: `1`/`true`/`yes`/`on`; falsy: `0`/`false`/`no`/`off` |
| `NIGHTHAWK_TOKEN_COUNTING_STRATEGY` | Context token count reported externally; higher priority than `[token_counting] strategy` | `measured+estimated`, `measured`, `estimated` (case-insensitive); invalid values are ignored |
| `NIGHTHAWK_WEB_SEARCH_BASE_URL` | Web search (`WebSearch`) service API URL; higher priority than the config file; credentials and custom headers not forwarded | Non-blank string; blank values are ignored |
| `NIGHTHAWK_WEB_SEARCH_API_KEY` | Web search (`WebSearch`) service API key; replaces both the configured key and the OAuth credential | Non-blank string; blank values are ignored |
| `NIGHTHAWK_WEB_FETCH_BASE_URL` | Web fetch (`FetchURL`) service API URL; higher priority than the config file; credentials not forwarded. Without an endpoint, signed-in users get the managed NightHawk OAuth fetch service before direct local requests | Non-blank string; blank values are ignored |
| `NIGHTHAWK_WEB_FETCH_API_KEY` | Web fetch (`FetchURL`) service API key; replaces both the configured key and the OAuth credential | Non-blank string; blank values are ignored |
| `NIGHTHAWK_EXPERIMENTAL_FLAG` | Enable all registered experimental features for this process | `1`, `true`, `yes`, `on` |
| `NIGHTHAWK_SHELL_PATH` | Override the Git Bash path on Windows (used when auto-detection fails) | Absolute path |
| `NIGHTHAWK_MODEL_MAX_COMPLETION_TOKENS` | Hard cap on `max_completion_tokens` per LLM step; applies to the `nighthawk` provider only | Positive integer; `0` or negative disables clamping |
| `NIGHTHAWK_MODEL_TEMPERATURE` | Sampling temperature for every request; `nighthawk` provider only (global, independent of `NIGHTHAWK_MODEL_NAME`) | Number, e.g. `0.3` |
| `NIGHTHAWK_MODEL_TOP_P` | Nucleus-sampling `top_p` for every request; `nighthawk` provider only (global) | Number, e.g. `0.95` |
| `NIGHTHAWK_MODEL_THINKING_EFFORT` | Force a thinking effort (`thinking.effort`), bypassing the model's declared `support_efforts`; `nighthawk` provider only | An effort value, e.g. `max` |
| `NIGHTHAWK_MODEL_THINKING_KEEP` | Preserved-thinking passthrough: `thinking.keep` on `nighthawk`, a `clear_thinking_20251015` edit on `anthropic`; overrides `[thinking] keep` | A value the API accepts, e.g. `all`; an off-value (`false`/`0`/`no`/`off`/`none`/`null`) disables it |
| `NIGHTHAWK_LLM_HEADERS_TIMEOUT_MS` | Max time (ms) an LLM request on the `openai` / `openai-responses` / `anthropic` protocols may wait for the response headers (first byte), replacing the HTTP client's default 300 s headers timeout — raise it for long non-streaming thinking; unset keeps the default; the SDK's own total request timeout (default 10 minutes) still caps each attempt; not supported for `google-genai` (its SDK exposes no dispatcher option) or behind a SOCKS proxy (requests still go through the proxy) | Positive integer no greater than 2147483647; invalid values fail the request |
| `NIGHTHAWK_NO_AUTO_UPDATE` | Fully disable the update preflight: no check, background install, or prompt. Legacy alias `NIGHTHAWK_CLI_NO_AUTO_UPDATE` also honored | Truthy: `1`/`true`/`yes`/`on` |
| `NIGHTHAWK_DISABLE_CRON` | Disable the scheduled-task tool (`CronCreate` rejects new schedules; existing tasks do not fire) | `1` to disable |

The `NIGHTHAWK_INFINITE_RETRY`, `NIGHTHAWK_IDENTITY_*`, and `NIGHTHAWK_BUILTIN_PRODUCT_SKILLS` variables are read by the `agent-core-v2` engine.

## Diagnostic logs

These variables control log level and file rotation, read once at process startup:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NIGHTHAWK_LOG_LEVEL` | Log level: `off`, `error`, `warn`, `info`, `debug` | `info` |
| `NIGHTHAWK_LOG_GLOBAL_MAX_BYTES` | Maximum bytes per global log file | `6291456` (6 MB) |
| `NIGHTHAWK_LOG_GLOBAL_FILES` | Number of global log files to retain | `5` |
| `NIGHTHAWK_LOG_SESSION_MAX_BYTES` | Maximum bytes per session log file | `5242880` (5 MB) |
| `NIGHTHAWK_LOG_SESSION_FILES` | Number of session log files to retain | `3` |

## System environment variables

The CLI also reads several standard system variables to detect the runtime environment; it does not modify them:

- `HOME`: used to resolve the default data path
- `VISUAL`, `EDITOR`: external editor command (`VISUAL` takes precedence)
- `PATH`: used to locate dependencies such as `rg`, `fd`, `fdfind`, and `git`; on Windows, Git Bash detection checks each `git.exe` found on `PATH`, including package-manager shims such as Scoop
- `NO_COLOR`, `FORCE_COLOR`: control color output (following the [no-color.org](https://no-color.org) convention)
- `CI`: when non-empty and not `"0"`, disables theme detection and falls back to the dark theme
- `TERM_PROGRAM`, `TERM`, `TMUX`: detect terminal features and notification support
- `DISPLAY`, `WAYLAND_DISPLAY`, `XDG_SESSION_TYPE`: detect Linux graphical sessions (for clipboard and image features)
- `WSL_DISTRO_NAME`, `WSLENV`: detect WSL for the clipboard PowerShell bridge
- `LOCALAPPDATA`: used on Windows as a fallback when probing for the Git Bash installation path

## HTTP proxy

NightHawk honors the standard proxy environment variables for all outbound traffic: model API calls, MCP servers, web tools, telemetry, sign-in, and update checks:

- `HTTP_PROXY` / `http_proxy`: proxy for `http://` requests
- `HTTPS_PROXY` / `https_proxy`: proxy for `https://` requests
- `ALL_PROXY` / `all_proxy`: fallback proxy used when the scheme-specific variable is unset; this is where a SOCKS proxy is usually set
- `NO_PROXY` / `no_proxy`: comma-separated hosts that bypass the proxy

### Proxy types and precedence

Both HTTP(S) and SOCKS proxies are supported. A SOCKS proxy is recognized by its scheme: `socks5://`, `socks5h://`, `socks4://`, or `socks://` (an alias for `socks5://`). It is typically set via `ALL_PROXY` (the form used by tools like Clash and V2RayN). An HTTP(S) proxy takes precedence over `ALL_PROXY` for HTTP/HTTPS traffic.

### Activation conditions and loopback addresses

The proxy is applied only when one of these variables is set; otherwise connections are made directly. Loopback hosts (`localhost`, `127.0.0.1`, `::1`) always bypass the proxy, so a local server such as a localhost MCP server keeps working when a proxy is configured. Add your own internal hosts to `NO_PROXY` to exempt them too.

### MCP child processes

Stdio MCP servers that run as Node child processes honor `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` automatically when the child's Node version supports `NODE_USE_ENV_PROXY` (Node ≥ 22.21 or ≥ 24.5); SOCKS proxying applies to NightHawk's own traffic only.

## Next steps

- [Config overrides](./overrides.md) — how environment variables, CLI options, and the config file interact by priority
- [Data locations](./data-locations.md) — directory structure affected by `NIGHTHAWK_HOME`
- [Providers and models](./providers.md) — full connection examples per provider type
