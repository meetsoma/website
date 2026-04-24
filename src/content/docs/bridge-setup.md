---
title: Bridge Setup for Soma
description: Configure the local Somaverse bridge daemon — lifecycle, config, connectivity
status: shipped-v0.22.0
updated: 2026-04-24
---

# Bridge Setup

The **bridge daemon** (`bridge.ts` from the Somaverse checkout) is the local
WebSocket relay that lets your TUI agent talk to:

- The **Somaverse workspace UI** (panes, channels, seams)
- **Chromium-family browsers** via CDP proxy (when you want the workspace to
  attach panes to browser tabs)
- **Somadian hub** (forwards workspace queries to the cloud when paired)

You don't need the bridge for basic soma use. You need it when:

- `somaverse:workspace.*` caps should work (panes, plugins, pairing)
- You want to drive a browser with workspace awareness (tab-to-pane linking)
- You're running the Somaverse UI locally on `:5173`

Without the bridge, `soma:browser.*` still works via direct CDP to your
browser's debug port (see [browser-setup.md](./browser-setup.md)).

## Quick start

```bash
# 1. Install somaverse (once)
#    — sibling repo or ~/somaverse checkout with builds/local/
#    — or set SOMA_SOMAVERSE_DIR to point at your checkout

# 2. Launch the bridge
soma bridge start

# 3. Verify
soma bridge status
# ✓ /health reachable on :18811
```

The first `soma bridge start` auto-detects your somaverse checkout (tries
a workspace-local dev path, then `~/somaverse/builds/local`, then
`~/.soma/somaverse`) and writes the path to `~/.soma/settings.json`
under `environment.overrides.somaversePath`.

## CLI reference

| Command | What |
|---|---|
| `soma bridge start [--port=P]` | Launch detached daemon. PID → `~/.soma/bridge.pid`, logs → `~/Library/Logs/soma-bridge.log` (macOS) or `~/.soma/bridge.log`. Default port: 18811. Idempotent if already running. |
| `soma bridge stop` | Graceful SIGTERM with 5s grace → SIGKILL fallback. |
| `soma bridge restart [--port=P]` | Stop + start. |
| `soma bridge status` | PID alive? + `/health` probe + port + log path + `What next:` hints. |
| `soma bridge logs [-nN] [--follow]` | Tail the log file. Default 50 lines. |
| `soma bridge config` | Show resolution order + paths + current config source (env/settings/default). |
| `soma bridge setup` | Auto-detect somaverse + persist to settings. Idempotent. |

## Agent-callable caps

If you're inside an agent session, the same surface is available via
`somaverse:bridge.*`:

| Cap | Matches CLI |
|---|---|
| `somaverse:bridge.status` | `soma bridge status` |
| `somaverse:bridge.config` | `soma bridge config` |
| `somaverse:bridge.setup` | `soma bridge setup` |
| `somaverse:bridge.start` | `soma bridge start` (supports `{port?}`) |
| `somaverse:bridge.stop` | `soma bridge stop` |
| `somaverse:bridge.restart` | `soma bridge restart` (supports `{port?}`) |
| `somaverse:bridge.logs` | `soma bridge logs` (supports `{lines?:50}`) |

Call via `somaverse(op='call', cap='somaverse:bridge.status')`. The meta-tool
routes to the addon; no cache bust per cap.

## How it resolves

The bridge source (Somaverse checkout) is located via this priority order:

1. **`SOMA_SOMAVERSE_DIR` env var** — highest priority, live (no settings read)
2. **`~/.soma/settings.json` → `environment.overrides.somaversePath`** — persistent, set by `soma bridge setup`
3. **`$HOME/<workspace>/somaverse/builds/local`** — dev workspace auto-detect (where `<workspace>` is your monorepo dir)
4. **`$HOME/somaverse/builds/local`** — user install auto-detect
5. **`$HOME/.soma/somaverse`** — future bundled install path

The port is resolved similarly:

1. **`SOMA_BRIDGE_PORT` env var**
2. **`~/.soma/settings.json` → `environment.overrides.bridgePort`**
3. **Default: 18811**

## Log rotation

Each `soma bridge start` rotates the existing log to `<log>.prev` before
truncating. Two log generations kept (current + prev). No cron / logrotate
needed.

## Pairing (separate from bridge lifecycle)

The bridge is one layer; pairing to the Somaverse hub is another. Pair once
via `soma login start` — this writes `~/.soma/device-key` (chmod 600) used by
`bridge-connect.ts` to authenticate against `api.somaverse.ai`.

See [login-setup.md](./login-setup.md) for pairing flow (or `soma login
--help`).

## Architecture layers

```
  TUI agent (extensions)
       │
       ▼
  somaverse:bridge.*  (caps — agent-side)
       │
       ▼
  soma bridge (CLI)   — lifecycle
       │
       ▼
  tsx server/bridge.ts  (daemon on :18811)
       │  ├─► CDP proxy → localhost:9333 (browser)
       │  ├─► WS relay ─► Somaverse UI (workspace client)
       │  └─► Hub client ► wss://somaverse.ai/bridge  (when paired via device-key)
       │
       ▼
  Somadian (cloud)    — workspace queries, plugin-state persistence
```

## Troubleshooting

### `soma bridge start` fails with "No somaverse checkout found"

Run `soma bridge setup` to auto-detect. If you have somaverse at a
non-standard path:

```bash
SOMA_SOMAVERSE_DIR=/path/to/somaverse/builds/local soma bridge setup
```

### `soma bridge status` shows healthy but workspace queries timeout

The bridge is alive but no workspace client is attached. Open the Somaverse
UI (typically `pnpm dev` in somaverse/builds/local, serves at
`http://localhost:5173`) and the UI's `bridgeClient` will register as a
workspace provider. Re-run `somaverse:workspace.status` after.

**Note:** today's `/health` returns `ok:true` as long as the process is
alive, regardless of whether a workspace client is paired. The split
`/health` vs `/ready` is tracked as
[SX-637](../.soma/releases/_kanban.md#somaverse--bridge).

### Port 18811 already in use

Either the bridge is already running (check `soma bridge status`) or another
process grabbed the port. Change via:

```bash
soma bridge stop
SOMA_BRIDGE_PORT=18812 soma bridge start
```

Or persist:

```bash
# edit ~/.soma/settings.json environment.overrides.bridgePort
```

### Bridge started externally (via `npm run bridge`) doesn't appear in `soma bridge status`

Status uses `~/.soma/bridge.pid` for liveness; externally-started daemons
have no PID file so status shows "no live process" even when `/health`
responds. Workaround: always use `soma bridge start` (writes PID) OR ignore
the PID and trust the `/health` line.

## Security notes

- **Pairing secret never in URL** — pre-v0.22.0 `soma login` sent the
  pair-secret in a query string; fixed to use the `X-Pair-Secret` header so
  it doesn't leak into nginx/Traefik/CloudFront access logs. See
  [SX-634](../.soma/releases/_kanban.md).
- **Device key stored with umask 077** — prevents the world-readable race
  between `open()` and `chmod 600`.
- **Bridge runs as your user** — no privilege escalation. Token auth is
  user-scoped via `~/.soma/device-key` + `~/.soma/somadian-token`.

## See also

- [browser-setup.md](./browser-setup.md) — CDP endpoint config (works without bridge)
- [`soma login`](./login-setup.md) — hub pairing (if exists; else `soma login --help`)
- Connection audit (internal): `.soma/releases/v0.22.x/v0.22.0/plans/connection-audit-s01-d7bdf0.md`
- Design doc (internal): `.soma/releases/v0.20.x/plans/vps-vs-local-state-2026-04-19.md`
