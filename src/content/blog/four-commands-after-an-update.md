---
title: "Four Commands After an Update"
description: "soma update, soma doctor, soma model-sync, soma terminals prefer. The walkthrough for getting every project on the latest without thinking about it."
date: 2026-04-23T18:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["soma", "workflow", "doctor", "delegation", "tmux"]
draft: false
image: "/images/blog/og-four-commands-after-an-update.png"
---

Soma shipped v0.21.1. Here's what to actually run — start to finish — to get your CLI, your runtime, and every project on it.

If you have one Soma project and you ran `soma update` already, you're mostly there. If you have five projects, one of them is probably going to silently keep using yesterday's default model, and if you skipped the CLI bump, `soma update` may not even fetch the latest agent. The update flow has two layers; the per-project preferences have more.

These are the commands to run after any release. In order. Each one does a single thing you can verify.

## 0. `npm install -g meetsoma@latest`

**The CLI update.** `meetsoma` is the thin wrapper you invoke as `soma` — it hands off to the agent runtime under `~/.soma/agent/`. The wrapper lives in your npm global prefix. It updates separately from the runtime.

```bash
npm install -g meetsoma@latest
```

If `soma check-updates` told you `CLI stale`, or if `soma update` just went no-op on a release you know landed, this is the missing piece. The canonical one-liner from [docs/updating.md](https://meetsoma.ai/docs/updating) combines this with the next step:

```bash
npm install -g meetsoma@latest && soma update
```

Run the combined form when in doubt. It's idempotent — no harm running it when both are already current.

## 1. `soma update`

Pulls the latest runtime. Updates the `~/.soma/agent/` install from the `soma-beta` release tag. Nothing opinionated — just newer code.

```bash
soma update
```

Add `--yes` to skip the confirmation prompt if you're scripting it.

If the update notice told you there's a new release, this is the command that lands it — but only if your CLI is current enough to know about it. Hence Step 0.

## 2. `soma doctor`

Walks the project structure in your current directory. Checks that `.soma/` exists, that its version matches the runtime, that any declarative migrations (new settings keys, scaffolded template files) have been applied. Applies them if not.

```bash
soma doctor          # diagnose
soma doctor --fix    # auto-repair simple issues
```

The migration system is data-driven. Each release's migration MAP carries a `replay-until` threshold and a `## Doctor Actions` JSON block describing what to backfill. As long as your project version is below that threshold, `doctor` re-runs the map on every invocation — idempotently. You can run `doctor` ten times; it stops doing work once everything's caught up.

For multi-project cleanup:

```bash
soma doctor --scan
```

Finds all `.soma/` projects on disk and reports their versions.

## 3. `soma model-sync`

This is the new one (v0.21.1). It audits and syncs your `defaultModel` preference across scopes:

- `~/.soma/settings.json` (global)
- `<cwd>/.soma/settings.json` (current project)
- Optionally, every `.soma/` dir under `$HOME` (`--crawl`)

Read-only audit:

```bash
soma model-sync
soma model-sync --crawl      # + crawl $HOME for other projects
```

Output legend: `✓` matches target, `?` no `defaultModel` set, `-` no `settings.json` at all.

Set the model everywhere:

```bash
soma model-sync --set claude-opus-4-7 --crawl --yes
```

`--yes` skips the confirmation prompt. Idempotent — second run is a no-op if everything's already aligned. Creates `settings.json` where one didn't exist, with just the `defaultModel` key. Preserves all unrelated fields in files that are already populated.

**Caveat:** resumed sessions (`soma -c`) keep whatever model was picked at creation. A fresh `soma` picks up the new default. Plan accordingly if you're in the middle of a long session you want to keep.

## 4. `soma terminals prefer`

If you use `delegate(background:true)` or `soma children spawn` — the background-delegation surface — this command picks which terminal driver handles the child. tmux is the shipping baseline.

```bash
soma terminals detect         # what's available, plus a recommendation
soma terminals prefer tmux    # persist to settings.json
soma terminals status         # confirm current driver
```

If tmux isn't installed, `soma terminals setup tmux` prints the install command for your platform. If it's installed but something's wrong, `soma terminals doctor tmux` runs the availability check, surfaces `tmux -V` + active sessions, and shows the test commands you can run manually to isolate the failure.

Same pattern as `model-sync`: read-only by default, explicit `prefer` to persist, idempotent.

## The whole update flow

```bash
npm install -g meetsoma@latest && soma update
soma doctor
soma model-sync --set claude-opus-4-7 --crawl --yes
soma terminals prefer tmux
```

Four lines. The first handles both layers of the runtime update. The next three reconcile every preference that should be consistent across projects. Every fresh session after this picks up the new CLI, the new agent, the new default model, and the configured driver.

**Check your state first** if you're unsure what needs updating:

```bash
soma check-updates
```

Prints a three-layer drift report (CLI / agent / workspace) with recovery hints per layer. No changes made — just tells you what to run.

## What these don't do

`model-sync` only touches `defaultModel`. It doesn't change other settings, doesn't prompt about auth, doesn't re-run migrations. `terminals prefer` only writes `delegate.terminal`. If you need auth (new machine, Claude Pro/Max) the init flow handles that separately — `soma init` has a four-choice menu including a Claude Pro/Max branch that walks you through `/login` inside the TUI. None of these four update-time commands will nag you about auth; if it's working, it's working.

If a project has customized settings you care about, both `model-sync` and `doctor` only touch the specific keys they're managing. They won't clobber your `compaction.enabled = false` or your `delegate.terminal = cmux` override.

## Source

- [`docs/updating.md`](https://meetsoma.ai/docs/updating) — the canonical update reference, including the three-layer drift model and the `soma check-updates` output
- `scripts/soma-model-sync.sh` — the model-sync CLI (bundled, ships in the install)
- `scripts/soma-terminals.sh` — the terminal driver CLI (bundled)
- [`docs/guides/sane-defaults.md`](https://meetsoma.ai/docs/guides/sane-defaults) — the full guide covering all three as a toolchain
- [`docs/guides/background-delegation.md`](https://meetsoma.ai/docs/guides/background-delegation) — the tmux-driver story for context
- `.soma/releases/v0.20.x/v0.21.1/release-notes.md` — everything that landed in v0.21.1

Four lines. Every project on the latest. No menu-driven install, no per-project hand-editing of `settings.json`, no remembering which Opus release is current or whether your CLI got the release announcement.
