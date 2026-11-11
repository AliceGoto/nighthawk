---
name: check-nighthawk-docs
description: Answer questions about NightHawk using its documentation site — CLI usage, configuration, slash commands, providers, plugins, and error messages. Use when the user asks how NightHawk works or how to set something up.
---

# Check NightHawk docs

Answer NightHawk product questions from the documentation site, not from memory. Fetch the relevant page with **FetchURL** before answering.

Chinese: `https://alicegoto.github.io/nighthawk/zh/`
English: `https://alicegoto.github.io/nighthawk/en/`

## Where to look

| Question | Page (relative to the locale root) |
| --- | --- |
| Install, first launch | `guides/getting-started.html` |
| Everyday prompts and workflows | `guides/use-cases.html` |
| Input, approvals, plan mode | `guides/interaction.html` |
| Sessions, resume, compaction | `guides/sessions.html` |
| Web UI, remote control, IDE | `guides/web.html`, `guides/remote-control.html`, `guides/ides.html` |
| Providers, models, API keys | `configuration/providers.html` |
| `config.toml` and `tui.toml` fields | `configuration/config-files.html` |
| Environment variables | `configuration/env-vars.html` |
| Config precedence | `configuration/overrides.html` |
| Data locations | `configuration/data-locations.html` |
| MCP, plugins, skills, hooks, themes, agents | `customization/` |
| Slash commands, keyboard, tools | `reference/slash-commands.html`, `reference/keyboard.html`, `reference/tools.html` |
| `nighthawk` command, ACP | `reference/nighthawk-command.html`, `reference/nighthawk-acp.html` |
| Release notes | `release-notes/changelog.html` |

Swap the `zh` segment for `en` to read the English page.

If a page does not cover the question, say so plainly, answer from what you already know, and mark which parts you could not verify. Never invent config keys, command names, or model IDs.
