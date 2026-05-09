---
title: "Dev-Only Docs"
description: "Documentation for capabilities that exist only in dev installs (not shipped to soma-beta end users). Surfaced by soma:docs.* when the docs/_dev/ directory is present."
section: "Dev"
order: 99
---

# `docs/_dev/`

Docs for caps and tools that ship only with **dev installs** of the Soma agent
runtime. End users (`soma-beta` tarball, npm `meetsoma` thin CLI) never see
this directory because it's excluded at release time.

## What lives here

Anything tied to `dev:*` caps (the agent-contributor namespace under the
`dev` meta-tool — `dev:hub.*`, `dev:kanban.*`, future `dev:release.*` etc.)
or to dev-only scripts under `scripts/_dev/`.

## How it's surfaced

`soma:docs.list` recursively scans the docs directory. When `_dev/` is
present, its entries appear in the listing under a **`Dev-only [dev install]`**
section. `soma:docs.guide {name: 'X'}` resolves first from `guides/`, then
falls back to `_dev/` — so `{name: 'kanban-audit'}` Just Works in either
context.

## How it's gated

**Filesystem presence.** End-user installs simply don't have this directory
(release pipeline excludes it). No code-level gating in the addon — if
the directory exists, the caps that live in it are real on this install,
so listing them is correct.

## Convention

Each doc here:
- starts with the same frontmatter shape as `docs/guides/` (`title`, `description`, `section`, `order`)
- includes a `<!-- tldr -->...<!-- /tldr -->` block (the `soma:docs.list` and
  `soma:docs.whats_new` surfaces extract this for one-line summaries)
- references the cap(s) it documents at the top, plus distribution notes
- mentions companion docs (`see also` section)

## Current contents

| Doc | What |
|---|---|
| `kanban-audit.md` | `dev:kanban.*` — triangulate ticket status (SHIPPED / STALE / STILL-VALID / NEEDS-REPRO / UNCLEAR / STALE-CROSS-PROJECT) from kanban + git + code + sessions + cross-project trees |
| `github-scanner.md` | `soma:github.*` v2 — 21 caps. API-mode for metadata + local-mode (tarball + soma-code shim) for navigation. Treat any remote repo as local. Use it before planning ANY work that overlaps with public OSS. |

(More land here as the dev-tier surface grows: `release-orchestrator.md`,
`hub-introspection.md`, etc.)
