# @nighthawk/nighthawk

> The Starting Point for Next-Gen Agents

[![npm](https://img.shields.io/npm/v/@nighthawk/nighthawk)](https://www.npmjs.com/package/@nighthawk/nighthawk) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)  [![Docs](https://img.shields.io/badge/docs-online-blue)](https://AliceGoto.github.io/nighthawk/en/)

## What is NightHawk CLI

NightHawk CLI is an AI coding agent that runs in your terminal. It can read and edit code, run shell commands, search files, fetch web pages, and choose the next step based on the feedback it receives. It works out of the box with the NightHawk platform and can be configured for OpenAI/Anthropic-compatible providers.

## Install

The recommended install path is the official script. It does not require Node.js to be installed first.

- **macOS / Linux**:

```sh
curl -fsSL https://cdn.jsdelivr.net/gh/AliceGoto/nighthawk@main/install.sh | bash
```

- **Windows (PowerShell)**:

```powershell
irm https://cdn.jsdelivr.net/gh/AliceGoto/nighthawk@main/install.ps1 | iex
```

You can also install with Homebrew:

```sh
brew tap AliceGoto/nighthawk
brew install AliceGoto/nighthawk/nighthawk
```

Official releases automatically update the Homebrew formula in the `AliceGoto/homebrew-nighthawk` tap.

> On Windows, install [Git for Windows](https://gitforwindows.org/) before first launch because NightHawk CLI uses the bundled Git Bash as its shell environment. If Git Bash is installed in a custom location, set `NIGHTHAWK_SHELL_PATH` to the absolute path of `bash.exe`.

Then run it with a new Terminal session:

```sh
nighthawk --version
```

### Alternative: npm

If you prefer npm, use Node.js 24.15.0 or later:

```sh
npm install -g @nighthawk/nighthawk
```

Or with pnpm:

```sh
pnpm add -g @nighthawk/nighthawk
```

For upgrade and uninstall instructions, see the [Getting Started guide](https://AliceGoto.github.io/nighthawk/en/guides/getting-started).

## Quick Start

Open a project and start the interactive UI:

```sh
cd your-project
nighthawk
```

On first launch, run `/connect` inside NightHawk CLI and add a provider by API key. After that, try a first task:

```
Take a look at this project and explain the main directories.
```

## Key Features

- **Single-binary distribution.** Install with one command — no Node.js setup, no PATH gymnastics, no global module conflicts.
- **Blazing-fast startup.** The TUI is ready in milliseconds, so opening a session never feels heavy.
- **Polished TUI.** A carefully tuned interface designed for long, focused agent sessions.
- **Video input.** Drop a screen recording or demo clip into the chat — let the agent watch instead of typing out what's hard to describe in words.
- **AI-native MCP configuration.** Add, edit, and authenticate Model Context Protocol servers conversationally via `/mcp-config` — no hand-editing JSON.
- **Subagents for focused, parallel work.** Dispatch built-in `coder`, `explore`, and `plan` subagents in isolated context windows; the main conversation stays clean.
- **Lifecycle hooks.** Run local commands at key points — gate risky tool calls, audit decisions, fire desktop notifications, wire into your own automation.

## Documentation

- Full docs: https://AliceGoto.github.io/nighthawk/en/
- 中文文档: https://AliceGoto.github.io/nighthawk/zh/
- Getting Started: https://AliceGoto.github.io/nighthawk/en/guides/getting-started

## Repository & Issues

- Source: https://github.com/AliceGoto/nighthawk
- Issues: https://github.com/AliceGoto/nighthawk/issues
- Security: see SECURITY.md in the main repository

## License

MIT
