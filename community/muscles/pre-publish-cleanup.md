---
type: muscle
status: active
topic: [publish, cleanup, release, preservation]
keywords: [cleanup, pre-publish, release, delete, remove, archive, preserve]
heat: 0
loads: 0
author: Soma Team
license: MIT
version: 1.0.0
created: 2026-03-09
updated: 2026-03-09
---

# Pre-Publish Cleanup — Muscle

<!-- digest:start -->
> **Pre-Publish Cleanup** — the default is preservation, not removal.
> Archive, move, gitignore. Deletion is the exception that requires justification.
> Every file that exists earned its place through work. Removing it destroys that history.
> Before any public release: move sensitive files, gitignore internal ones, keep tooling.
<!-- digest:end -->

## Principle

A file that works is history. A script that runs is memory. Deleting them doesn't clean up — it forgets. The question before publish shouldn't be *"what can I remove?"* but *"what here needs protection?"*

Three verbs, in order of preference:
1. **Keep** — it ships, it's useful, it stays
2. **Move** — it's sensitive or internal, relocate it (`.gitignore`, private repo, archive dir)
3. **Delete** — it's truly dead (broken, superseded, never ran)

Deletion requires a reason. "Cleanup" is not a reason.

## Before Publish

| Question | If yes → |
|----------|----------|
| Does it run? Does something call it? | **Keep.** It's tooling, not an artifact. |
| Does a test reference it? | **Keep.** Or you're creating a stale test. |
| Is it sensitive but useful? | **Move** to `.gitignore` or private location. |
| Is it superseded by a better implementation? | **Delete** — but name the replacement in the commit. |
| Is it a one-off exploration (logo drafts, concept art)? | **Archive** to a local dir, or delete with clear commit message. |

## Process

1. `git diff --stat` — see everything in scope
2. For each file, ask the questions above
3. `grep -rn "<filename>" tests/ src/` — check for references
4. Commit in categories: moves separate from deletions
5. Run all test suites after

## When NOT to Apply

This muscle is about pre-release cleanup, not day-to-day development. During active development, deleting experiments is fine. The heightened care kicks in when you're about to ship publicly.
