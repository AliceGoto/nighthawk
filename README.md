# NightHawk

**A security-first AI agent for the terminal — penetration testing, code audit, and full-strength coding in one loop.**

NightHawk is built around a simple thesis: offensive security and serious engineering belong in the same agent. It pairs a modern coding agent core (Turn/Step loop, sub-agents, MCP, skills, persistent memory) with a native security engine — 116 vulnerability rules mapped to OWASP Top 10 and CWE, Shannon-entropy secret detection, cross-file taint analysis, and dependency auditing (offline, OSV, and host package-manager) — all exposed as first-class tools the agent can invoke mid-session.

[中文文档](README.zh-CN.md)

---

## Why NightHawk

Most AI coding agents help you write code faster. NightHawk helps you **break it, prove it, and fix it**:

- **Audit as a first-class workflow.** Ask "audit this repo for injection risks" and the agent runs `SecurityScan`, triages findings by severity, confirms exploitability with `TaintTrace`, and proposes fixes — in one turn.
- **Offensive-security oriented.** Secret hunting, dependency risk, dangerous-sink tracing, and configuration flaws are surfaced by the same loop that reads, edits, and runs code — no context switching between scanner and IDE.
- **Coding that keeps up.** The Turn/Step core, parallel tool calls, sub-agent fan-out, and session checkpoints are engineered to the bar set by the best closed-source coding agents — with the verification harness to back it (see [Engineering Proof](#engineering-proof)).
- **Terminal-native.** Millisecond TUI startup, runs over SSH, zero IDE required. The TUI layer is built on a pi-style component framework.
- **Provider-agnostic.** OpenAI, Anthropic, Google, DeepSeek, or any OpenAI/Anthropic-compatible endpoint — the provider layer is a protocol abstraction, not a vendor lock.

## Security Toolkit

| Tool | What it does |
| --- | --- |
| `SecurityScan` | Rule engine with 116 patterns across SQLi, XSS, command injection, path traversal, SSRF, deserialization, weak crypto, auth flaws, XXE, and per-language risks (Node/Python/Java/Go/PHP). Every finding carries CWE/OWASP IDs, severity, and a fix suggestion — bilingual (EN/中文). Caches results to disk so rescanning unchanged files is fast. |
| `SecretScan` | Detects hardcoded credentials — AWS/GCP/Azure keys, tokens, private keys — combining known patterns with Shannon-entropy scoring. |
| `TaintTrace` | Taint tracking: identifies user-controlled sources (HTTP params, env, stdin) and traces assignment chains to dangerous sinks (exec, eval, innerHTML, SQL). Follows data flow across module imports by default (`scope: file` restricts to a single file). |
| `DepAudit` | Flags risky dependency patterns (postinstall scripts, unpinned versions, known-risk config) via offline checks, queries the OSV API, and can run the host package-manager audit (`useExternal: true`) to merge real CVEs. |
| `PortScanner` | Scans targets for open ports and running services via nmap. Available in pentest mode. |
| `DirBrute` | Enumerates web directories and files using a built-in wordlist of 40+ common paths. Available in pentest mode. |
| `PasswordBrute` | Tests credentials against login forms with a common-password wordlist. Requires explicit authorization. Available in pentest mode. |
| `ThreatModel` | STRIDE-based threat modeling with trust boundary analysis and Mermaid diagrams. Available in pentest mode. |
| `SubdomainEnum` | Discovers subdomains via DNS resolution and a wordlist of 50+ common subdomains. Available in pentest mode. |

The tools compound: rule hits seed taint traces, taint flows confirm exploitability, and confirmed findings feed the fix proposal.

## Pentest Mode

Pentest mode transforms NightHawk into a dedicated penetration testing workstation. Enter with `/pentest`:

- **Hacker theme** — Matrix-green-on-black UI, boot animation, hacker-themed loading tips
- **Forced stage orchestration** — agent executes 9 stages one at a time: Compliance → Scope → Recon → Attack Surface → Vulnerability Verification → Exploitation (PoC) → Post-Exploitation → Remediation → Report
- **Automatic stage progression** — the orchestrator sends stage-specific prompts, waits for completion, then advances to the next stage
- **All tools available** — PortScanner, DirBrute, PasswordBrute, ThreatModel, SubdomainEnum, plus the four core security tools
- **Professional report** — generates HTML/PDF findings report with evidence and risk scoring

```
/pentest              → toggle mode on/off
/pentest <target>     → start pentest against target
```

See [docs/en/guides/pentest-mode.md](docs/en/guides/pentest-mode.md) for full documentation.

## Engineering Proof

NightHawk's agent core is verified the same way the leading coding agents are — through contracts, conformance suites, and end-to-end runs rather than demos:

- **Contract-pinned SDK** — every wire method in the client SDK is mirrored by zod schemas and compile-time parity assertions against engine types; schema drift fails the build, not the user.
- **Transport conformance suites** — one shared suite runs unchanged against every transport (in-process memory + IPC), so both return byte-identical data.
- **Security engine smoke tests** — `scripts/smoke-security.ts` exercises all four security tools against known-vulnerable fixtures; run it after any engine change.
- **Live e2e suites** — REST + WebSocket session surface tested end-to-end with structured, case-scoped observability.
- **Repo guards** — lint-time checks enforce import boundaries, workspace sync, and packaging integrity on every PR.

To verify a checkout yourself:

```sh
pnpm lint                                  # oxlint + eslint + repo guards
pnpm -C packages/agent-core test           # engine + security tool tests
node scripts/smoke-security.ts             # security engine end-to-end
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  apps/nighthawk — CLI / TUI                             │
│  (terminal UI, slash commands, approval flows, themes)  │
└───────────────────────────┬─────────────────────────────┘
                            │ SDK
┌───────────────────────────▼─────────────────────────────┐
│  agent-core-v2 — current Agent engine (DI×Scope)        │
│  agent-core — v1 legacy Agent engine                    │
│  Turn/Step · tools · skills · MCP client                │
│  session checkpoints · permissions · sub-agents         │
│  └─ security tools: SecurityScan / SecretScan /         │
│     TaintTrace / DepAudit / PortScanner / DirBrute /   │
│     PasswordBrute / ThreatModel / SubdomainEnum        │
├─────────────────────────────────────────────────────────┤
│  kosong — LLM provider abstraction (multi-provider)     │
│  kaos — execution env & file/process abstractions       │
└─────────────────────────────────────────────────────────┘
```

The design takes the strongest ideas from the current generation of agent harnesses — a typed tool-calling Turn/Step loop (no explicit observe/reflect phases), sub-agents as isolated state machines rather than nested prompts, and a provider abstraction that treats model backends as interchangeable protocols.

### Monorepo layout

| Path | Purpose |
| --- | --- |
| `apps/nighthawk` | The CLI/TUI application (`nighthawk` binary). |
| `packages/agent-core` | Agent engine: loop, tools, profiles, skills, MCP, sessions, records, security tools. |
| `packages/security-core` | Standalone security engine sources (rules, scanner, secrets, taint). **Deprecated** — production security engine is in `packages/agent-core/src/tools/builtin/security/`. |
| `packages/kosong` | LLM/provider abstraction — OpenAI, Anthropic, Google, and compatible protocols. |
| `packages/kaos` | Execution environment: file/process abstractions over local or remote hosts. |
| `packages/node-sdk` | Public TypeScript SDK and harness. |
| `packages/pi-tui` | The pi-style terminal UI component framework powering the TUI. |
| `apps/vscode`, `apps/nighthawk-inspect`, `apps/vis` | Editor extension, engine inspector, and session visualizer. |

## Quick Start

Requirements: Node.js ≥ 24.15, pnpm 10.33.

```sh
git clone https://github.com/AliceGoto/nighthawk && cd nighthawk
pnpm install
pnpm run build:packages
pnpm -C apps/nighthawk run build

# interactive TUI
node apps/nighthawk/dist/main.mjs

# headless security audit
node apps/nighthawk/dist/main.mjs -p "Audit this repo for injection and XSS risks, then rank findings by exploitability."

# web UI (Lobe Chat)
nighthawk web --port 3000
```

Configure a provider (API key) in the TUI via `/login`, or set `NIGHTHAWK_API_KEY` / edit `~/.nighthawk/config.toml`.

> 📖 **Full documentation**: [https://AliceGoto.github.io/nighthawk/](https://AliceGoto.github.io/nighthawk/) — usage guide, slash commands, tools reference, and pentest mode walkthrough.

## Agent Capabilities

- **Tools** — read/edit/write files, grep/glob, shell with approval gates, fetch, web search, git, plus the nine security/pentest tools.
- **Pentest mode** — `/pentest` toggles a dedicated pentest workstation with hacker theme, forced stage orchestration, and automatic report generation.
- **MCP** — connect any Model Context Protocol server; conversational `/mcp-config` instead of hand-edited JSON.
- **Skills** — markdown-defined reusable playbooks, auto-loaded when relevant.
- **Memory** — persistent project memory that compounds across sessions.
- **Sub-agents & background tasks** — parallel exploration without polluting the main context.
- **Web UI** — `nighthawk web --port 3000` launches a browser-based Lobe Chat interface.
- **Session checkpoints** — long audits survive restarts; resume any session with `-r`.
- **Permissions & sandboxing** — workspace trust gate, path policies, approval rules per tool.

## Development

```sh
pnpm run build:packages          # build all packages
pnpm -C apps/nighthawk run build # build the CLI
pnpm lint                        # oxlint + eslint + repo guards
pnpm -C packages/agent-core test # package tests
```

See [AGENTS.md](AGENTS.md) for the repo-wide engineering rules and the per-package `AGENTS.md` files for local conventions.

## License

MIT — see [LICENSE](LICENSE).
