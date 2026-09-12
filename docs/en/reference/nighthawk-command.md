# `nighthawk` Command

`nighthawk` is the main command for NightHawk CLI, used to start an interactive session in the terminal. Running it without any arguments opens a new session in the current working directory; combined with different flags, you can resume a previous session, skip approvals, start in Plan mode, or load Skills from a custom directory.

```sh
nighthawk [options]
nighthawk <subcommand> [options]
```

## Main Command Options

All flags are optional — run `nighthawk` directly to enter an interactive session:

| Option | Short | Description |
| --- | --- | --- |
| `--version` | `-V` | Print the version number and exit |
| `--help` | `-h` | Show help information and exit |
| `--session [id]` | `-S` | Resume a session. With an ID, opens that session directly; without an ID, enters an interactive selector |
| `--continue` | `-c` | Continue the most recent session in the current working directory, without specifying an ID manually |
| `--model <model>` | `-m` | Specify a model alias for this launch. When omitted, new sessions use `default_model` from the config file |
| `--prompt <prompt>` | `-p` | Run a single prompt non-interactively and stream the Assistant output to stdout. This mode does not open the TUI |
| `--output-format <format>` | | Set the non-interactive output format; supports `text` and `stream-json`. Can only be used with `--prompt`; defaults to `text` |
| `--yolo` | `-y` | Auto-approve regular tool calls, skipping approval requests |
| `--auto` | | Start with auto permission mode; tool approvals are handled automatically and the Agent will not ask the user questions |
| `--plan` | | Start a new session in Plan mode — the AI will prioritize read-only tools for exploration and planning |
| `--skills-dir <dir>` | | Load Skills from the specified directory, replacing the automatically discovered user and project directories. Can be repeated |
| `--agent <name>` | | Start a new session with the specified agent as the main Agent. Cannot be combined with `--session`/`--continue` |
| `--agent-file <path>` | | Load a custom agent from a Markdown file for the new session and select it. Cannot be repeated or combined with `--agent`, `--session`, or `--continue` |
| `--add-dir <dir>` | | Add an extra workspace directory for this session. Relative paths resolve against the current working directory. Can be repeated |

`-r` / `--resume` is a hidden alias for `--session`; `--yes` and `--auto-approve` are hidden aliases for `--yolo` and are not shown in help output.

::: warning
`--yolo` skips human approval for regular tool calls, including file writes and shell command execution. Use it only in trusted working directories. Plan mode exit approval is not bypassed by `--yolo`; `Bash` inside Plan mode is handled under the regular allow rules.
:::

### Flag Conflict Rules

The following combinations are rejected at startup:

- `--continue` and `--session` are mutually exclusive — both mean "resume a previous session"
- `--yolo` and `--auto` are mutually exclusive — the two permission modes cannot be combined
- `--prompt` cannot be used with `--yolo`, `--auto`, or `--plan` — non-interactive mode uses `auto` permission by default
- `--output-format` can only be used together with `--prompt`

When resuming a session, you can override its saved permission or plan mode by adding `--auto`, `--yolo`, or `--plan`. For example, `nighthawk --continue --auto` resumes the latest session and switches it to auto permission mode.

## Common Usage

Start a new session directly:

```sh
nighthawk
```

Pick up where you left off (automatically finds the most recent session in the current directory):

```sh
nighthawk --continue
```

Choose from the session history list, or specify a known ID directly:

```sh
nighthawk --session
nighthawk --session 01HZ...XYZ
```

Skip approval prompts — suitable for batch tasks that are known to be safe:

```sh
nighthawk --yolo
```

Let the Agent handle everything autonomously, without asking the user questions:

```sh
nighthawk --auto
```

Read the code and produce an implementation plan before making any file changes:

```sh
nighthawk --plan
```

### Custom Skills Directories

There are two ways to specify Skills directories, with different semantics:

- **`--skills-dir <dir>`** (CLI flag): **Replaces** the automatically discovered user and project directories for this launch only. Can be repeated to stack multiple directories:

  ```sh
  nighthawk --skills-dir /path/to/team-skills --skills-dir ./local-skills
  ```

- **`extra_skill_dirs`** (`config.toml`): **Adds** directories on top of the automatically discovered ones, taking effect permanently. Suitable for configuring team-shared Skills. See [Agent Skills](../customization/skills.md).

### Custom Agents

`--agent` and `--agent-file` select which agent drives a new session, in both print mode (`nighthawk -p`) and the interactive TUI:

```sh
nighthawk --agent reviewer
nighthawk -p --agent reviewer "Review the changes on this branch"
```

`--agent-file` registers a single agent file at the highest priority for this launch only and selects it; the flag cannot be repeated, and `--agent` and `--agent-file` are mutually exclusive. Both flags only apply when starting a new session — neither can be combined with `--session`/`--continue`, because the agent is bound at session creation and resuming restores the bound agent automatically. The selection is fixed at the session's first bind and cannot be switched later; in the TUI the flags bind only the startup session, and a session created later in the same process (for example via `/new`) starts with the default agent. See [Agents and Sub-Agents](../customization/agents.md#custom-agents) for the agent file format and discovery directories.

## Non-Interactive Execution

When running a single prompt in a script or CI environment, use `-p`:

```sh
nighthawk -p "Summarize the current repository status"
```

Output uses a transcript style: thinking content and Assistant text are both prefixed with `• `, and wrapped lines are indented by two spaces. Assistant text goes to stdout; thinking, tool progress, and "resuming session" notices go to stderr. In `-p` mode, no human approval is requested — regular tool calls are handled under the `auto` permission policy, while static deny rules remain in effect.

Temporarily switch the model:

```sh
nighthawk -m nighthawk/nighthawk -p "Explain the latest diff"
```

When you need to parse output programmatically, use the `stream-json` format — each line on stdout is a JSON object:

```sh
nighthawk -p "List changed files" --output-format stream-json
```

In `stream-json` mode, regular replies produce an Assistant message; when the model calls a tool, an Assistant message with `tool_calls` is emitted first, followed by the corresponding Tool message, then subsequent Assistant messages. Thinking content is not written to JSONL; tool progress and "resuming session" notices are still written to stderr.

## Subcommands

`nighthawk` provides the following subcommands: `acp` (ACP IDE mode), `doctor` (validate configuration files), `export` (export a session), `migrate` (migrate legacy data), `upgrade` (check for updates), `vis` (launch the session visualizer in the browser), `web` (serve the NightHawk Web UI with an OpenAI-compatible proxy), and `provider` (manage providers).

### `nighthawk acp`

Switch NightHawk CLI to ACP (Agent Client Protocol) mode, communicating with an IDE via JSON-RPC over stdin/stdout so the editor can directly drive NightHawk's sessions and tool calls. You typically do not need to run this manually — the IDE starts it as a subprocess entry point. For configuration, see [Using in IDEs](../guides/ides.md); for technical details, see the [nighthawk acp reference](./nighthawk-acp.md).

```sh
nighthawk acp
```

### `nighthawk doctor`

Validate `config.toml` and `tui.toml` without starting the TUI or modifying either file. By default, the command checks the files under `NIGHTHAWK_HOME` (or `~/.nighthawk` when the environment variable is unset). Missing default files are reported as skipped because built-in defaults can apply.

```sh
nighthawk doctor
```

| Command | Description |
| --- | --- |
| `nighthawk doctor` | Validate the default `config.toml` and `tui.toml` |
| `nighthawk doctor config [path]` | Validate only `config.toml`, using `path` instead of the default file when provided |
| `nighthawk doctor tui [path]` | Validate only `tui.toml`, using `path` instead of the default file when provided |

When an explicit path is passed, the file must exist. The command exits with `0` when all checked files are valid or skipped, and `1` when any requested file is missing or invalid.

```sh
# Check the default config files
nighthawk doctor

# Check only the default runtime config
nighthawk doctor config

# Check a candidate TUI config before replacing the live config
nighthawk doctor tui ./tui.toml
```

### `nighthawk export`

Package a session into a ZIP file for sharing, archiving, or submitting bug reports.

```sh
nighthawk export [sessionId] [options]
```

| Parameter / Option | Short | Description |
| --- | --- | --- |
| `sessionId` | | The ID of the session to export. When omitted, the most recent session in the current working directory is automatically selected and requires confirmation |
| `--output <path>` | `-o` | Output ZIP file path. When omitted, writes to a default filename in the current directory |
| `--yes` | `-y` | Skip the confirmation prompt for the default session and export directly |
| `--no-include-global-log` | | Do not include the global diagnostic log. Included by default |

The export contains all files in the target session directory. The global diagnostic log (`~/.nighthawk/logs/nighthawk.log`) is included by default because it may contain events from other sessions or projects; add `--no-include-global-log` if you do not want to share it.

```sh
# Export the most recent session in the current directory, skipping confirmation
nighthawk export -y

# Export a specific session to a custom path
nighthawk export 01HZ...XYZ -o ./bug-report.zip

# Exclude the global diagnostic log
nighthawk export 01HZ...XYZ -o ./bug-report.zip --no-include-global-log
```

### `nighthawk migrate`

Migrate local data from a legacy legacy-cli installation to nighthawk, including session history and configuration files. Runs entirely interactively, guiding you through the full process.

```sh
nighthawk migrate
```

For full migration instructions, see [Migrating from legacy-cli](../guides/migration.md).

### `nighthawk upgrade`

Immediately check for the latest version and display an update prompt; exits after you make a selection. `nighthawk update` is an alias for this command.

```sh
nighthawk upgrade
```

For global npm, pnpm, yarn, and bun installations, `nighthawk upgrade` shows update options; selecting `Install update now` runs the corresponding foreground install command. For native installations (including Windows), it downloads and verifies the new binary in the foreground and swaps it in on the next start. When the current installation method cannot be upgraded automatically, the manual update command is printed instead.

### `nighthawk vis`

Launch the session visualizer in your browser to inspect a session as it unfolds. The command starts an in-process server pointed at your local sessions, prints the URL, opens your browser, and keeps running until you press `Ctrl-C`.

```sh
nighthawk vis [sessionId] [options]
```

| Parameter / Option | Description |
| --- | --- |
| `sessionId` | Open the visualizer directly to this session. When omitted, it opens the home view listing your sessions |
| `--port <number>` | Port to bind. By default an available port is picked automatically |
| `--host <host>` | Host to bind. Default: `127.0.0.1` |
| `--no-open` | Do not open the browser automatically; just print the URL |

```sh
# Start the visualizer and open the browser at the home view
nighthawk vis

# Open directly to a specific session
nighthawk vis 01HZ...XYZ

# Bind a fixed port and host without opening a browser (e.g. on a remote host)
nighthawk vis --host 0.0.0.0 --port 8123 --no-open
```

### `nighthawk web`

Launch a lightweight local web server that serves the NightHawk Web UI from `dist-web/` and exposes an OpenAI-compatible API proxy (`/v1/chat/completions` and `/v1/models`) that forwards requests to the local NightHawk engine. It does not expose a REST or WebSocket API.

```sh
nighthawk web [options]
```

| Parameter / Option | Description |
| --- | --- |
| `--port <number>` | Port to bind. Default: `3000` |
| `--host <host>` | Host to bind. Default: `127.0.0.1` |
| `--no-open` | Do not open the browser automatically; just print the URL |

```sh
# Start the web UI and open the browser
nighthawk web

# Bind a fixed port and host without opening a browser (e.g. on a remote host)
nighthawk web --host 0.0.0.0 --port 8123 --no-open
```

### `nighthawk provider`

Manage providers in the shell — the non-interactive equivalent of `/provider` in the TUI. Suitable for scripted deployments, CI initialization, and one-line setup on a new machine.

```sh
nighthawk provider <action> [options]
```

Five actions are available:

#### `nighthawk provider add <url>`

Bulk-import all providers from a custom registry (`api.json`). The command fetches the registry, creates a `[providers.<id>]` and `[models.<alias>]` entry for each item, and writes `source` metadata so the TUI refreshes providers and models from the same registry URL automatically on next startup.

| Parameter / Option | Description |
| --- | --- |
| `<url>` | Registry URL |
| `--api-key <key>` | Bearer token for accessing the registry. Falls back to the `NIGHTHAWK_REGISTRY_API_KEY` environment variable if not provided; required |

```sh
nighthawk provider add https://registry.example.com/v1/models/api.json --api-key YOUR_KEY

# Or via environment variable (suitable for CI / .envrc)
NIGHTHAWK_REGISTRY_API_KEY=YOUR_KEY nighthawk provider add https://registry.example.com/v1/models/api.json
```

If a provider ID already exists, it is removed and re-created. The default model is not set automatically; you can select one later with `-m` or `/model` in the TUI.

#### `nighthawk provider remove <providerId>`

Remove the specified provider and all its model aliases. If the removed provider is the one referenced by `default_model`, `default_model` is also cleared.

```sh
nighthawk provider remove kohub
```

#### `nighthawk provider list`

Print each configured provider on a separate line, including type, model count, and source. Add `--json` to output the raw `providers` and `models` tables for programmatic processing.

```sh
nighthawk provider list
nighthawk provider list --json | jq '.providers | keys'
```

#### `nighthawk provider catalog list [providerId]`

Browse the public [models.dev](https://models.dev/) model catalog without modifying any configuration. Without an argument, lists all providers along with their protocol type and model count; with a `providerId`, lists all models under that provider along with their context window and capabilities. If the catalog URL cannot be reached, a built-in snapshot of the catalog is used instead.

| Parameter / Option | Description |
| --- | --- |
| `[providerId]` | Optional — the provider ID to inspect |
| `--filter <substring>` | Case-insensitive substring filter on ID or name |
| `--url <url>` | Override the catalog URL; defaults to `https://models.dev/api.json` |
| `--json` | Output matching entries as JSON |

```sh
nighthawk provider catalog list
nighthawk provider catalog list --filter anthropic
nighthawk provider catalog list anthropic
```

#### `nighthawk provider catalog add <providerId>`

Import a known provider directly from the catalog by ID. The protocol type, base URL, and model information are all supplied by the catalog — only an API key is required. Vendors whose protocol the catalog does not declare (e.g. xai, openrouter, and other vendor-specific SDKs) are imported as OpenAI-compatible and the output notes the guess; when the catalog provides no usable endpoint, `--base-url` is required. Proprietary protocols (e.g. Amazon Bedrock) cannot be imported. When the public catalog is unreachable, the import uses the built-in snapshot, so it still works offline or in blocked networks.

| Parameter / Option | Description |
| --- | --- |
| `<providerId>` | Provider ID in the catalog, e.g., `anthropic`, `openai` |
| `--api-key <key>` | Provider API key. Falls back to `NIGHTHAWK_REGISTRY_API_KEY` if not provided; required |
| `--default-model <modelId>` | Optional — set `default_model` to `<providerId>/<modelId>` after import |
| `--base-url <url>` | Override the catalog endpoint; required when the catalog declares none (or only an env placeholder) |
| `--url <url>` | Override the catalog URL; defaults to `https://models.dev/api.json` |

```sh
nighthawk provider catalog list anthropic          # Browse available models first
nighthawk provider catalog add anthropic --api-key sk-ant-... --default-model claude-opus-4-7
```

## Next steps

- [Slash Commands](./slash-commands.md) — Quick reference for control commands in the interactive TUI
- [Configuration Files](../configuration/config-files.md) — Persistent configuration for `default_model`, permission mode, and other startup parameters
- [Agent Skills](../customization/skills.md) — Skill file format for directories loaded via `--skills-dir`
- [Agents and Sub-Agents](../customization/agents.md) — Built-in sub-agents, custom agent files, and main Agent selection via `--agent`
