---
title: "Updating"
description: "How to keep Soma up to date across projects."
section: "Reference"
order: 20
---


<!-- UPDATE WHEN: update flow changes, doctor behavior changes, migration phases added -->
<!-- SEAMS: install-architecture.md, doctor.md, getting-started.md, changelog.md -->

How to keep Soma up to date across your projects.

## Quick upgrade (the one-liner)

Most users want this:

```bash
npm install -g meetsoma@latest && soma update
```

**For scripts / CI:** add `--yes` to skip the update confirmation prompt:

```bash
npm install -g meetsoma@latest && soma update --yes
```

That's it. The first half updates the CLI wrapper (thin, ~100KB); the second half pulls the latest agent runtime (extensions, protocols, body templates) into `~/.soma/agent/`. Your project `.soma/` directories are never touched by either command — your customizations are safe.

After updating:

```bash
soma --version       # Verify the new version
soma doctor          # (Optional) check that your current project is compatible
```

If `soma doctor` surfaces a migration, run it — details in [Project Migration](#project-migration) below.

### When to use which command

- `npm install -g meetsoma@latest` — **CLI update only.** Updates the thin wrapper. Run when `soma check-updates` says `CLI stale`. Usually also needed alongside an agent update.
- `soma update` — **Agent runtime update.** Pulls the latest `~/.soma/agent/` (extensions, protocols, body templates). This is what you want 95% of the time.
- `soma doctor` — **Project migration.** Run INSIDE a project `.soma/` after updating the agent. Advances the per-project version marker and applies any migrations.
- `soma check-updates` — **Status only.** Three-layer drift report with recovery hints. No changes made. Run first if you're unsure what needs updating.

## Checking for Updates

```bash
soma check-updates   # Three-layer drift check (CLI / agent / workspace) + recovery hints
soma update          # Pull the latest agent code (runs a git pull + npm install)
soma --version       # Show current agent + CLI versions
soma doctor          # Project-level version check + health
```

### The three layers

Soma has three version markers that can drift independently:

| Layer | Source of truth | What drifts here |
|---|---|---|
| **CLI** (`meetsoma`) | `npm/package.json` at `~/.nvm/.../lib/node_modules/meetsoma/` | Thin-cli bootstrap — updated via `npm i -g meetsoma` |
| **Agent** (`soma-agent`) | `~/.soma/agent/package.json` | Runtime extensions, protocols, body templates, the works |
| **Workspace** (`.soma`) | `$PWD/.soma/settings.json:version` | Per-project migration marker |

`soma check-updates` reads all three and reports status per layer:

```
  Version snapshot:

  CLI (meetsoma)            v0.3.3        ⬆ stale (npm: v0.3.4)
  Agent (soma-agent)        v0.20.1.1     ✓ dev-ahead (npm: v0.0.1)
  Workspace (.soma)         v0.11.4       ⬆ marker lag — run `soma doctor` to advance

  Found some drift. Easy one.

  → CLI stale: run npm i -g meetsoma
  → Workspace marker behind agent: run soma doctor
```

**Statuses per layer:**
- `aligned` — local matches npm latest
- `dev-ahead` — local version higher than npm (dev builds)
- `stale` — local older than npm (update available)
- `marker-lag` — workspace marker older than agent (doctor advances it)
- `no-workspace` — not inside a `.soma/` project

Every drifted layer gets a matching recovery hint. No closed ends.

`soma --version` shows agent + CLI:
```
σ  Soma v0.20.1.1
   CLI v0.3.4
```

## Updating the Runtime

```bash
soma update
```

When Soma is already installed, `soma update` pulls the latest agent code and reinstalls dependencies if needed. Your project files (`.soma/body/`, protocols, scripts) are never overwritten — only the global runtime at `~/.soma/agent/` gets updated.

If your project `.soma/` is behind the agent version, `soma check-updates` shows `marker lag` on the Workspace row. Run `soma doctor` to resolve:

- If there's a migration phase file in the chain, doctor walks it (see [doctor.md](doctor.md)).
- If there's no migration needed but the marker is stale (common when several releases ship without schema changes), doctor silently advances the marker to the agent version. No action required.

## Updating the CLI

```bash
npm install -g meetsoma
```

The CLI updates independently. It's a thin wrapper — most functionality lives in the agent runtime, not the CLI.

## Project Migration

Each project has its own `.soma/` directory with a version in `settings.json`. When the agent version is ahead of your project version, some files may be out of date:

- **Body templates** (`_mind.md`, `_boot.md`, `_memory.md`) — structural templates that control prompt layout
- **Bundled protocols** — behavioral rules that ship with Soma
- **Bundled scripts** — utility scripts for development workflows
- **Settings shape** — new configuration keys added in newer versions

### What's Safe

Soma never deletes or overwrites your customizations:

- **Body content** (`soul.md`, `voice.md`, `body.md`, `journal.md`) — always yours
- **Custom protocols and muscles** — anything you wrote stays
- **Session logs and preloads** — your memory is preserved
- **Settings values** — existing preferences are kept, new defaults are added

### soma doctor

```bash
soma doctor              # Check current project
```

The doctor compares your project's `.soma/` against the current agent version and reports what's different. It runs a health check (Node.js, git, extensions, API key) alongside the version analysis.

### Extensions

If you have custom extensions in `.soma/extensions/`, updating the runtime won't touch them. Soma extensions are loaded from:

1. Project `.soma/extensions/` (your customizations)
2. Global `~/.soma/agent/extensions/` (bundled with Soma)

Project extensions always take priority. If a bundled extension changes in a new version, your project copy is unaffected — you can update it manually when ready.

## Troubleshooting

### "Runtime dependencies missing"

```bash
soma update  # Re-runs install, fixes deps
```

### "Core git repo has issues"

The agent runtime at `~/.soma/agent/` is a git repo. If it gets into a bad state:

```bash
cd ~/.soma/agent
git status              # See what's wrong
git reset --hard HEAD   # Reset to last known good state
soma update             # Or just re-run update
```

### Version Mismatch

If `soma --version` shows an old agent version after updating:

```bash
soma update             # Pull latest agent code
```

The agent version comes from `~/.soma/agent/package.json`. If you're using a dev setup with symlinks, the version reflects your local repo.
