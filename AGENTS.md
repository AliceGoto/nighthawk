# Repository-level Agent Guide

Reply in the same language as the user.

This is a TypeScript monorepo built for agent-assisted development. Keep the root `AGENTS.md` limited to hot-path rules: the project map, hard constraints, and workflow requirements — things every task needs to know.

## Project Overview

**NightHawk** is a security-first AI agent for the terminal — penetration testing, code audit, and full-strength coding in one loop. It pairs a modern coding agent core (Turn/Step loop, sub-agents, MCP, skills, persistent memory) with a native security engine — 116 vulnerability rules mapped to OWASP Top 10 and CWE, Shannon-entropy secret detection, cross-file taint analysis, and dependency auditing (offline, OSV, and host package-manager) — all exposed as first-class tools the agent can invoke mid-session.

### Technology Stack

- **Language**: TypeScript (strict mode, ES2024 target, bundler module resolution)
- **Package Manager**: pnpm 10.33.0 (monorepo workspaces)
- **Runtime**: Node.js ≥ 24.15.0
- **Build Tools**: tsdown (for bundling), TypeScript 6.0.2
- **Testing**: Vitest 4.1.4 (unit/integration tests), custom smoke tests, node:test for pi-tui
- **Linting**: oxlint 1.59.0 with TypeScript-aware rules
- **Formatting**: oxlint auto-fix + lint-staged with git hooks
- **CI/CD**: GitHub Actions (sharded test runs, linting, typechecking, security smoke tests)
- **Release Management**: Changesets for versioning and changelogs
- **Documentation**: VitePress for bilingual docs (English/Chinese)
- **Nix**: Flake-based build and dev shells for reproducible environments

### Key Architecture Components

1. **Agent Core Engine** (`packages/agent-core-v2`): The main agent engine with DI × Scope architecture (App/Workspace/Session/Agent scopes)
2. **KAP Server** (`packages/kap-server`): NightHawk server exposing REST + WebSocket APIs
3. **LLM Abstraction** (`packages/kosong`): Provider-agnostic LLM integration (OpenAI, Anthropic, Google, DeepSeek)
4. **Execution Environment** (`packages/kaos`): File/process abstractions for local/remote execution
5. **Security Engine**: 116 vulnerability rules, secret scanning, taint analysis (production code in `packages/agent-core/src/tools/builtin/security/`)
6. **Terminal UI** (`packages/pi-tui`): Component framework for the TUI
7. **Client SDK** (`packages/klient`): Contract-driven facade over agent-core-v2

## Working Principles

- Think from first principles. Start from real requirements, code facts, and verification results; if the goal is unclear, discuss it with the user first.
- Treat code, not documentation, as the source of truth. Unless the user explicitly says otherwise, do not read ordinary Markdown just to understand the implementation.
- Before making code changes, read the relevant code and the most recent constraints, and follow the nearest `AGENTS.md` in the directory tree.
- Keep changes focused. Do not slip in unrelated refactors along the way.
- When committing, do not add any co-author attribution, and do not reveal the identity of the agent in commit messages, PR descriptions, or any explanatory text.

## Constraint Files

Every source/engineering directory has a local `CONSTRAINTS.md` (root, packages, apps, src, test, scripts, build, docs, plugins, reports, .github, .agents, .changeset, plan, project-encyclopedia). Before modifying files in a directory, read its `CONSTRAINTS.md` and follow it as hard rules. If `CONSTRAINTS.md` conflicts with this file or another instruction, stop and report the conflict instead of silently choosing one.


## Project Map

### Applications
- `apps/nighthawk`: The CLI / TUI application. It consumes core capabilities through `@nighthawk/nighthawk-sdk` and must not depend directly on `@nighthawk/agent-core`. When writing or modifying its terminal UI, use the `write-tui` skill (`.agents/skills/write-tui/SKILL.md`).
- `apps/vscode`: VS Code extension for NightHawk.
- `apps/nighthawk-inspect`: Web inspector for the kap-server `/api/v1/debug` RPC surface — workspace/session browser, per-session transcript chat, per-scope Service panels, and the DI unit inspection view. See `apps/nighthawk-inspect/AGENTS.md`.
- `apps/vis`, `apps/vis/server`, `apps/vis/web`: Visual debugging tools for sessions and replays.
- the browser web UI: **Its source no longer lives in this repo.** It is developed in the code-app repo (`apps/web`) and shipped as the committed, prebuilt bundle `apps/nighthawk/dist-web` (gitignored, force-added), synced from code-app with `NIGHTHAWK_REPO=<this checkout> pnpm run sync:web` — sync and commit the bundle in the same change whenever the web UI should ship differently. `apps/nighthawk/scripts/check-web-assets.mjs` guards packaging against a missing bundle. To hack on the web UI against this repo's server, run `pnpm dev:server` here and point code-app's `pnpm dev:web` at it via `NIGHTHAWK_SERVER_URL`.

### Core Packages
- `packages/agent-core`: The unified agent engine (v1), including Agent, Session, profile, skills, tools, plan, permission, background, records, the in-process DI service layer (`src/services/`), and other core capabilities. See `packages/agent-core/AGENTS.md`.
- `packages/agent-core-v2`: The DI × Scope agent engine (v2, the current version behind kap-server). Four `LifecycleScope` tiers — `App` / `Workspace` / `Session` / `Agent` (`app/scopes.ts`) — plus the L3 unit layer (`Service`/`Fiber` units, collection contribution points, the Feature seam in `src/features/`); there is no App-level session lifecycle facade — callers compose `ISessionIndex` → `IWorkspaceLifecycleService.handlerFor` → the handler. See `packages/agent-core-v2/AGENTS.md` and use the `agent-core-dev` skill (`.agents/skills/agent-core-dev/SKILL.md`) when developing here.
- `packages/kap-server`: The NightHawk server, backed by `@nighthawk/agent-core-v2`; exposes sessions over REST + WebSocket (`/api/v1` + `/api/v1/ws`), plus the `/api/v1/debug/*` reflection RPC surface (`--debug-endpoints`, loopback bind + bearer auth). See `packages/kap-server/AGENTS.md`.
- `packages/klient`: The client SDK — a contract-driven facade over agent-core-v2 (`global.*` / `session(id).*` / `agent(id).*`, zod-validated); transport via subpath entry (`@nighthawk/klient/ipc|memory`, both return the same `Klient`); also hosts the e2e suites. See `packages/klient/AGENTS.md`.
- `packages/node-sdk`: The public TypeScript SDK and harness (`@nighthawk/nighthawk-sdk`).
- `packages/kosong`: The LLM / provider abstraction layer — OpenAI, Anthropic, Google, DeepSeek, and compatible protocols.
- `packages/kaos`: The execution environment and file/process abstractions over local or remote hosts.
- `packages/oauth`: OAuth and managed auth utilities for multiple providers.
- `packages/telemetry`: Shared client-side telemetry infrastructure.
- `packages/transcript`: The isomorphic transcript rendering data layer — L1 agent-granular store, L2 idempotent operations, L3 `off/turn/block/delta` subscription granularity, L4 framework-free view registry, plus turn-cursor pagination. Pure TypeScript (browser-safe, no engine imports); the sole owner of the transcript contract types (`src/contract/`) and the op-batch sequencing contract. See `packages/transcript/AGENTS.md`.
- `packages/protocol`: Shared REST + WS protocol schemas (envelope, error codes, pagination, ws-control) for the nighthawk daemon.
- `packages/security-core`: Standalone security engine sources (rules, scanner, secrets, taint). **Deprecated** — production security engine lives in `packages/agent-core/src/tools/builtin/security/`; this package is retained for reference only and is not imported by any other package.
- `packages/minidb`: Embedded JSON document store (`MiniDb`) behind kap-server's search index — snapshot + WAL persistence with an exclusive write lock, a larger-than-RAM full-text layer, and persistent index generations. See `packages/minidb/AGENTS.md`.
- `packages/pi-tui`: The pi-style terminal UI component framework powering the TUI. See `packages/pi-tui/AGENTS.md`.
- `packages/tree-sitter-bash`: A pure-TypeScript bash parser (no runtime deps, no wasm); `parse(source, { timeoutMs, maxNodes })` runs under a deterministic budget and returns a discriminated `ParseResult` — callers must treat aborted/hasError trees as "cannot analyze" and degrade. Parser only, no safety judgments; see the package README's "Known differences" section.

### Supporting Packages
- `packages/acp-adapter`: ACP adapter.
- `packages/acp-server`: ACP server.
- `packages/migration-legacy`: Migration tools for legacy systems.

## Environment Requirements

- **Node.js**: `>=24.15.0` (from the root `package.json` `engines`; `.nvmrc` is `24.15.0`, used by nvm / fnm / mise to pick the minimum recommended version).
- **pnpm**: `10.33.0` (from the root `package.json` `packageManager`).
- `pnpm install` will fail when the Node version is not satisfied, because `.npmrc` sets `engine-strict=true`.

## Monorepo Workspace Maintenance

- `pnpm-workspace.yaml` is the source of truth for workspace membership, but `flake.nix` also contains **hardcoded** `workspacePaths` and `workspaceNames` lists.
- **Whenever you add or remove a workspace package, you MUST update both `pnpm-workspace.yaml` and `flake.nix` — for every package, including leaf / test / e2e packages that nothing depends on.**
  - `pnpm-workspace.yaml` uses globs (`packages/*`, `apps/*`), so most packages land there automatically; `flake.nix` is fully manual and is where omissions happen.
  - Missing a path in `flake.nix`'s `workspacePaths` will silently drop files from the Nix build's `src` fileset.
  - Missing a name in `flake.nix`'s `workspaceNames` will break `pnpmConfigHook` because dependencies for that workspace will not be fetched.
- The automated "Check flake.nix workspace sync" (`scripts/check-nix-workspace.mjs`) only validates the transitive dependency **closure of `@nighthawk/nighthawk`**. A leaf package outside that closure (e.g. an e2e package nobody imports) slips through even when it is missing from `flake.nix`. A green check is therefore NOT proof that `flake.nix` is fully in sync — keep it updated by hand on every add/remove, do not rely on the check to catch omissions.

## General Coding Rules

- `packages/agent-core-v2`, `packages/kap-server`, and `packages/transcript` are comment-free zones: no line/block comments; the exceptions are JSDoc attached to exported symbols and load-bearing lint-suppression directives (`oxlint-disable` / `eslint-disable`), while other tooling directives (`@ts-expect-error`, …) stay banned. Enforced by `scripts/check-no-comments.mjs`, which runs as part of `pnpm lint`.
- For optional object properties, pass `undefined` directly instead of using conditional spread.
  - YES: `{ user }`
  - NO: `{ ...(user ? { user } : undefined) }`
- Optional object properties do not need to additionally allow `undefined` in the type.
  - YES: `interface Options { user?: User }`
  - NO: `interface Options { user?: User | undefined }`
- Internal methods with only a single parameter should not be turned into options objects just for stylistic uniformity.
- Except for a package's `index.ts`, other `index.ts` files should prefer `export * from './module';`.
- Do not add too many new test files. Prefer adding tests to the existing test file of the corresponding component or module.
- When a test fails because of a user modification, default to fixing the test first; do not change the implementation to satisfy an old test unless the implementation truly has a bug.
- Do not sacrifice code quality for external compatibility unless the user explicitly asks for it. Breaking changes go through changesets and a `major` bump, gated by the rule below.

## Experimental Features

- Gate a not-yet-public feature behind an experimental flag. Flags are env-driven and default off: `NIGHTHAWK_EXPERIMENTAL_<NAME>` toggles one, `NIGHTHAWK_EXPERIMENTAL_FLAG` enables all. Release by flipping the entry's `default` to `true`.
  - `packages/agent-core` (v1): add the flag to the central registry at `packages/agent-core/src/flags/registry.ts`, then check it with `flags.enabled('my-feature')`.
  - `packages/agent-core-v2` and kap-server modules: there is no central catalog — declare the flag in the owning domain via `registerFlagDefinition` at import time (see `packages/agent-core-v2/docs/flag.md`), then check it with `IFlagService.enabled(id)`. Current search-index-separation flags: `persistence_minidb_readmodel` (session read model, default on) and `search_worker` (global search worker host, default on).

## Where to Update Instructions

- Hard rules that affect almost every task: update the root `AGENTS.md`.
- Rules that only affect a specific directory: update the nearest sub-directory `AGENTS.md`.
- Project-map entries stay at 1–2 sentences; deep package docs live in the package's own `AGENTS.md`.
- Keep instruction updates focused and supported by code facts.

## Workflow Requirements

- Prefer `rg` / `rg --files` when reading code.
- When designing changes, follow existing boundaries and local patterns first.
- In public text and test data, replace real internal identifiers with neutral placeholders such as `example.com`, `example.test`, and `YOUR_API_KEY`. Before opening a PR, ask a read-only agent to audit the diff for context-specific internal identifiers.
- When creating a PR, the PR title must follow Conventional Commit style, e.g. `chore: remove legacy format commands`.
- When an AI agent opens or updates a PR, fill in `.github/pull_request_template.md` — link the related issue or explain the problem, then describe what changed. Do not leave placeholder text or submit a generic summary of the diff.
- Do not submit vague AI-generated PR text. The human author must understand the change well enough to explain the code, edge cases, and why the approach fits this repository.
- After finishing a task and before submitting a PR, you must run the `gen-changesets` skill (see `.agents/skills/gen-changesets/SKILL.md`) and generate a changeset under `.changeset/` according to its rules.
- Changesets must strictly follow the rules in `.agents/skills/gen-changesets/SKILL.md`: write one short user-facing sentence that states only what changed, and skip any change users cannot perceive.
- When generating a changeset, **never** decide on a `major` bump on your own — stop, explain, and get explicit user confirmation first; default to `minor`, fall back to `patch`. See `.agents/skills/gen-changesets/SKILL.md`.
- Prefer importing via `import ... from '#/...'`, which serves the same purpose as `import ... from '@/...'`.
- Do not commit throwaway scratch or exploratory files. Never stage:
  - Agent working notes or handoff/summary documents (e.g. `HANDOVER-*.md`, `HANDOFF-*.md`, `handoff.md`).
  - Throwaway UI/UX prototypes or design mockups (e.g. `*-designs.html`, `*-mockup.html`, `*-demo(s).html`) at the repo root or under a `design/` folder. The only tracked `.html` files should be Vite `index.html` entrypoints.
  Before committing or opening a PR, run `git status` and `git diff --staged --stat` and remove anything matching these patterns. Put scratch work under `.tmp/` (gitignored) instead of the repo root or the source tree.

## Release and CI/CD Pipeline

Every push to `main` triggers:
1. **Docs Deploy**: Builds and deploys VitePress docs to GitHub Pages.
2. **Manual Native Bundle**: Builds native binaries for all 6 platforms (linux-x64, linux-arm64, darwin-x64, darwin-arm64, win32-x64, win32-arm64), uploads to GitHub Release, updates Homebrew formula at `AliceGoto/homebrew-nighthawk`.

### Release Process
1. Create a changeset via `pnpm changeset` (or `gen-changesets` skill).
2. Push to main. The Release workflow will create a Release PR.
3. Merge the Release PR. Changesets publishes packages and triggers native builds.
4. The native builds upload binaries to the GitHub Release.
5. The Homebrew formula is updated automatically.
6. Docs are deployed automatically.

### Manual Native Build
```sh
gh workflow run "Manual Native Bundle" --repo AliceGoto/nighthawk --ref main -f release-tag=v0.41.0
```

### Homebrew Installation
```sh
brew tap AliceGoto/nighthawk
brew install nighthawk
```

## Build and Development Commands

### Essential Commands

```sh
# Install dependencies (requires Node.js >= 24.15.0, pnpm 10.33.0)
pnpm install

# Build all packages
pnpm run build

# Build only packages (not apps)
pnpm run build:packages

# Build the CLI/TUI application
pnpm -C apps/nighthawk run build

# Development mode
pnpm run dev:cli          # Run CLI in dev mode
pnpm run dev:server       # Run server in dev mode
pnpm run dev:kap-server   # Run KAP server in dev mode

# Testing
pnpm run test             # Run all tests with vitest
pnpm run test:watch       # Run tests in watch mode
pnpm run test:coverage    # Run tests with coverage

# Linting and Formatting
pnpm run lint             # Run oxlint + repo guards
pnpm run lint:fix         # Auto-fix lint issues

# Type checking
pnpm run typecheck        # Build packages first, then typecheck all

# Package validation
pnpm run lint:pkg         # Run publint and attw for package validation
```

### Package-Specific Commands

```sh
# Run tests for specific packages
pnpm -C packages/agent-core test
pnpm -C packages/agent-core-v2 test

# Run the CLI smoke test
pnpm -C apps/nighthawk run smoke

# Run e2e tests
pnpm -C apps/nighthawk run e2e

# Security engine smoke tests
node scripts/smoke-security.ts

# PI-TUI tests (uses node:test, not vitest)
pnpm --filter @nighthawk/pi-tui test
```

### Release Process

```sh
# Create a changeset
pnpm changeset

# Version packages (update changelogs)
pnpm run version

# Publish packages
pnpm run publish

# Full release process
pnpm run release
```

## Testing Instructions

### Test Structure

- **Unit Tests**: Located in `test/` directories within each package, using `.test.ts` or `.spec.ts` suffixes
- **E2E Tests**: Located in `apps/nighthawk/test/e2e/`, run with `pnpm run e2e`
- **Smoke Tests**: Custom scripts in `scripts/` directory for security and vendor validation
- **PI-TUI Tests**: Run separately with `node:test` (not vitest) via `pnpm --filter @nighthawk/pi-tui test`

### Running Tests

```sh
# Run all tests
pnpm run test

# Run tests for a specific package
pnpm -C packages/agent-core test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode during development
pnpm run test:watch
```

### CI Test Configuration

The CI runs tests in parallel shards (5 shards) for faster execution. Each PR triggers:
1. **Build job**: Builds all packages and runs CLI smoke test
2. **Test job**: Runs vitest across 5 parallel shards
3. **PI-TUI test job**: Runs the pi-tui test suite separately
4. **VS Code legacy test job**: Tests VS Code extension with legacy engine
5. **Lint job**: Runs oxlint and sherif checks
6. **Typecheck job**: Runs TypeScript type checking across all packages

### Writing Tests

- Prefer adding tests to existing test files rather than creating new test files
- When a test fails due to code changes, fix the test first unless the implementation has a bug
- Use vitest for unit and integration tests
- Security tools have dedicated smoke tests in `scripts/smoke-security.ts`

## Security Considerations

### Security Toolkit

NightHawk includes a comprehensive security engine with four main tools:

1. **SecurityScan**: 116 vulnerability rules across SQLi, XSS, command injection, path traversal, SSRF, deserialization, weak crypto, auth flaws, XXE, and per-language risks
2. **SecretScan**: Detects hardcoded credentials using patterns and Shannon-entropy scoring
3. **TaintTrace**: Variable-level taint tracking tracing user-controlled sources through assignment chains to dangerous sinks
4. **DepAudit**: Flags risky dependency patterns like unpinned versions

### Security Development Rules

- Run security smoke tests after any engine change: `node scripts/smoke-security.ts`
- The security engine production code lives in `packages/agent-core/src/tools/builtin/security/`; `packages/security-core` is deprecated and retained for reference only
- Security tools are exposed as first-class agent tools that can be invoked mid-session
- Findings carry CWE/OWASP IDs, severity levels, and bilingual fix suggestions

### Secure Development Practices

- **Workspace Trust**: The startup path must not spawn child processes by bare command name before the workspace trust gate to prevent binary planting attacks
- **Command Resolution**: Use `resolveCommandPath` from `src/utils/process/resolve-command.ts` to resolve external commands with absolute paths
- **Dependency Auditing**: Run `pnpm run sherif` to check for workspace dependency issues
- **CI Security**: GitHub Actions workflows run on pull requests and pushes to main with minimal permissions

## Available Skills for Development

The project includes specialized skills in `.agents/skills/` for common development tasks:

- **agent-core-dev**: Use when developing in `packages/agent-core-v2` — adding or modifying domain services, choosing lifecycle scopes, wiring DI dependencies
- **agent-core-review**: Use for code review and test guidance in `packages/agent-core-v2`
- **gen-changesets**: Use when generating changesets for releases
- **gen-docs**: Use for updating user documentation after code changes
- **write-tui**: Use when writing or modifying the terminal UI in `apps/nighthawk/src/tui`
- **translate-docs**: Use for translating and syncing bilingual documentation
- **sync-changelog**: Use after releases to sync changelogs
- **pre-changelog**: Use before release PRs to preview changelogs

## Code Style Guidelines

### TypeScript Configuration

- **Strict Mode**: Enabled with additional strict checks (`noUncheckedIndexedAccess`, `noImplicitOverride`, etc.)
- **Module System**: ES2024 target with bundler module resolution
- **Imports**: Prefer `import ... from '#/...'` pattern (maps to `./src/*.ts`)
- **Exports**: Package `index.ts` files should use `export * from './module'` pattern

### Linting Rules

- **oxlint**: Primary linter with TypeScript-aware rules
- **Comment-free zones**: `packages/agent-core-v2`, `packages/kap-server`, and `packages/transcript` have minimal comments (only JSDoc for exports and lint suppressions)
- **Optional properties**: Pass `undefined` directly instead of conditional spread
- **Error handling**: Use `only-throw-error` rule, throw Error objects not literals

### Formatting

- Auto-formatting via `pnpm lint:fix`
- Git hooks run lint-staged on commit
- Follow existing local patterns when lint rules don't cover style choices

## Monorepo Workspace Structure

### Package Organization

- **apps/**: Application packages (CLI, VS Code extension, web inspector, visual debugger)
- **packages/**: Core engine packages (agent core, server, SDK, utilities)
- **plugins/**: Plugin marketplace configuration
- **docs/**: VitePress documentation site
- **scripts/**: Build scripts, CI checks, and security smoke tests

### Dependency Management

- Workspace dependencies use `workspace:^` protocol
- Use `pnpm run sherif` to check for workspace dependency issues
- Changesets manage versioning and changelogs for releases
- CI validates package publishing with `publint` and `attw` checks

## Additional Notes

### Nix Build Support

The project includes a `flake.nix` for reproducible builds and development environments:
- **Dev shell**: Provides Node.js, pnpm, ripgrep, and fd
- **Package build**: Builds the native SEA (Single Executable Application) binary
- **Supported platforms**: x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin

### Editor Configuration

- `.editorconfig`: UTF-8, LF line endings, 2-space indentation, final newline
- `.oxlintrc.json`: Comprehensive linting configuration with TypeScript, import, unicorn, promise, and node plugins

### Security Verification

To verify a checkout:
```sh
pnpm lint                                  # oxlint + repo guards
pnpm -C packages/agent-core test           # engine + security tool tests
node scripts/smoke-security.ts             # security engine end-to-end
```
