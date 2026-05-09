---
title: "GitHub Scanner"
description: "soma:github.* — scan, map, diff GitHub repos without cloning. v2 added tarball + cache + soma-code shim: treat any remote repo as a local one. Use API-mode for metadata (releases, diff, stats); use local-mode for navigation (find/refs/blast/map across the whole repo)."
section: "Dev"
order: 30
---

# GitHub Scanner

<!-- tldr -->
21 caps covering two modes. **API-mode** (one-shot, no cache) for metadata: releases, diff between tags, stats, dependency lists, security audit. **Local-mode v2** (tarball + soma-code, full regex + DEF/USE/blast) for navigation: fetch repo tarball once (~1–5s), cache by SHA at `~/.soma/cache/gh/`, then run `soma-code` against the extract — gets you 12-language maps, full ripgrep regex, blast radius, DEF/IMP/USE refs, all on remote repos. **Use it before planning ANY work that overlaps with public OSS** — search similar codebases first, steal patterns, see how others solved it.
<!-- /tldr -->

## Why it exists

Two failure modes any agent runs into when surveying third-party code:

1. **"How does X solve this?"** — You want to look at one or three OSS implementations of the problem you're about to solve. Without cloning. Without rate-limit hell. Without scrolling github.com tabs by hand.

2. **"What changed in v0.4 → v0.5 of this dep?"** — Release notes are technical; you want files-changed + stats + commit log to decide whether to upgrade.

`soma:github.*` is the answer to both. The v2 architectural pivot (tarball + soma-code) is the answer to: *why was the old API-only approach hitting a ceiling?* Answer: per-file API calls don't scale, GitHub search is literal-only (no regex), no symbol index, no offline. Cache the whole repo once, then `soma-code` does the rest.

## Modes

### API-mode — metadata only

| Cap | What | When |
|---|---|---|
| `soma:github.stats` | stars, language, default branch, size, license | first-look card |
| `soma:github.structure` | top-level dirs + sizes (was the default first-probe) | quick survey |
| `soma:github.tree` | full recursive file list | when you need every path |
| `soma:github.releases` | last N releases with full changelogs | "what shipped in 1.5?" |
| `soma:github.diff` | files changed + insertion/deletion stats between two tags | "what's the upgrade surface from v0.4 → v0.5?" |
| `soma:github.compare` | commit log between two tags | "what commits landed?" |
| `soma:github.file_diff` | unified diff of one file between two tags | "what changed in `src/server.rs` last release?" |
| `soma:github.deps` | parse `Cargo.toml` / `package.json` deps | "what does this depend on?" |
| `soma:github.audit` | Cargo.lock vulnerability scan (semver-aware) | "is this safe to depend on?" |
| `soma:github.routes` | grep HTTP route registrations | "where are the endpoints?" |
| `soma:github.read` | read one file via raw URL | "show me `src/lib.rs`" |
| `soma:github.find` | code search via GitHub search API (literal-only) | quick keyword check |
| `soma:github.map` | function/struct/class index of one file | navigate one file |

### Local-mode v2 — fetch-once-then-soma-code

| Cap | What | Underlying tool |
|---|---|---|
| `soma:github.local_path({repo})` | fetch tarball + return cache dir path | `soma-github-cache.sh` |
| `soma:github.local_map({repo, file})` | function/struct/class map (12 languages: rs, ts/tsx, js/jsx, py, go, java, c/cpp, rb, sh, md, json, toml) | `soma-code map` |
| `soma:github.local_find({repo, pattern, path?, ext?})` | full ripgrep regex search across the cached repo | `soma-code find` |
| `soma:github.local_refs({repo, symbol, path?})` | DEF/IMP/USE classification across the cached repo | `soma-code refs` |
| `soma:github.local_blast({repo, symbol, path?})` | blast radius (files × ref count) for a symbol | `soma-code blast` |
| `soma:github.local_structure({repo, path?})` | file tree with sizes (richer than API once cached) | `soma-code structure` |
| `soma:github.cache_list()` | list cached repos + sizes + ages + SHA | `soma-github-cache.sh list` |
| `soma:github.cache_clean({days?, all?})` | evict by age (`--days N`) or wipe (`--all`) | `soma-github-cache.sh clean` |

### Why local-mode > API-mode when you're navigating

| Question | API-mode | Local-mode v2 |
|---|---|---|
| Map a Go repo's 30 files | fails (only knew rs/ts/py) | works (12 langs) |
| Regex search | not supported (literal-only) | full ripgrep |
| Symbol blast radius | not supported | works |
| DEF vs USE classification | not supported | works |
| Re-probe same repo | N more API calls | cache hit, 0 calls |
| Offline | broken | works after first fetch |
| Per-call latency (after first) | ~200ms-1s per file | sub-100ms |

## How

### First-look on a repo you've never seen

```ts
// 1. Get the card
soma:github.stats({repo: 'tokio-rs/tokio'})

// 2. See the surface
soma:github.local_path({repo: 'tokio-rs/tokio'})
// → ~/.soma/cache/gh/tokio-rs-tokio--abc123def456/   (5.3s on cold fetch)

// 3. Map the entry point
soma:github.local_map({repo: 'tokio-rs/tokio', file: 'tokio/src/lib.rs'})

// 4. Find something interesting
soma:github.local_find({repo: 'tokio-rs/tokio', pattern: 'spawn_blocking'})
```

### "How does X solve this?"

```ts
// You're about to write a graceful-shutdown signal handler. Look at how
// pingora does it before you plan.
soma:github.local_blast({repo: 'cloudflare/pingora', symbol: 'shutdown'})
soma:github.local_refs({repo: 'cloudflare/pingora', symbol: 'graceful_terminate'})
soma:github.local_map({repo: 'cloudflare/pingora', file: 'pingora-core/src/server/mod.rs'})
```

### "What's the upgrade surface for this dep?"

```ts
// Considering bumping tokio from 1.0 → 1.45.
soma:github.releases({repo: 'tokio-rs/tokio', count: 3})
soma:github.diff({repo: 'tokio-rs/tokio', tag1: 'tokio-1.0.0', tag2: 'tokio-1.45.0'})
// Top 30 files-changed with +/- stats. From there:
soma:github.file_diff({
  repo: 'tokio-rs/tokio',
  tag1: 'tokio-1.0.0', tag2: 'tokio-1.45.0',
  file: 'tokio/src/runtime/mod.rs'
})
```

### "Is this dep safe?"

```ts
soma:github.audit({repo: 'uutils/coreutils'})
// → 525 deps in Cargo.lock; semver-aware scan against known-vulnerable
//   crate+version pairs (chrono <0.4.31, regex <1.5.5, hyper <0.14.18,
//   openssl <0.10.48, tokio <1.18.3). Output: ✅ or list of flagged crates.
```

## When NOT to reach for this

- **Repos you have a local clone of** — use `soma:code.*` directly on the local checkout. Local-mode is for repos you DON'T have on disk.
- **Tiny one-line probes** — `curl raw.githubusercontent.com/<repo>/<branch>/<file>` is faster than fetching a tarball if you only need one file once. (`soma:github.read` does this for you.)
- **Private repos that don't allow tarball downloads** — set `GITHUB_TOKEN` (or have `gh auth login` configured); v2 falls back to `gh auth token` automatically.

## Anti-patterns

- ❌ Re-probing the same repo via API caps when local-mode is available — every probe is a new API call against your 5000/hr budget. Use `local_*`.
- ❌ Forgetting to clean the cache — by default repos accumulate forever. Run `soma:github.cache_clean({days: 30})` periodically. Or set up a cron via `soma-github-cache.sh clean --days 30`.
- ❌ Treating `local_find` like API `find` — local accepts full Rust-flavor regex (you can write `'fn .*Buffer.*Read'`); API search is literal substring only.
- ❌ Calling `soma:github.map` for Go/Java/C++/Ruby files — the API map only knows rs/ts/py. Use `soma:github.local_map` for everything else.

## Cache layout & semantics

```
~/.soma/cache/gh/
  benbjohnson-ghfs--3db8676e8d6d/
    .soma-meta.json   # { owner, repo, sha, ref, language, fetched_at, size_bytes }
    cmd/ ghfs.go ghfs_test.go LICENSE README.md
  cloudflare-pingora--452813e6b4e0/
    ...
```

- **Key**: `<owner>--<repo>--<sha-prefix-12>`. Different SHAs = different cache entries. No mutation in place.
- **Re-probe semantics**: every `local_*` call resolves the current default branch's SHA via API, compares to cached. If unchanged → cache hit. If new commits upstream → re-fetch (correct staleness behavior).
- **Optimization to defer**: skip the SHA-resolve API call when cache is recent (e.g. <1h old). Today's warm probes are ~0.9s due to the resolve call. File when 3rd "this is slow on cold-cache miss" complaint lands.

## Distribution

- **API-mode caps**: bundled in soma-beta tarball (ship to all users via the agent install). Anyone with `soma` installed can call `soma:github.stats`.
- **Local-mode caps + cache scripts**: bundled (same). The implementation under the hood is `scripts/_pro/soma-github.sh` (compiled, obfuscated, ships) + `scripts/_pro/soma-github-cache.sh` (same).
- **`docs/_dev/github-scanner.md`** (this file): dev-only by convention. End users who run `soma:github.*` will see the cap descriptions in `dev(op='help', cap='soma:github.X')`. This guide goes deeper than the cap descriptions can — for **dev contributors writing more capabilities or adapting the pattern**.

## Scripts under the hood

- `scripts/_pro/soma-github.sh` v2.0.0 — main router. 13 commands + `local <subcmd>` shim.
- `scripts/_pro/soma-github-cache.sh` v1.0.0 — fetch / extract / cache management.
- `scripts/soma-code.sh` v3.1+ — the substrate that local-mode delegates to. Added Go/Java/C/C++/Ruby parsers in this arc; respects `SOMA_CODE_DEFAULT_EXT` env override (set automatically by the github shim from the cached repo's primary language).

## Carries forward

The pattern **fetch-once-then-local-tools** generalizes. Anywhere remote-as-API can become remote-as-tarball-then-local-toolchain — npm packages, PyPI, crates.io, Docker images, public S3 buckets. When the next "tool to scan X" request lands, this is the shape: cache by stable id, run existing local toolchain.

## See also

- [Code Navigator](../guides/code-navigator.md) — `soma:code.*` is what local-mode delegates to. Same toolkit, but locally.
- [Kanban Audit](./kanban-audit.md) — companion `_dev` cap; `dev:kanban.audit` was built in the same arc.
- `docs/whats-new.md` — agent-facing changelog (the v0.23.1 section covers the v2 pivot).
- `releases/v0.23.x/plans/github-tool-10x.md` — full plan for the v1 → v2 architectural pivot.
- `~/Gravicity/lab/code-tools/SOMA-CODE-FUTURE.md` — vision doc; the "fetch-once" pattern was seeded there.
