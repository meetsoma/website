---
title: "Updating"
description: "How to keep Soma up to date across projects."
section: "Reference"
order: 20
---


<!-- UPDATE WHEN: update flow changes, doctor behavior changes, migration phases added -->
<!-- SEAMS: install-architecture.md, doctor.md, getting-started.md -->

How to keep Soma up to date across your projects.

## Checking for Updates

```bash
soma update          # Check for CLI and agent updates
soma --version       # Show current agent + CLI versions
soma doctor          # Project-level version check + health
```

`soma --version` shows both versions:
```
σ  Soma v0.11.2
   CLI v0.3.3
```

The **agent version** (v0.11.2) is your Soma runtime — extensions, protocols, body templates, the works. The **CLI version** (v0.3.3) is the thin npm package that bootstraps everything.

## Updating the Runtime

```bash
soma init
```

When Soma is already installed, `soma init` checks for updates and pulls the latest agent code. Your project files (`.soma/body/`, protocols, scripts) are never overwritten — only the global runtime at `~/.soma/agent/` gets updated.

If your project `.soma/` is behind the agent version, you'll see:
```
⚠ Project .soma/ is at v0.10.0, agent is at v0.11.2.
  Run soma doctor to check for updates.
```

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
soma init    # Re-runs install, fixes deps
```

### "Core git repo has issues"

The agent runtime at `~/.soma/agent/` is a git repo. If it gets into a bad state:

```bash
cd ~/.soma/agent
git status              # See what's wrong
git reset --hard HEAD   # Reset to last known good state
soma init               # Or just re-run init
```

### Version Mismatch

If `soma --version` shows an old agent version after updating:

```bash
soma init               # Pull latest agent code
```

The agent version comes from `~/.soma/agent/package.json`. If you're using a dev setup with symlinks, the version reflects your local repo.
