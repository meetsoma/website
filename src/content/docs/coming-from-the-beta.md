---
title: "Coming from the beta?"
description: "What changed for soma-beta users: open source, a new repo, a fresh changelog at 0.50.0, and how to switch."
section: "First Steps"
order: 0.8
---

# Coming from the beta?

If you installed Soma before this release, here's what changed and how to move to meetsoma core.

## What changed

- **meetsoma core is open source now.** The runtime that used to live in a private repo now
  ships from `meetsoma/core` on GitHub.
- **The repo moved.** The agent runtime now lives at `meetsoma/core`, not the old private
  repo. `soma update` points at the new source automatically; you don't need to re-clone
  anything by hand.
- **Versions reset the count, not the history.** This release is `0.50.0`. The changelog for
  everything before it is preserved at [the legacy changelog](https://soma.gravicity.ai/docs/changelog-legacy/);
  the current changelog starts fresh from here.
- **Nothing in your projects changes.** Your `.soma/` directories, sessions, preloads, and
  identity files are untouched by any of this. This is a packaging and distribution change,
  not a data migration.

## How to switch

```bash
npm i -g meetsoma
soma update
```

The first command updates the CLI wrapper. The second pulls the current agent runtime into
`~/.soma/agent/`. Run `soma --version` afterward to confirm you're on `0.50.0`.

If you want to see exactly what each command does before running it:

```bash
soma update --help
soma check-updates   # status only, no changes
```

`soma check-updates` is the safe way to check what's behind without touching anything. See
[Updating & Migration](/docs/updating) for the full command reference.

## Questions this doesn't answer

For what meetsoma core actually is and what's free versus optional, see
[What is meetsoma core?](/docs/what-is-meetsoma-core). For the install flow in full, see
[Install Architecture](/docs/install-architecture).
