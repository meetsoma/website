---
title: "Install Architecture"
description: "How Soma installs, updates, and manages versions — the full flow from npm to runtime."
section: "Reference"
order: 20
---

# Install Architecture

<!-- UPDATE WHEN: install flow changes, thin-cli.js updated, soma-beta structure changes -->
<!-- SEAMS: getting-started.md#install, updating.md, doctor.md, configuration.md -->

How `npm install -g meetsoma` becomes a working AI agent.

## The Two Layers

Soma has two independent packages that version separately:

| Layer | Package | Version | What |
|-------|---------|---------|------|
| **CLI** | `meetsoma` (npm) | v0.3.3 | Thin bootstrap — welcome flow, `soma init`, delegates to runtime |
| **Agent** | `soma-beta` (GitHub) | v0.11.2+ | Full runtime — extensions, protocols, body templates, Pi engine |

The CLI is ~50KB. The agent is the real thing. When you run `soma`, the CLI checks if the agent is installed and delegates everything to it.

## Fresh Install Flow

```
npm install -g meetsoma
         │
         ▼
    thin-cli.js installed globally
    (this is ALL that npm installs)
         │
    User runs: soma
         │
         ▼
    thin-cli.js checks: is agent installed?
         │
         ├── NO → show welcome experience
         │         user presses Enter
         │         │
         │         ▼
         │    soma init
         │         │
         │         ├── git clone --depth 1 soma-beta → ~/.soma/agent/
         │         ├── npm install --omit=dev (Pi runtime + deps, pinned by lockfile)
         │         ├── Save config.json (installedAt, coreVersion, installPath)
         │         └── Restore user files (auth.json, models.json if they existed)
         │
         └── YES → delegate to ~/.soma/agent/dist/cli.js
                    │
                    ▼
               Pi runtime starts
               soma-boot.ts loads
               .soma/ discovered or created
               Session begins
```

## What Lives Where

### Global: `~/.soma/`

```
~/.soma/
  agent/                    ← git clone of soma-beta (the runtime)
    dist/                   ← compiled runtime (Pi + Soma extensions)
      cli.js                ← Soma's entry point (delegates to Pi)
      thin-cli.js           ← copy of the npm CLI (for bundled installs)
      extensions/           ← compiled Soma extensions
      core/                 ← compiled core modules
      content/              ← bundled protocols, scripts
      migrations.js         ← Pi migration system (patched URLs)
      personality.js        ← Spintax voice engine
    extensions/             ← TypeScript source (dev mode)
    core/                   ← TypeScript source (dev mode)
    templates/default/      ← body templates (source for soma init)
    migrations/             ← migration phases + cycle
    package.json            ← agent version (source of truth)
    node_modules/           ← Pi runtime dependencies (exact versions from package-lock.json)
    package-lock.json       ← ships with soma-beta releases (v0.12.3+) — pins Pi and transitive tree
  config.json               ← install metadata
  amps/                     ← global AMPS (shared across projects)
  memory/                   ← global memory
```

### Per-Project: `.soma/`

```
your-project/
  .soma/                    ← created by soma init (first run)
    body/                   ← identity files (soul, voice, body, templates)
    amps/
      protocols/            ← behavioral rules
      muscles/              ← learned patterns
      scripts/              ← utility scripts
    memory/
      sessions/             ← session logs
      preloads/             ← continuation prompts
    settings.json           ← project settings (version, heat, paths)
    body/soul.md             ← structured identity (recommended)
    SOMA.md                 ← monolithic identity (legacy fallback)
```

## Update Flow

### Updating the Agent (runtime)

```bash
soma update                 # v0.12.3+ — actually performs the update
```

This does `git pull --ff-only` on `~/.soma/agent/`, then reinstalls deps if `package.json` changed. Your project `.soma/` files are never touched. Pi runtime version follows Soma version — when a new Soma release changes the Pi pin, this command fetches the new Pi as part of the update.

```
soma update
    │
    ├── git fetch origin
    ├── Compare: HEAD vs origin/main
    │
    ├── Behind? → prompt "Update now? [y/n]"
    │   ├── Yes → git pull --ff-only
    │   │         npm install if package.json changed
    │   │         Clear config.json updateAvailable flag
    │   │         ✓ Updated (hash1 → hash2)
    │   └── No  → "Skipped. Run soma update anytime."
    │
    └── Current? → "Already up to date."
                   Check project version vs agent version
                   Warn if project is behind
```

> **Pre-v0.12.3**: `soma update` was status-only (just reported what was available
> and told you to run `soma init`). `soma init` on an existing install was the
> one that actually did updates — an overload that silently hid the update flow
> when you typed `init` for project work. Both behaviors are now corrected:
> `soma init` = project setup, `soma update` = runtime update.

### Periodic Update Notices (v0.12.3+)

The running agent checks for updates in the background:

```
soma-statusline.ts (inside running agent)
    │
    ├── Every 30 min (piggybacks on the 5s render tick)
    ├── git fetch origin (silent, bounded 15s timeout)
    ├── Compare: HEAD vs origin/main
    │
    └── Behind?
         ├── Show "⬆ update" marker in statusline
         └── Write {updateAvailable: true, latestSummary} to ~/.soma/config.json

soma (plain launch)
    │
    ├── Read ~/.soma/config.json (no network)
    ├── If updateAvailable → print one-line notice → run soma update
    └── Delegate to agent
```

Design goals: zero network latency at CLI boot, no background daemon, update
check only while user is actively using Soma.

### Updating the CLI (npm package)

```bash
npm install -g meetsoma     # independent of agent
```

The CLI updates independently. Most functionality lives in the agent, not the CLI. CLI updates are rare — mainly for install flow improvements.

### Project Migration (soma doctor)

When the agent updates but your project `.soma/` was created with an older version:

```
soma (in outdated project)
    │
    ├── Boot: Tier 1 auto-fix (silent)
    │   ├── Add missing settings keys with defaults
    │   ├── Create body/ directory if missing
    │   ├── Add missing bundled protocols
    │   └── (never overwrites existing files)
    │
    ├── Tier 2 notification (if more work needed)
    │   └── "⚠️ Project needs update. Use /soma doctor to migrate."
    │
    └── Session starts normally

soma doctor (CLI)
    │
    ├── Show version comparison (project vs agent)
    ├── Count body files, protocols
    └── Suggest soma init or /soma doctor

/soma doctor (inside TUI)
    │
    ├── Run compareTemplates() — categorize every file
    │   ├── Missing: files in bundled but not in project
    │   ├── Stale: templates that match old version (safe to update)
    │   ├── Customized: user edited (preserve, don't touch)
    │   └── Extra: user-created (not in bundled)
    │
    ├── Find applicable migration phases
    │   └── migrations/phases/v{from}-to-v{to}.md
    │
    └── Send analysis to agent with phase file paths
        Agent reads phases, executes actions in order
```

## Version Checking

```bash
soma --version
# σ  Soma v0.11.2      ← agent version (from ~/.soma/agent/package.json)
#    CLI v0.3.3          ← CLI version (from npm package)

soma doctor
# Agent:   v0.11.2      ← what's installed globally
# Project: v0.10.0      ← what this project was created with
# CLI:     v0.3.3       ← npm package version
```

The **agent version** is what matters for features and compatibility. The **CLI version** is the thin bootstrap layer. The **project version** tracks what migration level the project's `.soma/` is at.

## Dev Setup

For Soma developers, `soma-install.sh dev` creates symlinks instead of using the soma-beta clone:

```
~/.soma/agent/core/        → symlink → repos/agent/core/
~/.soma/agent/extensions/  → symlink → repos/agent/extensions/
~/.soma/agent/dist/         → symlink → repos/agent/dist/
```

This means edits to source files are live — no rebuild needed. The `getAgentVersion()` function in thin-cli.js follows symlinks to find the real `package.json`.

## Troubleshooting

### "Soma not installed" after npm install

`npm install -g meetsoma` only installs the CLI. Run `soma` (or `soma init`) to download the agent runtime.

### Version mismatch

If `soma --version` shows an old agent version:
```bash
soma init          # pulls latest agent from GitHub
```

### Broken install

```bash
soma init          # auto-detects broken state, repairs or re-clones
```

The CLI never deletes — broken installs are moved to `~/.soma/agent-backup-{timestamp}/`.
