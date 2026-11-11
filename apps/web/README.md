# @nighthawk/web

A standalone web client for the local NightHawk server. It talks to the same
REST and WebSocket API that `nighthawk web` exposes; it does not use the
prebuilt upstream web bundle.

## Run it

Terminal 1 — start the server:

```sh
nighthawk web --no-open --port 58627
```

Terminal 2 — start the client:

```sh
pnpm web:dev
```

Open the URL Vite prints, then paste the access token that `nighthawk web`
printed at startup (or append it as `#token=<token>`).

For a non-loopback or trusted-network setup the server can be started with
`--dangerous-bypass-auth`; the client then accepts any token string.

## What works today

- token gate, session list, new session with a working directory
- model selection grouped by provider, defaulting to `config.toml`'s
  `default_model` (DeepSeek in the current setup); the server requires an
  explicit model per session, so the client writes `agent_config.model` after
  creating one and reflects each session's own model on open
- message history over REST
- live streaming over `transcript.reset` / `transcript.ops`
- tool calls are shown from history after the turn completes
- stop the running turn

## Protocol notes

- WebSocket endpoint: `/api/v1/ws`, bearer token passed as the
  `nighthawk.bearer.<token>` subprotocol.
- Subscribe with `subscribe_v2` and `transcript: { '*': 'delta' }`;
  `{ '*': 'off' }` suppresses the transcript stream entirely.
- Live text arrives as `frame.upsert` plus `append` ops; `turn.upsert` with
  `state: completed` means the turn is done and history can be reloaded.
- The server sends `ping` every 10s; clients must reply with `pong` carrying
  the same nonce.
- A new session has no model; call `POST /api/v1/sessions/{id}/profile` with
  `{ agent_config: { model } }` before the first prompt.

## Not wired into the CLI yet

`nighthawk web` still serves the upstream bundle from `apps/nighthawk/dist-web`.
Serving this build instead is a follow-up: point the server's asset root at
`apps/web/dist` once the client covers approvals and questions.
