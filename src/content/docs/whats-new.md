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

## v0.27.1 — May 2026 (latest)

The "first end-to-end autonomous PR ship" patch. Cycles 16 + 17 land together: Sonnet's long-context wall now triggers warn/exhale BEFORE the wall hits, `/inhale` no longer double-injects preload, and `release-please` becomes the canonical ship pipeline.

### 🆕 New caps & workflows

- **`soma-dev delegate cycle <brief>`** — full implementation pipeline for any markdown brief (cycle.md, inbox/*.md, plans/*.md). Pipeline: `intern` (investigate, 80-call) → `intern` (build, 80-call) → `verifier` (25-call) → `pr_author` (30-call). Total ~215 tool calls / ~$2.50 per cycle. Outputs `/tmp/soma-cycle-investigation.md`, `/tmp/soma-cycle-impl-summary.md`, `/tmp/soma-pr-description.md`. Flags: `--no-pr`, `--no-verify`. Use this when `builder`'s 25-call default is too small for a multi-step cycle.
- **`/auto-breathe model-aware`** — NEW subcommand. The auto-breathe enum is now tri-state: `off` / `global` / `model-aware`. `model-aware` reads `ctx.model.id` and selects per-glob thresholds from `breathe.thresholds` map. Default install ships `model-aware`. Backward-compat: boolean still parses (true → "global", false → "off") via migration `breathe-tri-state-v0.27.0`.
- **`tokens_input` now includes cache_read** in `runDelegation()` results. Previously reported only the uncached delta (showing `tokens_input: 3` for repeated calls with stable prefix). New fields: `tokens_input_uncached` + `tokens_input_cached` for transparency. Was *NOT* a delegation-degraded bug — was a metric-display bug. The model received the full prompt all along.
- **`route.provide("preload:wasInjected", ...)`** — new route cap exposing whether `session_start`'s "new"/"resume" branch already injected the preload. `/inhale` post-await queries this and skips its own send if true. Available cycle-17+.

### 🔄 Behavior changes

- **Sonnet thresholds:** model-aware default for `*sonnet*` is `warnRange [28,33] / exhaleRange [34,50]` — fires BEFORE the empirical ~48% "extra usage required for long context" wall. Opus: `[60,74] / [75,90]`. Default fallback: `[50,64] / [65,85]`. If you're on Sonnet and were used to 50/70 thresholds, you'll see notifications much earlier now — by design.
- **`/inhale` no longer produces double preload** in rotated sessions. Previously, every `/inhale` triggered TWO preload-injection user messages (`[Soma Boot — rotated session]` from `session_start` + `[Soma Inhale — Loading Preload]` from `/inhale` post-await). ~8K tokens duplicated per rotation, verified across 10 sessions. Now: single inject from `session_start`, `/inhale` skips when `wasInjected=true`. Print-mode safety preserved (when `ctx.hasUI=false`, `/inhale` falls back to direct send).
- **Auto-breathe notify text changed:** `🪵 Auto-breathe: rotating at N%` → `🪵 Preload requested at N% — rotating after agent writes it`. Honest about the request-vs-rotation distinction. Other branch (preload-already-written, immediate `.rotate-signal`) keeps `Rotating — preload already written`.
- **`soma-release-ship.sh` now bumps `.github/.release-please-manifest.json`** in lockstep with `package.json`. Without this, release-please's view of "current version" stays stuck and the next push to dev files a confused PR (caught when v0.27.0 ship left manifest at 0.26.2 → release-please filed PR #18 "release 0.26.3" with conflicts everywhere).
- **Catch-block fallback in `/inhale` is race-safe:** the previous `catch (err)` block always sent the fallback preload regardless of state. Now checks `route.get("preload:wasInjected")` — if `session_start` already injected (rare race where `newSession()` throws AFTER emitting), catch suppresses its send.

### 🤖 Release flow now PR-driven (canonical)

**PRIMARY (cycle-17, v0.27.1+):** Push commits to dev with conventional-commit messages (`feat:`, `fix:`, `chore:`, etc.) → `release-please` GHA auto-files release PR with versioned CHANGELOG → review + amend the PR (move rich `[Unreleased]` narratives into `[X.Y.Z]` if release-please's auto-bullets are too thin) → merge → build dist + publish draft GH release + npm publish + force-push main + rsync.

**FALLBACK (high-stakes):** `soma-release-prepare.sh` (10 checklog gates) → `soma-release-ship.sh`. Use for major bumps, breaking changes, or mid-flight rescues. Both flows now bump the manifest in lockstep.

### 🐛 Bugs you can stop stepping around

- **`pr-check.yml` silent test-failure** — GHA's `bash -e {0}` shell exited the test loop on the first failing test BEFORE logging which one. Now uses `set +e` inside the loop + captures failed names + logs them at the end.
- **In-flight detection robustness** — 4 tests had brittle `chore(release): vX.Y.Z` regex that broke on release-please's `chore(dev): release X.Y.Z` format AND on amendment commits. Switched to NO-TAG-YET detection (`if package.json bumped to vX.Y.Z but no git tag v$PKG_VERSION exists, we're in-flight`). Robust against ALL release-commit shapes.
- **`test-preload-notify-state-machine` runtime-mirror gate** failed on CI runners (no `~/.soma/agent` install dir). Now skips on `CI=true` OR when install dir absent.
- **Release-please `Summarize` step bash-escape** — the PR JSON output contains parens (`v0.27.0...v0.27.1`) which broke `echo "... ${{ steps.release.outputs.pr }}"` interpolation. Moved interpolation to env block.

### 📁 New files / locations

- `.soma/cycles/audit-improve/16-model-aware-breathe-collapse/cycle.md` — full plan for tri-state + per-model thresholds.
- `.soma/cycles/audit-improve/17-rotation-mechanism-repair/cycle.md` — 5-bug rotation-mechanism audit + fixes.
- `migrations/phases/v0.26.2-to-v0.27.0.md` — the breathe-tri-state migration journal.
- 5 new test files: `test-breathe-tri-state.sh`, `test-breathe-migration.sh`, `test-breathe-model-thresholds.sh`, `test-breathe-warn-range.sh`, `test-breathe-exhale-once.sh`. 81 new test cases covering the tri-state + per-model paths.

### 🧠 Architecture notes worth knowing

- **`{{skills_block}}` is a transplant, not a duplicate.** `core/body.ts:775` extracts `<available_skills>...</available_skills>` from Pi's compiled prompt, then re-injects it into soma's templated prompt via the `{{skills_block}}` slot. Soma's compiled output FULLY REPLACES Pi's prompt (when Pi's is the default-shape — the normal case), so the slot is the ONLY copy of the skills XML in the final prompt. Removing the slot from `_mind.md` would lose skills entirely. (The earlier `muscle_digests` removal was different: muscle_digests was rendered by soma + ALSO injected by Pi compiler-prepend — a true double. Skills are not.)
- **Auto-rotation Path A (`.rotate-signal` + process re-exec) is canonical.** Per Pi types (`pi-coding-agent/dist/core/extensions/types.d.ts`), `newSession` lives on `ExtensionCommandContext`, not on the base `ExtensionContext` event handlers receive. The route cap `"session:new"` is therefore only registered when a user explicitly invokes `/breathe`/`/inhale`/`/auto-breathe` (`provideCommandCapabilities` runs from those handlers). Auto-breathe's `performRotation` falling back to `.rotate-signal` (Path A) is correct by design — Pi treats process re-exec as the safer auto-path. In-process Path B is a happy-path optimization available only after a command was invoked.

---

## v0.27.0 — May 2026

The "autonomous CI/PR pipeline" minor. Three layers ship together: nightly tests + auto-issue-filing + delegate-driven fix orchestration.

### 🆕 New caps & workflows

- **`soma-dev delegate <workflow>`** — multi-agent orchestrator. Workflows: `pr` (full PR pipeline), `pr-brief` (brief only), `ci-fix <url>` (issue → fix → verify), `changelog` (rich CHANGELOG), `doc-update`, `audit [tickets...]`. Composes `changelog_curator + pr_author + doc_writer + verifier` (or `issue_investigator + builder + verifier` for ci-fix).
- **`dev:issue.{create,list}`** — GitHub issues from inside soma sessions. `create` files structured nightly-failure issues with dedupe gate (skip if open issue exists for same failure).
- **`soma-dev check-phases`** — 30-second pre-release gate (upstream sync + tests + tsc) before the full 5-min `soma-release-prepare.sh`.
- **`soma-pr-brief.sh`** — generates structured PR brief (git-cliff CHANGELOG diff, affected files, semver bump type, docs to update, roadmap suggestion). Used as input to delegate workflows.
- **`{{pi_gap}}` body var** — reads `PI_UPSTREAM.md` at session start, injects live Pi version-gap into the system prompt. Updated by 6h GitHub Actions monitor.
- **3 new child role bodies** — `pr_author` (rich PR descriptions), `issue_investigator` (root-cause tracer for nightly failures), `changelog_curator` (rich `[Unreleased]` narratives, replaces auto-bullet noise).

### 🔄 Behavior changes

- **Pi 0.72.1 → 0.73.1 lockstep bump.** All 4 pi-* packages move together (`pi-coding-agent`, `pi-ai`, `pi-agent-core`, `pi-tui`). Bumping only one causes silent API mismatches.
- **`MODEL_ALIASES` reverted to 4-5** (NOT bumped to 4-6) — default-tier safety. Bumping aliases would silently force users onto 1M-context variants.
- **Nightly test failures auto-file GitHub issues** with `nightly-failure` label. Dedupe gate prevents floods. Issue body includes failing tests, error excerpts, Pi version, last 5 commits, and a fix brief for the next agent.
- **18 tests gained `CI=true` skip guards** — workspace/dist-dependent tests self-skip on CI runners.

### 🧰 Release flow consolidation

- Archived stale `soma-ship.sh`. Wired `soma-dev ship/release/beta` subcommands.
- `pr-check.yml` hardened: tsc typecheck job + changelog blocking + conventional-commit format validation.
- `cliff.toml` added — git-cliff configured for Keep-A-Changelog format from conventional commits (feat→Added, fix→Fixed, ci/chore/test filtered).
- `release-please` auto-trigger enabled on push to dev (proposes; release-please takes over as canonical in v0.27.1).

### 📁 New files / locations

- `PI_UPSTREAM.md` (auto-updated by 6h GHA) — live Pi version gap + flagged commits relevant to Soma (33 Pi API usages tracked).
- `tests/test-children-roles-exist.sh` — drift-prevention regression test: every `_run_role` reference in `delegate.sh` must have a matching `body/children/<role>.md`.

---

## v0.26.x — May 2026

Maintenance arc: cache-invalidation hardening, Pi runtime bump rehearsals, soma-github local-mode runtime ship gap fix, body audit + state slimming, anti-accretion discipline. Two reverted patches (SX-727 long-context, briefly enabled) that were rolled back when they broke a peer project billing wall — documented in `docs/anthropic-long-context.md` with the `anthropic.enableLongContext` opt-in setting as the durable replacement.

---

## v0.25.x — May 2026

The `/inhale` stale-ctx fix family + preflight update prompt + sentinel migrations made unconditional + body-template migration `mind-prepend-cleanup-v0.25.0` with backup safety + Pi-cruft startup warnings removed. Cycle 12 (preload notify state machine) shipped — transitions only fire once per state change (none→saved, saved→stale, stale→saved). `breathe:detail` cap added.

---

## v0.24.1 — May 2026

The "releases verify they actually completed" patch arc: protect the release pipeline from silently incomplete ships, and lock the cap-bus surface against accidental drift.

### 🛠 New tests you can run

- **`tests/test-release-completeness.sh`** — asserts CHANGELOG ↔ git tag parity, `dev` ↔ `main` ff-merge reachability, `dist/manifest.json` ↔ `package.json`, `npm/package.json` ↔ `package.json` (SX-659 collapsed train). Auto-runs in orchestrator Phase 1 (tests gate). If a previous release was incomplete, the next prepare fails CONFLICT-HARD before any new bump.
- **`tests/test-namespaced-caps.sh`** — static-analysis floor for the ~92-cap soma:/dev:/somaverse: bus surface. Per-family minimums, named-cap presence (18 specific from CHANGELOG), duplicate-registration detection, namespace hygiene. Catches accidental cap deletion or rename.

Both run as part of `npm test`; both fail loud if real drift exists.

### 🔄 Behavior changes

- **`soma-release-ship.sh` Step 7 now verifies post-pull** (was silent on failure). Reads `~/.soma/agent/package.json` after `git pull --ff-only` and asserts version matches `NEW_VERSION`; on mismatch prints diagnostic + manual fix path + exits 1. Fixes SX-722 (v0.24.0 silently shipped to npm with the runtime worktree stuck at v0.23.0 because pull failure was being swallowed).
- **`tests/test-doctor.sh`, `test-release-completeness.sh`, `test-release-surfaces.sh`, and `test-version-truth.sh` are now in-flight aware**: detect HEAD subject `chore(release): vX.Y.Z` and skip transient assertions during the ship window. Without this, `npm test` fails mid-ship because `dist/manifest.json` lags the bumped `package.json`. Re-run post-ship to confirm the assertion holds.

### 🧰 Workflows

- **Anti-accretion sweep** (governed by `amps/protocols/atlas.md` v1.1.0): when `body/STATE.md` exceeds 6KB, run an anti-accretion sweep — session-history paragraphs ("sNN-XXXXXX shipped...") belong in `memory/sessions/` and `memory/journal/`, not in STATE. STATE holds *current state + pointers*; history references the actual session log. Fired live s01-f1230f: cut `body/STATE.md` 18,148 → 5,513 bytes (-70%) without losing any current state.
- **Phase 6 (Reflect) step 4 expanded** (`releases/cycles/soma-dev/phases/6-reflect.md`): post-release body+state audit now mechanical. Run `soma:body.audit` (catches duplicate slot interpolations, lazy-frontmatter lies) + `soma:body.slots` (token budget per slot) + the size gate on STATE.md. Plus stale-state scan: pulse.md, _recent-lessons.md, ecosystem.md, journal.md "Latest".
- **In-flight test detection pattern** (for any future test asserting build artifacts or release-pipeline state): detect `chore(release): vX.Y.Z` HEAD subject; if matches, skip the transient assertion with a SKIP not FAIL. Re-run post-ship for verification. Pattern lives in `body/_recent-lessons.md § In-flight test detection`.

### 📁 New files / locations

- `body/STATE.md` frontmatter `governed-by: amps/protocols/atlas.md` field — makes the protocol discoverable from the file.
- `releases/v0.24.x/plans/cycle-cross-check-audit.md` — audit doc surfacing five Curtis-decision items from the cycle MAP cross-check (e.g., should `5-release.md` Steps 4-13 be split into orchestrator-internal vs human-action sections?).

### 🐛 Bugs you can stop stepping around

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
