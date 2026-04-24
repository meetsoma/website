---
title: Browser Setup for Soma
description: Configure Soma to drive a browser via CDP — Chrome, Brave, Edge, Arc, Chromium, Firefox
status: preflight
updated: 2026-04-23
---

# Browser Setup

Soma can drive a real browser to automate web workflows — navigating, taking screenshots, extracting content, running scripts in page context. This works with any Chromium-family browser (Chrome, Brave, Edge, Arc, Vivaldi, Chromium) and Firefox v86+ with partial support.

> **Note:** Browser tools are part of `soma:browser.*` (Phase 2 of the namespaced-meta-tools arc). Available from v0.22.0 onward. Before that, use `browser_*` flat tools.

## Quick start

```bash
# 1. Launch your browser with CDP enabled
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/soma-chrome

# 2. Ask Soma to configure itself
soma browser setup
```

Soma auto-detects the port, reads the browser identity from `/json/version`, and writes the config to `~/.soma/settings.json`. You're set.

## Manual configuration

If auto-detect fails or you want a specific setup:

### 1. Launch the browser

Each browser needs `--remote-debugging-port=<port>` passed at launch. Standard convention is **9222**; Soma-managed Brave Beta uses **9333** to avoid conflicts.

**Chrome:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/soma-chrome
```

**Brave:**
```bash
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/soma-brave
```

**Edge:**
```bash
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/soma-edge
```

**Chromium / Arc / Vivaldi:** same pattern — `--remote-debugging-port=<port>` + `--user-data-dir=<path>`.

**Firefox v86+:** Enable `devtools.debugger.remote-enabled` in `about:config`, then launch with `--remote-debugging-port=9222`. Partial CDP support — expect some degradation (see § Firefox).

**Safari:** Not supported — no CDP implementation. Use a Chromium browser instead.

### 2. Tell Soma where to find it

Write to `~/.soma/settings.json`:

```json
{
  "environment": {
    "overrides": {
      "browserCdpHost": "localhost",
      "browserCdpPort": 9222
    }
  }
}
```

Or set env vars (override settings):

```bash
export SOMA_BROWSER_CDP_HOST=localhost
export SOMA_BROWSER_CDP_PORT=9222
```

### 3. Verify

```bash
soma browser status
```

Should report the browser name + open tab count.

## How it works

Soma uses the **Chrome DevTools Protocol (CDP)** to communicate with the browser. When you pass `--remote-debugging-port` at launch, the browser opens a WebSocket server on that port. Soma connects to it and issues CDP commands: `Page.navigate`, `Page.captureScreenshot`, `Runtime.evaluate`, etc.

No extension install, no browser restart needed after the initial launch — just keep the browser running while you use `soma:browser.*` caps.

## Config resolution order

Soma resolves the CDP endpoint in this order (highest priority first):

1. **Env vars** — `SOMA_BROWSER_CDP_HOST`, `SOMA_BROWSER_CDP_PORT`
2. **settings.json** — `environment.overrides.browserCdpHost`/`browserCdpPort`
3. **Soma-managed default** — `localhost:9333` (used by `soma` when it manages its own Brave Beta profile)

## Capability matrix

Soma's `soma:browser.*` caps work on all Chromium browsers identically. Firefox gets partial support; Safari needs a different adapter (not implemented).

| Capability | Chromium family | Firefox v86+ | Safari |
|---|---|---|---|
| `soma:browser.status` — show config + connectivity | ✅ | ✅ | ❌ |
| `soma:browser.tabs` — list open tabs | ✅ | ✅ | ❌ |
| `soma:browser.navigate` — open URL in active tab | ✅ | ✅ | ❌ |
| `soma:browser.screenshot` — capture viewport | ✅ | ✅ | ❌ |
| `soma:browser.links` — extract page links | ✅ | ✅ | ❌ |
| `soma:browser.console` — read console logs | ✅ | ⚠️ partial (events delivered differently) | ❌ |
| `soma:browser.evaluate` — run JS in page context | ✅ | ⚠️ some value types fail | ❌ |
| `soma:browser.accessibility` — accessibility tree | ✅ | ⚠️ partial tree | ❌ |
| `soma:browser.styles` — computed styles | ✅ | ⚠️ flaky | ❌ |
| `soma:browser.emulate` — device emulation | ✅ | ⚠️ mobile flag unreliable | ❌ |
| `soma:browser.performance` — perf metrics | ✅ | ❌ different API | ❌ |
| `soma:browser.new_tab` / `close_tab` / `activate_tab` / `version` | ✅ | ✅ | ❌ |
| `soma:browser.setup` — auto-configure | ✅ | ✅ | ❌ |
| `soma:browser.config` — show current config | ✅ | ✅ | ✅ (shows "unsupported") |

## Firefox

Firefox v86+ ships CDP via its Remote Debugging Protocol (RDP) compatibility layer. ~80% of CDP methods work; some return partial data or raise errors on edge cases.

**What works well:** status, tabs, navigate, screenshot, links, new_tab/close_tab/activate_tab/version.

**What's flaky:** console events (delivered via different event channel), evaluate (value-type serialization differs), accessibility (partial tree), styles, emulate (mobile flag inconsistent).

**What doesn't work:** performance (Firefox uses its own profiling API).

When a Firefox-degraded cap returns partial data, Soma adds a `warning` field to the response so the agent can reason about the limitation.

**Recommendation:** for production workflows, use a Chromium browser. Use Firefox for compatibility testing or when Firefox-specific behavior matters.

## Safari

Safari has no CDP implementation. It speaks WebDriver-BiDi (a different protocol) instead.

Soma doesn't currently support Safari. If you need Safari automation, file an issue — a WebDriver-BiDi adapter is tracked (SX-617) but implementation depends on user demand.

**Workaround:** install a Chromium browser for Soma's browser tools. Safari + Soma coexist fine on the same machine — just launch a different browser when you need automation.

## Troubleshooting

### `CDP unreachable at localhost:<port>`

Your browser isn't running with the flag. Relaunch:

```bash
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/soma-chrome
```

Or check if another process is holding the port:

```bash
lsof -i :9222
```

### `Port conflicts`

If port 9222 is taken, pick a different one:

```bash
chrome --remote-debugging-port=9223 ...
soma browser setup --port=9223
```

### `Browser auto-detected as <wrong>`

`soma browser setup` picks the first port that responds. If you have multiple browsers running with CDP, specify explicitly:

```bash
soma browser setup --host=localhost --port=9222 --no-probe
```

### Settings keep getting overridden

Env vars take precedence over `settings.json`. Unset them if you want the persisted config to win:

```bash
unset SOMA_BROWSER_CDP_HOST SOMA_BROWSER_CDP_PORT
```

## See also

- `soma tool --extensions` — full capability list
- `soma:browser.config` — show what's currently configured
- `~/.soma/settings.json` — all environment overrides documented in `configuration.md`
- Internal design: `releases/v0.22.x/v0.22.0/plans/namespaced-meta-tools/browser-config.md`
