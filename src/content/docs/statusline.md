---
title: "Statusline & Notices"
description: "The three-line footer, every indicator, and the toast notices Soma shows you — including the preload lifecycle."
section: "Reference"
order: 7.5
---

# Statusline & Notices

Soma renders a three-line footer beneath the prompt and surfaces short toast
notices for events worth knowing. This page is the canonical reference for
both — what each glyph means, and which notice fires when.

```
╭─ Opus-4.6─◉36%─$1.01─◷4:15─♥on
│  ⊚ main 🌿soma ¶12 📝saved
╰─ ~/project 5m33s +72-2
```

The statusline is rendered by `soma-statusline.ts`. Notices are emitted by
`soma-breathe.ts` (preload lifecycle) and `soma-guard.ts` (guards).

## Line 1 — model, context, cost, cache

`╭─ <model> ◉<context%> $<cost> ◷<cache-ttl> ♥<keepalive>`

| Glyph | Meaning |
|-------|---------|
| `<model>` | Active model (e.g. `Opus-4.6`), with thinking level appended (`• high`) when reasoning is on. |
| `◉<n>%` | Context window used. Yellow ≥ 50%, red ≥ 75%. |
| `$<n>` / `Free` | Session cost so far. `Free` when the model has no metered cost. |
| `◷<m:ss>` | Time left on the Anthropic prompt-cache TTL (5 min). The keepalive refreshes it. |
| `♥on` / `♥<n>` | Keepalive: `♥on` (dim) when idle, `♥<n>` (green) showing pings sent. Absent if keepalive is disabled. |
| `<n>inv` | Guard interventions this session (yellow > 0, red > 5). Only shown when non-zero. |

## Line 2 — session state

`│  <git> 🌿soma ¶<turns> [📋<session>] [📝<scratch>] [📝saved\|📝stale] [⚠ IDLE] [⬆ update]`

| Glyph | Meaning |
|-------|---------|
| `⊚` / `⊛` | Git: clean (`⊚` blue) or dirty (`⊛` yellow), followed by the branch. |
| `🌿soma` | Soma is active in this directory. |
| `¶<n>` | Turn count this session. |
| `📋<id>` | Session id (when shown). |
| `📝<n>` | Scratchpad note count. |
| **`📝saved`** | **A preload for this session is written to disk and will auto-load next session (green).** |
| **`📝stale`** | **A preload exists but ≥ 5 state-changing tool calls happened since (yellow) — consider `/exhale` to refresh.** |
| `⚠ IDLE <n>m` | No user input for ≥ 5 min while keepalives burn tokens. |
| `⬆ update` | A newer Soma version is available. |

The `📝saved`/`📝stale` indicator is **passive and persistent** — it reflects
the [preload lifecycle](#preload-notices) state every render. A *prior*
session's preload never shows green: only a preload written this session
(file mtime ≥ session start) lands as `saved`.

## Line 3 — location, runtime, restart signals

`╰─ <cwd> <runtime-branch> <uptime> <diff> [restart-tag]`

| Glyph | Meaning |
|-------|---------|
| `<cwd>` | Current working directory. |
| `(main)` | Runtime on plain stable `main` (dim). |
| `(main +dev)` | `main` with dev code synced in (yellow). |
| `(⚡dev)` / `(⚡detached)` | Runtime on the `dev` branch / a detached HEAD (red). |
| `<uptime>` | Session uptime. |
| `+<n>-<m>` | Uncommitted diff size (lines added / removed). |

**Restart tags** — appear when a change touches files the running session might
want to pick up. Each tells you exactly what to do:

| Tag | Trigger | Action |
|-----|---------|--------|
| `🔄 /reload` | `extensions/*.ts`, `core/*.ts` edited | Run `/reload` to re-import. |
| `⚠ sync dev + /reload` | A `reload`-class edit landed in a **different worktree** than the runtime loads from | `soma-dev sync dev`, then `/reload`. |
| `📝 /rebuild?` | `body/*.md` edited | **Optional** — only if you want it applied mid-session. Skip freely; preloads/journal/identity land naturally on fresh boot. |
| `⚠ relaunch` | `dist/*`, `core/*.js` (Pi's static imports, frozen at boot) | `/exit`, then `soma`. `/reload` can't help. |

## Preload notices

When you write a preload (via `/exhale`, `/breathe`, or a direct write of a
`preload-*.md` file), Soma confirms it **once** and validates it. The canonical
detector is the `soma-breathe.ts` `tool_result` handler, which drives the shared
preload lifecycle state machine; the statusline `📝saved` indicator and these
toasts read that one source.

| Notice | When |
|--------|------|
| `✅ Preload written: <file> (N lines)` | A preload was written — with line count and any recommended-section hints. |
| `✅ Preload updated: <file> (N lines)` | An existing preload was edited. |
| `⚠️ Preload missing required sections: …` | The preload lacks `## What Shipped` or `## Start Here`. |
| `⚠️ Preload is thin (N lines)` | Written but very short — add more detail for your next self. |
| `🟡 Preload now stale (N tool calls since save)` | ≥ 5 state-changing tool calls happened after the save — `/exhale` to refresh. |
| `📦 Archived N old preloads` | Older preloads (> 7 days) were cleaned up after the new one landed. |

> **One confirmation per write.** A single preload write produces exactly one
> confirmation toast (`✅`) plus the persistent statusline `📝saved` indicator —
> never a second "saved" toast. The `🟡 stale` warning is the only *transition*
> notice (nothing else surfaces staleness). This invariant is documented at the
> top of `extensions/_shared/preload-lifecycle.ts` and guarded by
> `tests/test-sx786-preload-notice.sh`.

At high context, the breathe extension also nudges you toward rotation
(`Context N% — preload saved, /breathe to rotate`). That's rotation *guidance*,
gated to fire once per threshold (50/70/80%) — distinct from the write
confirmation above.

## Related

- [Commands](/docs/commands) — `/exhale`, `/breathe`, `/inhale`, `/keepalive`, `/status`.
- [Sessions](/docs/sessions) — the preload + exhale cycle in depth.
- [Configuration](/docs/configuration) — context thresholds, keepalive, guard settings.
