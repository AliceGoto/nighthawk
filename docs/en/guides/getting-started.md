# Getting started

## What is NightHawk CLI

NightHawk CLI is an AI agent that runs in the terminal, helping you carry out software development tasks and day-to-day terminal operations — reading and modifying code, running shell commands, searching files, fetching web pages, and autonomously planning and adjusting its next steps based on feedback as it works.

It fits scenarios such as:

- **Writing and modifying code**: implementing new features, fixing bugs, completing refactors
- **Understanding a project**: exploring an unfamiliar codebase and answering questions about architecture and implementation
- **Automating tasks**: batch-processing files, running builds and tests, chaining multiple scripts together

The CLI is written in TypeScript. Release artifacts are single-file native executables, so an installed binary does not need Node.js.

## Installation

Three options are available: Homebrew, downloading a release artifact, or building from source. The current release ships for macOS on Apple silicon only.

::: tip Before you install
NightHawk CLI is a fully interactive TUI application. For the best visual experience, run it in a terminal with true-color and ligature support, such as [Kitty](https://sw.kovidgoyal.net/kitty/) or [Ghostty](https://ghostty.org/).
:::

### Homebrew (macOS Apple silicon, recommended)

```sh
brew install AliceGoto/nighthawk/nighthawk
```

### Download a release

Download `nighthawk-darwin-arm64.zip` from [Releases](https://github.com/AliceGoto/nighthawk/releases) and put the binary on your `PATH`:

```sh
unzip nighthawk-darwin-arm64.zip -d ~/.local/bin
chmod +x ~/.local/bin/nighthawk
```

A `.sha256` sidecar sits next to the archive if you want to verify it first:

```sh
shasum -a 256 -c nighthawk-darwin-arm64.zip.sha256
```

### Build from source

Requires Node.js 24.15.0 or later and pnpm 10:

```sh
git clone https://github.com/AliceGoto/nighthawk.git
cd nighthawk
pnpm install
pnpm --filter @nighthawk/nighthawk run build
cd apps/nighthawk && pnpm link --global
```

`pnpm link --global` exposes the `nighthawk` command globally. If you would rather not touch the global environment, run `node apps/nighthawk/dist/main.mjs` after building.

> On Windows, install [Git for Windows](https://gitforwindows.org/) before first launch. NightHawk CLI uses the bundled Git Bash as its shell environment; if Git Bash is installed in a custom location, set `NIGHTHAWK_SHELL_PATH` to the absolute path of `bash.exe`. There is no Windows artifact yet; build from source as described above.

## First launch

Move into your project directory and run `nighthawk` to start the interactive UI:

```sh
cd your-project
nighthawk
```

To run a single instruction without entering the interactive UI, use `-p`:

```sh
nighthawk -p "Take a look at this project's directory structure"
```

To resume the previous session, add `-c`:

```sh
nighthawk -c
```

On first launch you need to configure a model provider. Edit `~/.nighthawk/config.toml` and add a provider plus its models, for example DeepSeek:

```toml
[providers.deepseek]
type = "openai"
base_url = "https://api.deepseek.com"
api_key_env = "DEEPSEEK_API_KEY"

[models.deepseek-chat]
provider = "deepseek"
model = "deepseek-chat"

default_model = "deepseek-chat"
```

`api_key_env` names the environment variable to read the key from; you can also write `api_key` inline. Keys stay in your local config — NightHawk has no account system and never sends credentials to a hosted service.

You can also run `/provider` in the interactive UI to pick a provider from a model catalog, enter a key, and choose a default model. See [Providers and models](../configuration/providers.md) for details, and [Configuration files](../configuration/config-files.md), [Environment variables](../configuration/env-vars.md), and [Configuration overrides](../configuration/overrides.md) for the full reference.

## Your first conversation

Once logged in, describe a task in natural language. A good starting point is to let NightHawk CLI familiarize itself with the project:

```
Take a look at this project's directory structure and briefly describe what each directory is for.
```

NightHawk CLI automatically calls file-reading, search, and other tools to browse the relevant content before responding. Read-only operations are executed automatically by default without requiring confirmation. For operations that modify files or run shell commands, it asks for your confirmation before proceeding.

You can also describe a more concrete task directly:

```
Add a function in src/utils that converts any string to kebab-case, and add a unit test for it.
```

NightHawk CLI plans the steps, modifies the code, runs the tests, and tells you what it did at each step.

::: tip Not sure what to do? Type `/help`
Type `/help` at any time to open the built-in command and keyboard shortcut panel. Use `↑`/`↓` to browse and `Esc` to close. To exit, type `/exit`, press `Ctrl-C` twice, or press `Ctrl-D` with the input box empty.
:::

## Common commands and keyboard shortcuts

For a first-time user, the following is all you need to know:

**Session commands**

| Command | Description |
| --- | --- |
| `/new` | Start a new session, clearing the current context |
| `/sessions` | Browse session history and choose one to resume |
| `/model` | Switch the current model |
| `/compact` | Manually compress the context to free up tokens |
| `/fork` | Fork the current session into an independent copy with full history (you stay in the current session) |

**Most-used keyboard shortcuts**

| Shortcut | Description |
| --- | --- |
| `Esc` | Interrupt streaming output / close a popup |
| `Ctrl-C` | Interrupt output; press twice while idle to exit |
| `Shift-Tab` | Toggle Plan mode |
| `Ctrl-S` | Inject a message mid-stream without waiting for the current response to finish |
| `Ctrl-O` | Collapse / expand tool output and compaction summaries |

For the full list, type `/help` or visit [Slash commands reference](../reference/slash-commands.md) and [Keyboard shortcuts](../reference/keyboard.md).

## Where data is stored

NightHawk CLI stores its local data under `~/.nighthawk/` by default — config files, session records, logs, and the update cache. To move it elsewhere, point to a new path via the `NIGHTHAWK_HOME` environment variable. For the full directory layout, see [Data locations](../configuration/data-locations.md) and [Environment variables](../configuration/env-vars.md).

## Upgrade and uninstall

After installation, verify that the executable is ready:

```sh
nighthawk --version
```

**Upgrade**: run `nighthawk upgrade` — the CLI checks for the latest version and presents update options. Homebrew users can also upgrade directly:

```sh
brew upgrade AliceGoto/nighthawk/nighthawk
```

Source builds update with:

```sh
git pull && pnpm install && pnpm --filter @nighthawk/nighthawk run build
```

**Uninstall**: Homebrew users run `brew uninstall nighthawk`; manual installs just delete the `nighthawk` executable.

## Next steps

- [Interaction and input](./interaction.md) — input box operations, approval flow, Plan mode, and Ask When Needed mode explained
- [Sessions and context](./sessions.md) — resuming sessions, compressing context, exporting sessions
- [Common use cases](./use-cases.md) — prompt examples for typical tasks
