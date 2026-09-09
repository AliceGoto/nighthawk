---
outline: 2
---

# Changelog

This page documents the changes in each NightHawk CLI release.

## 0.42.0 (2026-09-09)

### Features

- Add the `/session` command to browse and manage sessions across workspaces — `Ctrl+E` expands session details and `Delete` removes one after confirmation.
- Add v2 engine enhancements: pentest mode full implementation, non-main agent Goal support, and Kaos injection adapter for `createSessionWithKaos` / `resumeSessionWithKaos`.
- Add MCP stdio kaos executor support: configure `executor: 'kaos'` on stdio MCP servers to launch child processes through the Kaos executor.
- Add ACP protocol enhancements: `type: 'acp'` MCP transport support and Other content block free-text editing.
- Add legacy CLI plugin migration: `nighthawk migrate` now transfers legacy CLI plugins alongside skills.
- Add optional `priority` field (high/medium/low) to TodoList items, displayed sorted by priority in the TUI.
- Add TUI Agent auto-grouping by description: multiple Agent tool calls are automatically grouped with on-demand split view.

### Polish

- Replace the TUI welcome banner with a compact gradient NightHawk wordmark.
- Publish unsigned native builds for Windows, Linux, and macOS.
- Improve ACP AskUserQuestion validation and update the ACP reference docs.

### Bug Fixes

- Fix Read and Write tool argument normalization in the v2 engine — `offset`/`count` and `file_path` aliases are now accepted.
- Fix several known issues and make various refinements. See the [changelog on GitHub](https://github.com/AliceGoto/nighthawk/blob/main/apps/nighthawk/CHANGELOG.md) for more technical entries.

## 0.41.0 (2026-08-30)

### New Features
- Lobe Chat Web UI integration: `nighthawk web --port 3000` launches browser chat
- Web UI chat: sidebar conversation management, message bubbles, code highlighting
- Plugin system enhancements: Tool/Profile/Config registration, hot reload, plugin SDK
- Persona card system: `/personas` command, auto-role matching in AgentSwarm
- `/swarm-status` command: view real-time swarm sub-task status
- Cosmic Broth dark theme: space capsule pixel interface
- Developer docs: bilingual plugin development guide

### Changes
- Removed all legacy brand/vendor references from docs
- Cross-platform builds: Windows/Linux/macOS native binaries
- TUI Logo restored to NH compact letters with gradient animation

### Bug Fixes
- Ctrl+C properly exits web service

## 0.40.0 (2026-08-28)

### New Features
- Add `/trace` command: view session trace timeline showing each turn's duration, tool call chain, and status. See [Slash Commands](../reference/slash-commands.md#information-status).

### Features

- **Pentest mode**: Enter `/pentest` or `/hack` to switch to a dedicated penetration testing workstation with a Matrix-green-on-black hacker theme. Includes a 9-stage orchestrated workflow: compliance → scope → recon → attack surface → vulnerability verification → exploitation → post-exploitation → remediation → report generation.
- **Pentest tools**: Five new tools available only in pentest mode — `PortScanner` (port scanning via nmap), `DirBrute` (directory brute force with 40+ path dictionary), `PasswordBrute` (credential testing with common password dictionary), `ThreatModel` (STRIDE threat modeling with Mermaid diagrams), `SubdomainEnum` (subdomain enumeration via DNS + 50+ subdomain dictionary).
- **Core security tools**: Four security tools always available — `SecurityScan` (116 vulnerability rules covering SQLi, XSS, command injection, path traversal, SSRF, deserialization, weak crypto, and auth flaws), `SecretScan` (hardcoded credential detection with Shannon entropy scoring), `TaintTrace` (cross-file taint tracking from user-controlled sources to dangerous sinks), `DepAudit` (dependency audit with postinstall script checks, unpinned version detection, and OSV CVE queries).
- Pentest report generation via `/report` — exports HTML/PDF with executive summary, risk matrix, vulnerability details (CWE/OWASP/CVSS), reproduction steps, and remediation.
- Slash command system with 30+ commands: `/help`, `/login`, `/logout`, `/model`, `/provider`, `/settings`, `/permission`, `/theme`, `/editor`, `/exit`, `/version`, `/status`, `/usage`, `/title`, `/compact`, `/new`, `/sessions`, `/session`, `/tasks`, `/fork`, `/undo`, `/init`, `/export-md`, `/export-debug-zip`, `/copy`, `/reload`, `/reload-tui`, `/goal`, `/swarm`, `/plan`, `/yolo`, `/auto`, `/btw`, `/mcp`, `/plugins`, `/feedback`, `/add-dir`, `/experiments`, `/mcp-config`, `/custom-theme`, `/update-config`, `/check-nighthawk-docs`, `/import-from-cc-codex`, `/sub-skill`.
- MCP stdio supports kaos executor: configure `executor: 'kaos'` for MCP stdio servers to launch child processes via the Kaos executor, no longer limited to local execution.
- ACP supports `type: 'acp'` MCP transport: MCP servers from ACP with `acp` transport are now handled correctly instead of being dropped.
- Todo priority field: each todo item can now set a `priority` (high/medium/low), displayed sorted by priority in the TUI.
- ACP supports Other free-text: `Other` type content blocks in the ACP protocol now support free-text editing instead of being ignored.
- TUI Agent auto-grouping by description: multiple Agent tool calls are automatically grouped by description in the TUI, with on-demand split view.
- v2 pentest mode fully implemented: `setPentestMode` is now fully functional in the v2 engine — SDK clients can switch pentest mode normally.
- v2 non-main agent Goal support: non-main agents in the v2 engine can now set and execute Goal objectives, closing the v1/v2 gap.
- v2 Kaos injection adapter: `createSessionWithKaos` / `resumeSessionWithKaos` now correctly inject the Kaos execution environment in the v2 engine instead of falling back to local execution.
- Legacy CLI plugin migration support: `nighthawk migrate` now supports migrating legacy CLI plugins — both skills and plugins are fully migrated.

### Polish

- WaitFor tool: the agent can now wait for a background task to finish within the current turn instead of ending the turn and being re-invoked.
- Edit and Write now require reading an existing file before modifying it.
- Collapse long `!` shell command output instead of flooding the transcript. Press Ctrl+O to expand or collapse it together with tool output.
- Handle `Ctrl+C` during API retry loops — no longer hangs until all retries exhaust.

### Bug Fixes

- Fix config.toml entries being lost when the file had a syntax error or was edited outside the app.
- Fix pasted images and videos failing to reach the model.
- Fix Gemini tool-call sessions failing on subsequent requests.
- Fix several known issues and make various refinements.

## 0.39.0 (2026-08-26)

### Features

- TUI fullscreen mode: set `NIGHTHAWK_TUI_FULL_SCREEN=1` for a scrollable transcript viewport, mouse text selection, clickable links, and Ctrl-Shift-F transcript search.
- TUI LaTeX rendering: math expressions (`$…$` and `$$…$$`) in messages render as Unicode formulas.
- Subagent model pool (experimental): configure a pool of candidate models in `[secondary_model]` with per-alias descriptions. The main agent picks the best model per spawn.
- `/tasks` panel now shows real-time progress of background sub-agents.
- `/feedback` (alias `/bug`) now supports attaching diagnostic logs and codebase context.

### Polish

- Apply the official Anthropic effort configuration; unknown models fall back to a 128k output cap.
- Show the reason for OAuth connection failures — DNS, connection refused, TLS, timeout — instead of a generic `fetch failed`.
- Model selector in `/model` and `/effort` now warns that switching invalidates the prompt cache.

### Bug Fixes

- Fix untrusted workspace being able to plant a same-named `fd`/`stty` executable before trust confirmation. The trust prompt now shows the MCP launch targets and defaults to "Don't trust".
- Fix the risk that a binary planting attack could escalate via command name resolution during startup.
- Fix the startup path not using `resolveCommandPath` for external commands before the workspace trust gate.
- Fix 400 errors on subsequent turns after interrupting a model's reasoning phase on strict OpenAI-compatible providers (e.g. DeepSeek).
- Fix `nighthawk -p` not waiting for background tasks and sub-agents to finish before exiting.
- Fix MCP tool calls failing because `structuredContent` and `_meta` metadata were silently dropped.
- Fix removing an MCP service breaking ongoing sessions — tools are retained but calls return a removal notice.

## 0.38.0 (2026-08-24)

### Features

- 13 new data sources in the official NightHawk Datasource plugin — Chinese government data (NDA/NBS) and standards (GB/HB/DB/TT), eight international organization datasets (WHO, FAO, UNSD, ECB, Eurostat, UNICEF, OECD, FRED), Xinhua Finance, and Caixin. Update the plugin from the Official tab in `/plugins`.
- web: Add a Pin action to the chat header more-menu.
- Add 4 new hook events: `TurnStarted`, `UserPromptQueued`, `TaskStarted`, and `SessionHeartbeat`. Configure under `[[hooks]]` in `config.toml`.
- Session idle expiry hint: when resuming a long-idle session or submitting after a long idle stretch, a dialog warns that the context cache has likely expired. Set `[tui].cache_expiry_hint = false` to disable.

### Polish

- Plugin marketplace now has an Official tab with NightHawk Computer Use and NightHawk WebBridge plugins. Installing them automatically configures the managed runtime.
- TUI status bar is now customizable via `[status_line]` in `tui.toml` — configure which slots to show and in what order.
- `nighthawk -p` and `nighthawk web` now default to the agent-core-v2 engine. Set `NIGHTHAWK_LEGACY_FLAG=1` to fall back to the legacy engine.

### Bug Fixes

- Fix sessions getting stuck with "message must not be empty" after a content-filter response.
- Fix forked sessions losing media attachments, plan files, background task output, and cron tasks.
- Fix web: session list no longer shows duplicate workspace groups on Windows when the same folder is opened with different path notations.
- Fix web: file references in @mentions now render as icon pills in chat messages.
- Fix web: browser tab title now shows the current workspace directory name.

## 0.37.0 (2026-08-22)

### Features

- Support activating multiple skills in a single prompt: type `/` after a blank space to insert a skill marker.
- Windows native (single-file) CLI now supports auto-update.
- web: Sidebar gets Open / Done / Workspaces tabs. Sessions can be marked as Done.
- web: New session management page.
- Agent Skills: built-in skills appear directly as `/<name>` slash commands — `/mcp-config`, `/custom-theme`, `/update-config`, `/check-nighthawk-docs`, `/import-from-cc-codex`, `/sub-skill`.
- External skills auto-register as `/skill:<name>` slash commands with shorthand `/<name>` when the name is not taken.

### Polish

- Skills queued while the agent is busy are now executed in order instead of being rejected.
- `/goal` objectives exceeding 4000 characters now show a warning before being rejected.
- Subagent panel renamed to "Background Agent" in the web UI.
- The permission mode description for `/yolo` and `/auto` is now clearer: YOLO auto-approves tool actions but the agent may still ask questions; Auto is fully autonomous and never asks.

### Bug Fixes

- Fix recovery of sessions whose original working directory no longer exists — the server rebuilds the session index on startup.
- Fix session list missing sessions that already exist on disk, or returning 404 when accessed directly.
- Fix web: chat code blocks rendered with UI font at the wrong font size after the Markdown renderer upgrade.
- Fix web: session search by Cmd+K showing duplicate results.
- Fix web: scroll position not being restored when switching back to a session.

## 0.36.0 (2026-08-20)

### Features

- web: AI auto-generates session titles (experimental). Enable with `NIGHTHAWK_EXPERIMENTAL_AUTO_SESSION_TITLE=1` (or the master switch `NIGHTHAWK_EXPERIMENTAL_FLAG=1`).
- TUI supports rendering LaTeX math formulas (`$…$` and `$$…$$`) as Unicode.
- Customizable agent identity via `[identity]` in `config.toml` — set `name` and `slug` for the system prompt and protocol fields.
- New `/copy` slash command: copies the last assistant message to the clipboard.

### Polish

- Optimize the input box Plan/Goal/Swarm toggles in the web UI — now tucked behind the + menu next to the input box.
- `/usage` and `/status` commands now display Extra Usage (top-up) balance.
- Show a "skills available" indicator in the input box before a session is created.

### Bug Fixes

- Fix the web endpoint binding vulnerability: bearer token validation could be bypassed with percent-encoded API paths.
- Fix the session filesystem API allowing symlink following outside the workspace — host files could be accessed without authorization.
- Fix the web UI not applying the color theme correctly on the first load after a fresh install.
- Fix web: reconnecting after a disconnect no longer leaves the session stuck in "sending" state.
- Fix web: pasted images not appearing in the input box on the first session.

## 0.35.0 (2026-08-18)

### Features

- Plugin marketplace: Modern Web Guidance plugin available via `/plugins`.
- `/tasks` panel shows real-time progress of background sub-agents.
- Support for `NIGHTHAWK_MODEL_*` environment variables to define a temporary model without modifying `config.toml`.

### Polish

- Agent Skills system with multi-root discovery: project > user > plugin > built-in layers.
- Skill commands entered while the agent is busy are now queued instead of rejected.
- web: model selector now refreshes the model catalog for all providers on open — newly available models always show up.

### Bug Fixes

- Fix coder sub-agent being able to spawn further sub-agents by default.
- Fix token count being understated after compaction — now matches the number shown in the session.
- Fix two binary planting risks on Windows.
- Fix `nighthawk -p` exiting with code 0 even when the turn failed.
- Fix session recovery failing when the workspace directory was a symlink.

## 0.34.0 (2026-08-16)

### Features

- web: Session list sidebar gains a tile view in addition to the list view.
- NightHawk Computer Use plugin now supports Windows x64. Install via `/plugins`.
- New `/mcp-config` slash command for interactive MCP server configuration.
- New `/mcp` slash command to view MCP server connection status.

### Polish

- web: sub-agent tasks now display the model and thinking effort used.
- web: failed model requests keep the failure card in the session — can be resumed with one click.
- web: retry progress is shown during auto-retry (Nth of M attempts).
- MCP server startup timeout and tool timeout are now configurable globally via `[mcp]` in `config.toml`.

### Bug Fixes

- Fix reading UTF-16 LE/BE text files (with or without BOM).
- Fix web: attachments sent with skill commands being dropped.
- Fix web: model selector overflowing the screen when many models are configured.
- Fix web: Windows paths with spaces opening the Documents folder instead of the target file.
- Fix web: renaming a session while an IME composition is active no longer triggers Enter/Esc prematurely.
- Fix web: drag-to-select text during a rename no longer moves the entire list item.

## 0.33.0 (2026-08-14)

### Features

- `/plugins` marketplace: NightHawk Computer Use and NightHawk WebBridge plugins. Auto-configures the managed runtime on install; retryable if interrupted.
- web: Add and manage custom providers in Settings.
- web: Pin sessions to the top of the sidebar.
- web: Session titles support emoji.
- web: Display logged-in account info and plan usage.

### Polish

- Startup now asks whether to trust the current folder.
- `/fork` no longer switches to the forked session — the current session and background tasks keep running. Fork results are available in `/sessions`.
- plugin marketplace "Partners" tab renamed to "Curated" with a note that these are third-party plugins from NightHawk partners.
- Auto-detect Git Bash from native MSYS2 toolchains on Windows (ucrt64/clang64/clangarm64).

### Bug Fixes

- Fix macOS: too many files in the skills directory causing all tool calls to fail with `spawn EBADF`.
- Fix the first request not waiting for MCP initialization to complete.
- Fix MCP tool results with `structuredContent` and `_meta` metadata being silently dropped.
- Fix `/plugins` showing incorrect availability and install state for built-in capabilities.
- Fix web: colorspace settings page showing permission modes in wrong order (from strict to permissive).
- Fix web: YOLO/auto risk colors being swapped on mobile settings.

## 0.32.0 (2026-08-12)

### Features

- TUI support for Markdown-defined custom agents.
- `/secondary_model` slash command for configuring the sub-agent model (experimental — enable via `/experiments` first).
- Plugins can contribute custom agents, automatically discovered for sub-agent delegation.
- Plugins can contribute system prompts via `systemPrompt` or `systemPromptPath` in `nighthawk.plugin.json`.

### Polish

- Print mode (`nighthawk -p`): background tasks no longer timeout by default. Set `[background] bash_task_timeout_s` or `[subagent] timeout_ms` to restore limits.
- Per-step LLM retry cap raised from 3 to 10 — transient failures (429 / overload) auto-retry before the turn fails.
- Workspaces now auto-sync: new sessions register automatically, removed workspaces do not reappear.
- `nighthawk web` logs failed requests and key operations for easier diagnostics.

### Bug Fixes

- Fix `nighthawk -p` background sub-agents not returning results to the main agent.
- Fix session fork losing content — forked sessions now preserve media attachments, plan files, background task output, and cron tasks.
- Fix web: refreshing the page while sub-agents are running no longer loses the AgentSwarm member list.
- Fix web: iOS mobile layout issues (composer, safe area, toast).
- Fix web: file uploads via HTTP showing connection errors for copied folders — folders are now skipped.

## 0.31.0 (2026-08-10)

### Features

- First public release of NightHawk CLI.
- Interactive TUI with dark/light/auto themes and custom theme support.
- `/login` and `/provider` for configuring AI providers via API key.
- Full Turn/Step agent loop with Plan mode, YOLO mode, and Auto mode.
- Built-in tools: `Read`, `Write`, `Edit`, `Grep`, `Glob`, `Bash`, `FetchURL`, `CronCreate`, `CronDelete`, `CronList`, `TaskList`, `TaskOutput`, `TaskStop`, `TodoList`, `WaitFor`, `Agent`, `AgentSwarm`, `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode`, `ReadMediaFile`, `Skill`.
- Slash command system with session management, mode switching, and configuration commands.
- MCP (Model Context Protocol) client supporting stdio, HTTP, and SSE transports.
- Plugin system with marketplace integration (`/plugins`).
- Agent Skills system with multi-root discovery.
- Session persistence, resumption, fork, and export.
- Goal mode (`/goal`) for autonomous long-running objectives.
- Web UI (`nighthawk web`) with REST API and WebSocket event stream.
- Configuration via `config.toml` and `tui.toml` with environment variable overrides.
- Support for multiple LLM providers: Anthropic Claude, OpenAI, Google Gemini, Vertex AI, and OpenAI-compatible third-party services.
- Thinking mode support with configurable effort levels.
- Background task management with progress tracking.
- Hook system for lifecycle events.
- Proxy support (HTTP, HTTPS, SOCKS) for all outbound traffic.
- Auto-update mechanism.
- Anonymous telemetry (opt-out via `NIGHTHAWK_DISABLE_TELEMETRY=1`).