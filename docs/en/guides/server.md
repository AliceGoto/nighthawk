# Local Server and API

NightHawk CLI still ships a lightweight local web server via the `nighthawk web` subcommand: it serves the web UI from `dist-web/` and exposes an OpenAI-compatible proxy (`/v1/chat/completions` and `/v1/models`) that forwards requests to the local engine. The TUI `/web` command and the REST API (`/api/v1`) plus WebSocket event stream (`/api/v1/ws`) were removed — `nighthawk web` does not provide those programmatic surfaces.

The REST and WebSocket protocol reference remains documented on the [Server API](../reference/server-api.md) page for integrations that still target the removed server's interface.

## Inspecting sessions in the browser

For a lightweight way to follow a session in the browser, use the session visualizer:

```sh
nighthawk vis                 # start the visualizer and open the browser
nighthawk vis 01HZ...XYZ      # open a specific session
```

`nighthawk vis` starts a local server on `127.0.0.1` (an available port is picked automatically), prints the URL, opens the browser, and keeps running until you press `Ctrl-C`. It serves the session visualizer plus a set of inspection endpoints under `/api/sessions/...` — a viewing surface, not a replacement for the removed REST/WebSocket API: it cannot create sessions or submit prompts. For the full option list, see the [nighthawk command](../reference/nighthawk-command.md#nighthawk-vis) reference.

## Next steps

- [Server API](../reference/server-api.md) — full REST endpoint inventory, error codes, WebSocket events, and the transcript protocol
- [nighthawk command](../reference/nighthawk-command.md) — all `nighthawk` subcommands and flags
