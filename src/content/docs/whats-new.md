---
title: "What's New for Soma"
description: "Agent-facing changelog: 'what NEW capabilities can I use, with just enough detail to use them.' Distinct from the technical CHANGELOG.md — this is action-oriented, dense, version-tagged, and tells YOU (the agent) which tools just landed and how to invoke them."
section: "Reference"
order: 2
---

# What's New for Soma

<!-- tldr -->
Read this when you wake up in a session that just ran `soma update`, or when starting fresh after a release. Each section is a version's *agent-actionable* surface: NEW caps you can call, behavior changes you should know, bugs you can stop stepping around. Not the technical commit log — that's `CHANGELOG.md`. This is the answer to *"what can I do now that I couldn't yesterday?"*.
<!-- /tldr -->

---

## How to read this

Each version section follows the same shape:

- **🆕 New caps** — agent-callable surfaces with one-line invocation hints. Format: `cap_name(args) → outcome`.
- **🔄 Behavior changes** — defaults flipped, conventions shifted. What you did yesterday may now be wrong.
- **🐛 Bugs you can stop stepping around** — known issues that are now closed.
- **📁 New files / locations** — useful paths the runtime now writes/reads.
- **🧰 Workflows** — new patterns worth muscle memory.

A `[dev]` tag = dev install only (build-excluded from soma-beta end-user tarball).

---

## v0.23.1 — April 2026 (latest)

The "audit + scan + remember" patch arc: tooling for auditing your own kanban, scanning third-party repos as if they were local, and protecting your input from auto-rotation.

### 🆕 New caps

#### Kanban audit `[dev]` — close the "is SX-N actually still open?" question
- `dev:kanban.audit({ticket: 'SX-N'})` → JSON verdict + evidence (verdicts: `SHIPPED` / `STALE` / `STALE-CROSS-PROJECT` / `STILL-VALID` / `NEEDS-REPRO` / `UNCLEAR`)
- `dev:kanban.audit_batch({tickets: [...]} | {all_open: true} | {all: true}, mode?: 'default'|'md'|'json'})` → grouped table or markdown for cycle docs
- `dev:kanban.audit_open()` → every non-✅ row in workspace kanban (one-shot)
- Backbone triangulates: kanban row + git log + `soma:code.*` + sessions/preloads + cross-project trees (somaverse/somadian/website)
- For high-stakes verdicts, follow with `soma:agent.delegate({role: 'verifier', background: true})` — independent second-opinion catches what heuristics miss
- Read first: `dev(op='help', cap='dev:kanban.audit')` or `docs/_dev/kanban-audit.md`

#### GitHub scanner v2 — treat any repo as local without cloning
- `soma:github.local_path({repo: 'owner/name'})` → fetch tarball + return extract path. Cache by SHA at `~/.soma/cache/gh/`. ~1–5s cold, instant warm.
- `soma:github.local_map({repo, file})` → function/struct/class map of any file (12 langs: rs / ts-tsx / js-jsx / py / go / java / c-cpp / rb / sh / md / json / toml). **API-mode `soma:github.map` only knew rs/ts/py — local mode is the upgrade.**
- `soma:github.local_find({repo, pattern, path?, ext?})` → full ripgrep regex (API search is literal-only). Auto-scopes to repo's primary language via meta.json `language` hint.
- `soma:github.local_refs({repo, symbol, path?})` → DEF/IMP/USE classification across the cached repo
- `soma:github.local_blast({repo, symbol, path?})` → blast radius (files × risk) for a symbol
- `soma:github.local_structure({repo, path?})` → faster + richer than API once cached
- `soma:github.cache_list()` / `soma:github.cache_clean({days?: N | all?: true})` → cache management
- Plus 5 API-mode caps that were missing from the addon but already in the script: `audit`, `releases`, `diff`, `compare`, `file_diff`

#### Soma docs got smarter
- `soma:docs.whats_new({version?, limit?: 3})` → THIS doc, version-scoped if asked
- `soma:docs.guide({name})` → resolves from `guides/` first, `_dev/` second. Convenience over `.show`.
- `soma:docs.list` now recursive (catches `guides/` and `_dev/`) and shows TL;DR per entry, grouped by section

### 🔄 Behavior changes

- **`breathe.auto` is now opt-in by default** (was on by default). Auto-rotation at 70% context was wiping user input mid-compose. If you want it back: set `breathe.auto: true` in `.soma/settings.json`. Existing installs are migrated once via `breathe-auto-off-v0.23.1` (recorded in new `settings.migrations[]` array; respects re-enable).
- **`soma init` now writes the correct version** to `.soma/settings.json`. Pre-fix it stamped 0.10.0 because the package.json walk-up only walked one level. Fresh inits + repaired existing installs.
- **`soma update`** auto-detects your remote name (was hardcoded to `origin`; broke on dogfood worktrees with `meetsoma` remote).
- **`soma doctor`** persists version bump even when `fixes==0` (was printing "version bumped" without writing settings.json).

### 🐛 Bugs you can stop stepping around

- **`/inhale` stale-after-reload** — extension code that captured `pi.sendUserMessage` went stale after session rotation. Now consumes `route.get("message:send")` for fresh closure. Pattern: any `pi.X` consumed across rotation should go through soma-route's capability bus. See `amps/muscles/internal/route-plumbing-first.md`.
- **`soma:code.find` returned 0 results silently** when `ext` was passed without `path` (positional CLI shifted ext into path slot). Cap now defaults `path` to `.` when ext is set.
- **GitHub script silently 404'd on master-default repos** — `BRANCH=main` was hardcoded. v2 auto-detects via `default_branch` API field, falls back to `main` only on API failure.
- **GitHub script `--help` ran `structure` on a repo named `--help`** — now short-circuits to usage block.

### 📁 New files / locations

- `~/.soma/cache/gh/<owner>--<repo>--<sha>/` → GitHub tarball cache. `.soma-meta.json` per entry with `{owner, repo, sha, ref, language, fetched_at, size_bytes}`.
- `.soma/settings.json` now has `migrations: []` array — list of one-time semantic migration IDs that have been applied. The runtime appends to this; you don't typically write to it.
- `docs/_dev/` `[dev]` — dev-only docs subdir, surfaced by `soma:docs.list` when present.

### 🧰 Workflows

- **End-of-arc kanban sweep:** `dev:kanban.audit_open()` before cutting a release. Closes 3–4 wrongly-marked tickets in seconds; spawns verifier delegations for the high-stakes ones. (Used to close SX-588 / SX-589 / SX-642 in s01-236eb4.)
- **Survey a third-party repo without cloning:** `soma:github.local_path({repo: 'owner/name'})` → returns cache dir → run anything against it. Map / find / blast / refs all work locally with full toolchain. ~5s one-time cost, then instant.
- **Soma-code env override:** `SOMA_CODE_DEFAULT_EXT="go,md"` (or any ext list) overrides cwd-marker auto-detect. Use when working in monorepo subdirs or pre-modules language repos that lack manifest files.

### 🛠 New scripts

- `scripts/_pro/soma-github-cache.sh` — tarball fetch + extract + cache management
- `.soma/amps/scripts/soma-audit-ticket.py` `[dev]` — single-ticket audit (Python; the heuristics engine)
- `.soma/amps/scripts/soma-audit-tickets.sh` `[dev]` — parallel batch wrapper (xargs -P 8)

### 📜 Plans referenced this arc

- `releases/v0.23.x/plans/github-tool-10x.md` — the soma-github v1 → v2 architectural pivot
- `releases/v0.23.x/plans/discovered-tools-body-injection.md` — the seed for self-discovering tool surface (Phase 0 done, Phase 1+ queued as SX-719)

---

## v0.23.0 — April 2026

The "release orchestrator + tree-hygiene" arc.

### 🆕 New caps

- `soma:agent.list({role: 'X'})` (SX-701) → filter children by role string. Stacks with existing `active_only`/`all`/`cleanup`. Useful when a parent has spawned multiple roles and wants to inspect just one cohort.

### 🔄 Behavior changes

- **Release orchestrator is now 10 gates** (was 8). New: **tree-hygiene** (Phase 0.5, SX-712) — halts on uncommitted state in `repos/agent/` other than `M CHANGELOG.md`. Prevents agent-spawned files leaking into ship. **website-readiness** (Phase 5.5) — calls `tests/test-release-surfaces.sh` for CHANGELOG ↔ roadmap.json drift.
- **Phase 4-ship.md and 4.5-audit.md are archived.** Their work is now inside `soma-release-prepare.sh` + `soma-release-ship.sh`.

### 📜 Plans referenced this arc

- `releases/RELEASE-FLOW.md` — current head (10 gates documented)
- Old phase docs: `releases/cycles/soma-dev/phases/_archive/`

---

## v0.22.x and earlier

For the technical commit-by-commit history, see `CHANGELOG.md` at the repo root or `https://soma.gravicity.ai/changelog`. This `whats-new.md` only goes back to v0.23.0 — versions older than that didn't have an agent-facing digest layer.

---

## Conventions for whoever maintains this

- **One section per release.** Latest at top. Version + month + a one-line tagline.
- **Density first.** Skip the "why" if a one-liner won't shrink the gain. Ship the "how to use it" — that's what an agent reads to pick up the new surface.
- **Tag dev-only.** `[dev]` after the cap name when it's only on dev installs.
- **Always include invocation hint.** `cap_name(args) → outcome`. The agent reads this and can call it on the next turn.
- **No commits.** Commits go in CHANGELOG.md. This file isn't generated from git; it's hand-curated for the *agent's* benefit. Treat it like a muscle: dense, action-oriented.
- **TL;DR up top** so `soma:docs.list` extracts a useful preview.
