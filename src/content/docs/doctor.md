---
title: "Doctor & Migration"
description: "Project health checks, version migration, keeping .soma/ current."
section: "Reference"
order: 8.5
---


<!-- tldr -->
`soma doctor` from CLI for a quick health check. `/soma doctor` inside the TUI for interactive migration with agent assistance. Tier 1 (silent, every boot): adds missing settings, body files, protocols, converts legacy formats. Tier 2+ (interactive): compares templates, walks migration phases, handles breaking changes. Your customizations are never overwritten.
<!-- /tldr -->

## Quick Check

From your terminal:

```bash
soma doctor
```

Shows:
- Agent version vs project version
- Node.js, git, API key status
- `.soma/` structure (body files, protocols, scripts, muscles)
- Whether migration is needed

```bash
soma status       # shorter alias — just the health summary
soma health       # same thing
```

## How Migration Works

Soma has a **tiered migration system**. When the agent version is newer than your project version, different levels of fixes apply:

### Tier 1: Silent Auto-Fix (every boot)

Runs automatically on every session start. You never see it unless you check debug logs. Safe, idempotent, never destructive.

**What it does:**

| Fix | Example |
|-----|---------|
| Add missing settings sections | New `keepalive` key added to `settings.json` with defaults |
| Create missing body files | `body/` directory + template files if absent |
| Add missing bundled protocols | New protocol added in a release → copied to your project |
| Convert legacy formats | `<!-- digest:start -->` → `## TL;DR` in muscles |
| Add missing settings keys | New `preload.autoInject` key with default value |

**What it never does:**
- Overwrite files you've customized
- Delete anything
- Change existing settings values
- Modify body content (soul.md, voice.md, etc.)

### Tier 2+: Interactive Migration (on demand)

When Tier 1 isn't enough — structural changes, template updates, breaking format changes — the doctor prompts you:

```
⚠ Project .soma/ is at v0.10.0, agent is at v0.12.2.
  Use /soma doctor to check for updates.
```

Inside the TUI:

```
/soma doctor
```

The agent runs `compareTemplates()` which categorizes every file in your `.soma/`:

| Category | What | Action |
|----------|------|--------|
| **Missing** | File exists in bundled templates but not your project | Agent offers to create it |
| **Stale** | Your copy matches an old version's template | Safe to update (you haven't customized it) |
| **Customized** | Your copy differs from the template | Preserved — agent shows what changed and lets you decide |
| **Extra** | Your file, not in bundled templates | Left alone — it's yours |

The agent reads the applicable **migration phase files** (`migrations/phases/v0.10.0-to-v0.11.0.md`) which describe exactly what changed and what actions to take. Each phase is self-contained — an agent reading only that phase file has everything it needs.

## Migration Phases

Each version jump has a phase file describing the changes:

```
migrations/
├── cycle.md                    ← overview of the migration system
└── phases/
    ├── v0.6.1-to-v0.6.2.md
    ├── ...
    ├── v0.8.1-to-v0.9.0.md
    ├── v0.9.0-to-v0.10.0.md
    └── v0.10.0-to-v0.11.0.md
```

Phase files include:
- **from/to** versions
- **What changed** — new settings, renamed files, format changes
- **Actions** — what the doctor does (Tier 1 auto-fixes + Tier 2 recommendations)
- **Breaking changes** — anything that requires manual intervention

The chain is complete — no gaps. If your project is at v0.9.0 and the agent is at v0.12.2, the doctor walks through every phase in order.

## What Gets Compared

`compareTemplates()` checks three categories of files:

### Content Files (body templates)

```
templates/default/soul.md ← bundled template
body/soul.md              ← your copy (in .soma/)
```

If your copy matches the bundled template → **stale** (safe to update).
If your copy differs → **customized** (preserved, agent shows diff).
If bundled exists but yours doesn't → **missing** (agent offers to create).

### Protocol Files

```
content/protocols/breath-cycle.md    ← bundled
amps/protocols/breath-cycle.md       ← your copy
```

Same logic. Bundled protocols may gain new content in new versions. If you haven't customized yours, it's safe to update. If you have, the agent shows what's new and lets you merge manually.

### Settings Shape

New versions may add settings keys. Tier 1 adds missing keys with defaults automatically. Your existing values are never changed.

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `doctor.autoUpdate` | `true` | Show boot notification when migration is available |
| `doctor.declinedVersion` | `null` | Version you declined — suppresses notification for that version |

```json
{
  "doctor": {
    "autoUpdate": true,
    "declinedVersion": null
  }
}
```

**Suppress all update prompts:**
```json
{
  "doctor": {
    "autoUpdate": false
  }
}
```

**Declined a version?** The agent sets `declinedVersion` automatically when you say "not now" during `/soma doctor`. The notification won't appear again for that version. It resets when a newer version is released.

## CLI vs TUI Doctor

| Feature | `soma doctor` (CLI) | `/soma doctor` (TUI) |
|---------|---------------------|---------------------|
| Health check | ✅ | ✅ |
| Version comparison | ✅ | ✅ |
| Tier 1 auto-fix | ✅ (runs on every boot) | ✅ |
| Template comparison | Basic summary | Full `compareTemplates()` analysis |
| Migration guidance | Lists phase files | Agent reads phases, executes step-by-step |
| Interactive decisions | No | Yes — agent asks before each change |

**Recommended flow:** Run `soma doctor` from CLI first (quick check). If migration is needed, start a session and use `/soma doctor` for the agent-assisted interactive flow.

## Your Files Are Safe

The most important guarantee: **Soma never overwrites your customizations.**

- `body/soul.md` you wrote? Never touched.
- `amps/protocols/my-custom.md`? Never touched.
- `settings.json` values you set? Never changed.
- Session logs and preloads? Never deleted.

Tier 1 only *adds* missing things. Tier 2+ always *asks* before changing anything. The `compareTemplates()` system explicitly detects customization by comparing content — if you've edited a file, it's flagged as "customized" and left alone.

## Troubleshooting

### "Project needs update" keeps appearing

Check if you declined the update:
```bash
cat .soma/settings.json | grep declinedVersion
```

If it shows the current version, the notification is suppressed. Run `/soma doctor` to proceed with migration.

### Tier 1 isn't fixing something

Tier 1 is conservative — it only handles safe, idempotent fixes. If your issue requires structural changes (renamed directories, format migrations), use `/soma doctor` for the interactive flow.

### Version mismatch after update

```bash
soma --version          # check agent version
cat .soma/settings.json # check project version
soma doctor             # compare and fix
```

The project version is in `settings.json`. The agent version is in `~/.soma/agent/package.json`.

## Related

- [Updating](/docs/updating) — how to update the CLI and agent runtime
- [Install Architecture](/docs/install-architecture) — how versions flow from npm to runtime
- [Configuration](/docs/configuration#doctor) — doctor settings
