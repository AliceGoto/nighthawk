# Config overrides

NightHawk CLI has three places where runtime parameters can be influenced: the config file, command-line options, and environment variables. They are not a simple "whoever has higher priority wins" relationship — the three serve different scenarios and have non-overlapping scopes:

- **Config file** stores long-term preferences (model, keys, loop control, etc.); takes effect on every startup
- **Command-line options** make one-off changes for the current startup; discarded after exit
- **Environment variables** primarily handle data directory location, OAuth endpoint switching, and a small number of runtime switches — **not a general fallback mechanism for config fields**

This distinction matters: `export NIGHTHAWK_API_KEY=xxx` in the shell is not an ordinary runtime override — it is only picked up as a provider credential fallback when the config file does not set the key. See [Provider credentials](#provider-credentials) below.

## Three roles of environment variables

Environment variables fall into three categories by function and cannot be collapsed into a single linear priority order:

1. **Locating the config file**: `NIGHTHAWK_HOME` sets the data root directory, making the config file path `$NIGHTHAWK_HOME/config.toml`. This step runs before all other resolution and is not a fallback for individual parameters.
2. **Runtime switches**: A small set of variables like `NIGHTHAWK_DISABLE_TELEMETRY` directly shut down the corresponding subsystem — even if `config.toml` has `telemetry = true`, setting this variable to a truthy value disables telemetry. The semantics are "additionally disable", not "ordinary override".
3. **Runtime endpoints and diagnostics**: Variables like `NIGHTHAWK_LOG_LEVEL` are read when the logging subsystem initializes. For the full list, see [Environment variables](./env-vars.md).

## Priority for ordinary runtime parameters

For ordinary runtime parameters such as model alias, Plan mode, yolo mode, and Skills directories, priority from highest to lowest is:

1. **Command-line options** (`-m`, `--plan`, `--yolo`, etc.): apply only to the current startup
2. **User config file** (`~/.nighthawk/config.toml`): stores long-term preferences

A small number of environment variables explicitly override specific config file fields — for example, `NIGHTHAWK_BACKGROUND_KEEP_ALIVE_ON_EXIT` has higher priority than `[background].keep_alive_on_exit`. These exceptions are noted in [Environment variables](./env-vars.md) and in the relevant field descriptions in [Configuration files](./config-files.md).

::: warning
**Ordinary runtime parameters do not fall back to shell environment variables.** Provider credentials are the exception: when `config.toml` does not set a provider's `api_key` (or `base_url`) — neither the direct field nor the `[providers.<name>.env]` sub-table — the CLI falls back to the matching shell variable (`NIGHTHAWK_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, etc.). The `NIGHTHAWK_MODEL_*` family is a separate explicit channel — see [Define a model from environment variables](./env-vars.md#define-a-model-from-environment-variables-nighthawk-model).
:::

The CLI currently reads a single user-level config file and has no project-level config file mechanism. To isolate config between different projects, point `NIGHTHAWK_HOME` at different data directories — see [Common scenarios](#common-scenarios) below.

## Provider credentials

Provider credentials (`api_key`, `base_url`) follow their own resolution rules, separate from the ordinary parameter priority chain.

For a single provider, credentials are resolved in this order:

1. `[providers.<name>].api_key` — key written directly in the config file; highest priority
2. The matching key inside the `[providers.<name>.env]` sub-table (`NIGHTHAWK_API_KEY`, `ANTHROPIC_API_KEY`, etc.) — consulted only when `api_key` is empty
3. The matching shell environment variable — consulted when the config file sets no key anywhere
4. If all are absent — startup fails with an error indicating the provider is missing credentials

`base_url` is resolved the same way: first `[providers.<name>].base_url`, then the `*_BASE_URL` key in `[providers.<name>.env]`, then the corresponding shell variable (for example `NIGHTHAWK_BASE_URL`) — the `nighthawk` provider's built-in default (`https://api.nighthawk.com/v1`) applies when none is set.

> The `[providers.<name>.env]` sub-table is just a TOML section in the config file — it does not write anything into the shell environment. It is only consulted when the corresponding direct field (`api_key` / `base_url`) is empty.

For the full list of credential key names, see [Environment variables: provider credential key names](./env-vars.md#provider-credential-key-names-written-in-config-toml).

## Command-line options

Options passed at startup have the highest priority and apply only to the current session:

| Option | Effect |
| --- | --- |
| `-S, --session [id]` | Resume a specific session; enters interactive selection when no id is given |
| `-c, --continue` | Resume the last session for the current working directory |
| `-y, --yolo` | Auto-approve regular tool calls; the agent may still ask questions |
| `--auto` | Start in auto permission mode: fully autonomous, the agent will not ask questions |
| `--plan` | Start in Plan mode |
| `-m, --model <model>` | Use a specific model alias for this session |
| `-p, --prompt <prompt>` | Run in non-interactive mode: execute a single prompt and exit |
| `--output-format <format>` | Output format for `-p` mode: `text` or `stream-json` |
| `--skills-dir <dir>` | Replace auto-discovered Skills directories (repeatable; applies to this session only) |

Mutual exclusion rules (startup fails if violated):

- `--output-format` can only be used with `-p`
- `--prompt` cannot be combined with `--yolo` or `--plan`
- `--continue` and `--session` cannot be used together
- In non-prompt mode, `--yolo` and `--plan` cannot be combined with `--continue` or `--session`

::: tip
`--skills-dir` is a one-shot replacement that only affects the current startup. To persistently add search directories, write `extra_skill_dirs` in `config.toml` (see [Agent Skills](../customization/skills.md)).
:::

## Common scenarios

**Isolated test environment** — use a separate data directory to avoid polluting the main config and sessions:

```sh
NIGHTHAWK_HOME="$PWD/.nighthawk-sandbox" nighthawk
```

**One-off test key** — provider credentials resolve `config.toml` first and fall back to the shell, so write a test key into the `env` sub-table to keep it in the config file and take precedence over the shell:

```toml
[providers.nighthawk.env]
NIGHTHAWK_API_KEY = "sk-test"
```

**Skip approval for batch tasks**:

```sh
nighthawk --yolo -p "Batch rename the following files..."
```

**Enter Plan mode temporarily** (to make it permanent, set `default_plan_mode = true` in the config file):

```sh
nighthawk --plan
```

## Next steps

- [Configuration files](./config-files.md) — complete reference for all configurable fields
- [Environment variables](./env-vars.md) — full list and description of `NIGHTHAWK_HOME` and related variables
