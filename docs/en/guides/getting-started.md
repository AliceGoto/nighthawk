# Getting started

## What is NightHawk CLI

NightHawk CLI is an AI agent that runs in the terminal, helping you carry out software development tasks and day-to-day terminal operations — reading and modifying code, running shell commands, searching files, fetching web pages, and autonomously planning and adjusting its next steps based on feedback as it works.

It fits scenarios such as:

- **Writing and modifying code**: implementing new features, fixing bugs, completing refactors
- **Understanding a project**: exploring an unfamiliar codebase and answering questions about architecture and implementation
- **Automating tasks**: batch-processing files, running builds and tests, chaining multiple scripts together
- **Security auditing and penetration testing**: vulnerability scanning, secret detection, port scanning, and structured pentest workflows via [Pentest mode](./pentest-mode.md)

The CLI is written in TypeScript, distributed via npm, and runs on Node.js.

## Installation

Two installation options are available: the official install script (recommended, no pre-installed Node.js required) and a global npm install.

::: tip Before you install
NightHawk CLI is a fully interactive TUI application. For the best visual experience, run it in a terminal with true-color and ligature support, such as [Kitty](https://sw.kovidgoyal.net/kitty/) or [Ghostty](https://ghostty.org/).
:::

### Install script (recommended)

- **macOS / Linux**:

```sh
curl -fsSL https://cdn.jsdelivr.net/gh/AliceGoto/nighthawk@main/install.sh | bash
```

- **Windows (PowerShell)**:

```powershell
irm https://cdn.jsdelivr.net/gh/AliceGoto/nighthawk@main/install.ps1 | iex
```

> On Windows, install [Git for Windows](https://gitforwindows.org/) before first launch. NightHawk CLI uses the bundled Git Bash as its shell environment; if Git Bash is installed in a custom location, set `NIGHTHAWK_SHELL_PATH` to the absolute path of `bash.exe`.

The script automatically downloads the latest release, verifies the checksum, and places the `nighthawk` executable on your `PATH`.

### Homebrew (macOS / Linux)

If you use [Homebrew](https://brew.sh/), install from the NightHawk tap:

```sh
brew tap AliceGoto/nighthawk
brew install AliceGoto/nighthawk/nighthawk
```

If `brew install` cannot find the formula yet, run `brew tap` explicitly first. The formula downloads the platform binary from the GitHub Release and installs it as a regular Homebrew formula.

### npm installation

Requires Node.js 24.15.0 or later:

```sh
node --version
npm install -g @nighthawk/nighthawk
```

Or with pnpm:

```sh
pnpm add -g @nighthawk/nighthawk
```

## Upgrade and uninstall

After installation, verify that the executable is ready:

```sh
nighthawk --version
```

**Upgrade**: run `nighthawk upgrade` — the CLI checks for the latest version and presents update options. Choose `Install update now` to upgrade based on your current install source. You can also upgrade directly via the package manager:

```sh
npm install -g @nighthawk/nighthawk@latest
```

**Uninstall**: if you installed via the script, delete the `nighthawk` executable. Via Homebrew, `brew uninstall AliceGoto/nighthawk/nighthawk`. If you installed via npm:

```sh
npm uninstall -g @nighthawk/nighthawk
```

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

On first launch you need to configure an API source. In the interactive UI, enter `/provider` to open the provider manager:

```
/provider
```

`/provider` lets you add a provider interactively:

- **NightHawk Platform API key** — enter your NightHawk Platform API key

::: tip Using other AI providers
If you want to connect Anthropic, OpenAI, Google, or other providers, edit `~/.nighthawk/config.toml` directly to configure the API key. See [Providers and models](../configuration/providers.md) for details. For the full reference of all config options, see [Configuration files](../configuration/config-files.md), [Environment variables](../configuration/env-vars.md), and [Configuration overrides](../configuration/overrides.md).
:::

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

## Next steps

- [Interaction and input](./interaction.md) — input box operations, approval flow, Plan mode, and YOLO mode explained
- [Sessions and context](./sessions.md) — resuming sessions, compressing context, exporting sessions
- [Common use cases](./use-cases.md) — prompt examples for typical tasks
- [Pentest mode](./pentest-mode.md) — penetration testing workstation with dedicated security tools
