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

## v0.24.1 — May 2026 (latest)

The "releases verify they actually completed" patch arc: protect the release pipeline from silently incomplete ships, and lock the cap-bus surface against accidental drift.

### \U0001f6e0 New tests you can run

- **`tests/test-release-completeness.sh`** — asserts CHANGELOG ↔ git tag parity, `dev` ↔ `main` ff-merge reachability, `dist/manifest.json` ↔ `package.json`, `npm/package.json` ↔ `package.json` (SX-659 collapsed train). Auto-runs in orchestrator Phase 1 (tests gate). If a previous release was incomplete, the next prepare fails CONFLICT-HARD before any new bump.
- **`tests/test-namespaced-caps.sh`** — static-analysis floor for the ~92-cap soma:/dev:/somaverse: bus surface. Per-family minimums, named-cap presence (18 specific from CHANGELOG), duplicate-registration detection, namespace hygiene. Catches accidental cap deletion or rename.

Both run as part of `npm test`; both fail loud if real drift exists.

### \U0001f504 Behavior changes

- **`soma-release-ship.sh` Step 7 now verifies post-pull** (was silent on failure). Reads `~/.soma/agent/package.json` after `git pull --ff-only` and asserts version matches `NEW_VERSION`; on mismatch prints diagnostic + manual fix path + exits 1. Fixes SX-722 (v0.24.0 silently shipped to npm with the runtime worktree stuck at v0.23.0 because pull failure was being swallowed).
- **`tests/test-doctor.sh`, `test-release-completeness.sh`, `test-release-surfaces.sh`, and `test-version-truth.sh` are now in-flight aware**: detect HEAD subject `chore(release): vX.Y.Z` and skip transient assertions during the ship window. Without this, `npm test` fails mid-ship because `dist/manifest.json` lags the bumped `package.json`. Re-run post-ship to confirm the assertion holds.

### \U0001f9f0 Workflows

- **Anti-accretion sweep** (governed by `amps/protocols/atlas.md` v1.1.0): when `body/STATE.md` exceeds 6KB, run an anti-accretion sweep — session-history paragraphs ("sNN-XXXXXX shipped...") belong in `memory/sessions/` and `memory/journal/`, not in STATE. STATE holds *current state + pointers*; history references the actual session log. Fired live s01-f1230f: cut `body/STATE.md` 18,148 → 5,513 bytes (-70%) without losing any current state.
- **Phase 6 (Reflect) step 4 expanded** (`releases/cycles/soma-dev/phases/6-reflect.md`): post-release body+state audit now mechanical. Run `soma:body.audit` (catches duplicate slot interpolations, lazy-frontmatter lies) + `soma:body.slots` (token budget per slot) + the size gate on STATE.md. Plus stale-state scan: pulse.md, _recent-lessons.md, ecosystem.md, journal.md "Latest".
- **In-flight test detection pattern** (for any future test asserting build artifacts or release-pipeline state): detect `chore(release): vX.Y.Z` HEAD subject; if matches, skip the transient assertion with a SKIP not FAIL. Re-run post-ship for verification. Pattern lives in `body/_recent-lessons.md § In-flight test detection`.

### \U0001f4c1 New files / locations

- `body/STATE.md` frontmatter `governed-by: amps/protocols/atlas.md` field — makes the protocol discoverable from the file.
- `releases/v0.24.x/plans/cycle-cross-check-audit.md` — audit doc surfacing five Curtis-decision items from the cycle MAP cross-check (e.g., should `5-release.md` Steps 4-13 be split into orchestrator-internal vs human-action sections?).

### \U0001f41b Bugs you can stop stepping around

- **`soma-scrape.sh` lost fetched docs silently** when `_website/` dest dir didn't exist. Now `mkdir -p` before write. (`scripts/_pro/*` is gitignored from soma-beta release — dev/main only.)
- **`tsconfig.json` was type-checking `extensions/_archive/**`** — cleared 15 TS7006 errors from `_archive/sx594-flat-wrappers/`. `npm run check` now exit 0.

---

## v0.24.0 — May 2026

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
