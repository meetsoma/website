---
title: "Configuration"
description: "Settings, heat thresholds, muscle budgets — tune Soma's behavior."
section: "Reference"
order: 6
---


<!-- tldr -->
`settings.json` at any level in the soma chain (project → parent → global). Project overrides parent overrides global. Controls: heat thresholds, muscle budgets, boot steps (including git-context), context warning thresholds, preload staleness, auto-detection, parent-child inheritance, persona, system prompt toggles, guard rules. Only set what you want to change — defaults fill the rest.
<!-- /tldr -->

Soma's behavior is controlled through `settings.json` files. Settings are optional — Soma works with sensible defaults out of the box.

## Where Settings Live

Settings files can exist at any level in the Soma chain:

```
~/.soma/agent/settings.json      ← global (all projects)
~/work/.soma/settings.json       ← parent (all projects in ~/work)
~/work/my-app/.soma/settings.json ← project (this project only)
```

**Merge order:** global → parent → project. Project settings override parent, which override global. You only need to set the values you want to change.

## Full Reference

```json
{
  "inherit": {
    "identity": true,
    "protocols": true,
    "muscles": true,
    "tools": true
  },
  "persona": {
    "name": null,
    "emoji": null,
    "icon": null
  },
  "guard": {
    "coreFiles": "warn",
    "bashCommands": "warn",
    "gitIdentity": null
  },
  "systemPrompt": {
    "maxTokens": 10000,
    "includeSomaDocs": true,
    "includePiDocs": true,
    "includeContextAwareness": true,
    "includeSkills": true,
    "includeGuardAwareness": true,
    "identityInSystemPrompt": true
  },
  "memory": {},
  "protocols": {
    "warmThreshold": 3,
    "hotThreshold": 8,
    "maxHeat": 15,
    "decayRate": 1,
    "maxBreadcrumbsInPrompt": 10,
    "maxFullProtocolsInPrompt": 3
  },
  "muscles": {
    "tokenBudget": 2000,
    "maxFull": 2,
    "maxDigest": 8,
    "maxLoaded": 10,
    "fullThreshold": 5,
    "digestThreshold": 1
  },
  "automations": {
    "tokenBudget": 1500,
    "maxFull": 1,
    "maxDigest": 3,
    "maxLoaded": 5,
    "fullThreshold": 5,
    "digestThreshold": 1
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  },
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles", "automations", "scripts", "git-context"],
    "gitContext": {
      "enabled": true,
      "since": "24h",
      "maxDiffLines": 50,
      "maxCommits": 10,
      "diffMode": "stat"
    }
  },
  "breathe": {
    "auto": false,
    "triggerAt": 50,
    "rotateAt": 70,
    "graceSeconds": 30,
    "maxTokens": 0
  },
  "cache": {
    "retention": null
  },
  "imageBudget": {
    "softAt": 8,
    "hardAt": 10
  },
  "context": {
    "notifyAt": 50,
    "warnAt": 70,
    "urgentAt": 80,
    "autoExhaleAt": 85
  },
  "preload": {
    "staleAfterHours": 48,
    "autoInject": false
  },
  "keepalive": {
    "maxPings": 5,
    "autoExhale": true,
    "autoExhaleMinTokens": 75000
  },
  "doctor": {
    "autoUpdate": true,
    "declinedVersion": null
  },
  "checkpoints": {
    "soma": {
      "autoCommit": true
    },
    "project": {
      "style": "commit",
      "autoCheckpoint": false,
      "prefix": "checkpoint:"
    },
    "diffOnBoot": true,
    "maxDiffLines": 80
  }
}
```

## Settings Explained

### Resource Paths (v0.27.3+)

User-global resources live at `~/.soma/<type>/`, separate from the runtime install at `~/.soma/agent/`. This keeps your customizations safe across Soma updates.

| Directory | What goes there |
|-----------|----------------|
| `~/.soma/extensions/` | Custom Pi extensions (`.ts` files) |
| `~/.soma/skills/` | Skill directories the agent loads on boot |
| `~/.soma/prompts/` | Prompt template files or directories |
| `~/.soma/themes/` | Theme files or directories |

**Opt out per session:** `soma --no-extensions`, `--no-skills`, `--no-prompt-templates`, `--no-themes`.

### Inheritance

Controls what a child `.soma/` inherits from its parent chain. All default to `true` when a parent `.soma/` exists.

| Key | Default | Description |
|-----|---------|-------------|
| `identity` | `true` | Layer parent's identity below the child's in the system prompt |
| `protocols` | `true` | Discover and load parent's protocols (respects heat) |
| `muscles` | `true` | Discover and load parent's muscles (respects heat/budget) |
| `tools` | `true` | Surface parent's scripts and tools |

**Example: standalone project** (no parent inheritance):
```json
{
  "inherit": {
    "identity": false,
    "protocols": false,
    "muscles": false,
    "tools": false
  }
}
```

See [How It Works](/docs/how-it-works#parent-child-workspaces) for the full inheritance model.

### Persona

Cosmetic identity overrides — give your agent a custom name, emoji, or icon.

| Key | Default | Description |
|-----|---------|-------------|
| `name` | `null` | Custom agent name (appears in system prompt and status) |
| `emoji` | `null` | Custom emoji for status and logs |
| `icon` | `null` | Path to custom icon (SVG/PNG) |

**Example:**
```json
{
  "persona": {
    "name": "Atlas",
    "emoji": "🗺️"
  }
}
```

When `name` is set, it appears in the system prompt identity section. When `null`, Soma uses the default or inherited name.

### Guard

Protects core Soma files and git identity from accidental modification.

| Key | Default | Description |
|-----|---------|-------------|
| `coreFiles` | `"warn"` | Protection for `.soma/identity.md`, `STATE.md`, `protocols/`, `settings.json`, the body templates (`_mind.md`/`_memory.md`/`_first-breath.md`), and the runtime install (`~/.soma/agent/`). Applies to both **write and edit**. Options: `"allow"` (no guard), `"warn"` (notify), `"block"` (require confirmation). Note: ordinary body files like `soul.md` are **not** protected — they're meant to be edited. |
| `bashCommands` | `"warn"` | Bash command guard. `"allow"` = no prompts, `"warn"` = confirm dangerous commands, `"block"` = prevent entirely. Protects against: `rm -rf`, `git push --force`, etc. |
| `bashNotify` | `"notify"` | Non-blocking notifications for routine commands. Currently shows a notice on plain `git push`. Set to `"off"` to silence. |
| `gitIdentity` | `null` | Expected git identity. `null` = only checks email is set. `{ email: "x@y.com" }` = warns on mismatch. `{ email: ["a@b.com", "c@d.com"] }` = accepts any in the list. |
| `toolGates` | `{}` | Tool→muscle gating. Require reading a muscle before using certain bash commands. Keys are command substrings, values are `{ muscle, mode }`. |
| `worktree` | `null` | Worktree boundary. When set to an absolute/`~` path, `write` and `edit` outside it are hard-blocked (sub-agent isolation). |
| `trustedModels` | `[]` | Per-model allowlist. When the **active model id** matches a glob in this list, `coreFiles` + `bashCommands` resolve to `"allow"` for that turn — capable models (sonnet/opus) skip the prompts while weaker models and new users keep full protection. Globs use `*` wildcards, matched case-insensitively against the model id (same convention as `breathe.thresholds`). Settable per-project **or** global; child wins. Empty (default) = no model is trusted. Example: `["*sonnet*", "*opus*"]`. |

**Example: relax guards for capable models only:**
```json
{
  "guard": {
    "trustedModels": ["*sonnet*", "*opus*"]
  }
}
```
New users and weaker models keep `coreFiles`/`bashCommands` at their configured level; sonnet/opus sessions skip the write/bash prompts. Put this in your **global** `~/.soma/settings.json` to apply everywhere, or a project's `.soma/settings.json` to scope it (child overrides global).

**Always-on protection (irreversibility tier):**

Some guards fire **regardless** of `bashCommands` or `trustedModels` — capability relaxes the routine prompts, never the catastrophic ones. These always require explicit confirmation and cannot be silenced:

- **`.soma` workspace destruction** — `rm -r`/`-rf` of a `.soma` directory itself (your memory + identity). Deleting files *within* `.soma` is unaffected.
- **`.git` history destruction** — `rm -r`/`-rf` of a `.git` directory (wipes commit history).
- **`git init`** — can detach or orphan an existing `.soma`/`.git` history (this has wiped a workspace before), so it prompts to confirm.
- **Runtime install** — destructive operations on `~/.soma/agent/` (breaks your `soma` command).
- **Expensive operations** — `npm publish`, `docker push`, remote `rsync`, `ssh … sudo`, `git push --tags`, AWS sync/invalidation (real-world cost/permanence).

The relaxable tier (`coreFiles`, `bashCommands` dangerous-command prompts, `toolGates`, git-identity notices) is what `trustedModels` and `bashCommands: "allow"` skip.

**Example: tool→muscle gating:**
```json
{
  "guard": {
    "toolGates": {
      "git push": { "muscle": "ship-cycle", "mode": "warn" },
      "npm publish": { "muscle": "release-pipeline", "mode": "block" }
    }
  }
}
```

When the agent runs `git push` without having read the `ship-cycle` muscle this session, it gets a notification (warn) or is blocked (block). Once the muscle file is read, the gate opens silently.

**Example: strict guard with enforced git identity:**
```json
{
  "guard": {
    "coreFiles": "block",
    "gitIdentity": {
      "email": "dev@example.com",
      "name": "Dev"
    }
  }
}
```

**Example: power user / dev mode (no confirmation prompts):**
```json
{
  "guard": {
    "coreFiles": "allow",
    "bashCommands": "allow"
  }
}
```

### System Prompt

Controls what sections appear in Soma's compiled system prompt. Use `/soma prompt` to preview the assembled result.

| Key | Default | Description |
|-----|---------|-------------|
| `maxTokens` | `10000` | Estimated token budget for Soma's system prompt portion |
| `includeSomaDocs` | `true` | Include Soma documentation references |
| `includePiDocs` | `true` | Include Pi framework documentation references |
| `includeContextAwareness` | `true` | Include CLAUDE.md awareness note |
| `includeSkills` | `true` | Include skills block from Pi |
| `includeGuardAwareness` | `true` | Include guard rules in prompt |
| `identityInSystemPrompt` | `true` | Place identity in system prompt (vs user message) |

**Example: minimal prompt (less context, more room for conversation):**
```json
{
  "systemPrompt": {
    "includeSomaDocs": false,
    "includePiDocs": false,
    "includeSkills": false
  }
}
```

### Memory

Reserved for future memory system settings. Currently empty.

### Protocols (Heat Thresholds)

| Key | Default | Description |
|-----|---------|-------------|
| `warmThreshold` | `3` | Minimum heat to show as a breadcrumb in the system prompt |
| `hotThreshold` | `8` | Minimum heat to load the full protocol body |
| `maxHeat` | `15` | Heat cap — prevents runaway accumulation |
| `decayRate` | `1` | Heat lost per session if a protocol isn't used |
| `maxBreadcrumbsInPrompt` | `10` | Maximum warm protocols shown as breadcrumbs |
| `maxFullProtocolsInPrompt` | `3` | Maximum hot protocols loaded in full |

**Why adjust:** If protocols appear too eagerly, raise `warmThreshold`. If important protocols keep fading between sessions, lower `decayRate` or raise `maxHeat`. If you have many protocols competing, increase `maxBreadcrumbsInPrompt` (costs more tokens) or decrease `hotThreshold` (so fewer reach full-body loading).

See [Heat System](heat-system.md) for the full explanation.

### Muscles

| Key | Default | Description |
|-----|---------|-------------|
| `tokenBudget` | `2000` | Total estimated tokens for all loaded muscles |
| `maxFull` | `2` | Maximum muscles loaded with full body text |
| `maxDigest` | `8` | Maximum muscles loaded with digest/TL;DR only |
| `maxLoaded` | `10` | Maximum total muscles loaded (hot + warm combined). `0` = unlimited |
| `fullThreshold` | `5` | Heat needed to load a muscle in full |
| `digestThreshold` | `1` | Heat needed to load a muscle as digest |

**Why adjust:** If your agent frequently says "I don't remember how to do X" for things you've written muscles about, increase `tokenBudget` or `maxFull`. If boot messages are too long, decrease `maxLoaded` to cap total loaded muscles — unloaded muscles appear as a summary with guidance to `ls .soma/amps/muscles/` and `/pin <name>`. The `## TL;DR` system is the best compromise — compact summaries that give the agent enough to know when to read the full muscle.

See [Muscles](muscles.md) for writing muscles and the TL;DR system.

### Automations

| Key | Default | Description |
|-----|---------|-------------|
| `tokenBudget` | `1500` | Total estimated tokens for all loaded automations |
| `maxFull` | `1` | Maximum automations loaded with full body text |
| `maxDigest` | `3` | Maximum automations loaded with digest only |
| `maxLoaded` | `5` | Maximum total automations loaded (hot + warm combined). `0` = unlimited |
| `fullThreshold` | `5` | Heat needed to load an automation in full |
| `digestThreshold` | `1` | Heat needed to load an automation as digest |

Automations are procedural step-by-step flows — like protocols but action-oriented. "Do this sequence" rather than "behave like this." They live in `.soma/amps/automations/` and support heat, `/pin`, `/kill`, and cold-start boost just like muscles.

**Why adjust:** If you have many automations competing for prompt space, increase `tokenBudget`. If you want multiple automations loaded in full (e.g. a deploy automation AND a review automation), increase `maxFull`.

### Heat Tracking

| Key | Default | Description |
|-----|---------|-------------|
| `autoDetect` | `true` | Automatically bump heat when protocol-related patterns are detected in tool results |
| `autoDetectBump` | `1` | How much heat to add on auto-detection |
| `pinBump` | `5` | How much heat to add when using `/pin` |

### Boot Sequence

The boot sequence controls what loads into the agent's context on session start. Each step is a named stage that runs in order.

| Key | Default | Description |
|-----|---------|-------------|
| `steps` | `["identity", "preload", "protocols", "muscles", "automations", "scripts", "git-context"]` | Ordered list of boot steps. Remove a step to skip it, reorder to change priority. |

**Available steps:**

| Step | What It Does |
|------|-------------|
| `identity` | Load layered identity (project → parent → global) |
| `preload` | Load session continuation state (on resumed sessions only) |
| `protocols` | Discover and inject protocols by heat tier |
| `muscles` | Discover and inject muscles by heat within token budget |
| `automations` | Discover and inject automations by heat (procedural step-by-step flows) |
| `scripts` | List available `.soma/amps/scripts/` with descriptions |
| `git-context` | Inject recent git commits and changed files |

**Why adjust:** Order matters — items earlier in the list get priority in the system prompt. If your automations are more important than scripts, they're already ordered that way by default. If you're on a model with a smaller context window, remove steps to save tokens (e.g. drop `git-context` and `scripts`).

To disable a step, remove it from the array:

```json
{
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles"]
  }
}
```

This skips scripts listing and git context on boot.

### Git Context

Controls the `git-context` boot step — what recent git history to load on session start. This gives the agent awareness of what changed since last session without reading the preload.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Whether to load git context on boot |
| `since` | `"24h"` | How far back to look. Accepts: `"last-session"` (uses preload timestamp), `"24h"`, `"7d"`, or any git date format |
| `maxDiffLines` | `50` | Max lines of diff output to include |
| `maxCommits` | `10` | Max commit log entries to show |
| `diffMode` | `"stat"` | `"stat"` (file summary), `"full"` (full diff), or `"none"` (commits only) |

**Examples:**

Show full diffs from last session:
```json
{
  "boot": {
    "gitContext": {
      "since": "last-session",
      "diffMode": "full",
      "maxDiffLines": 100
    }
  }
}
```

Only show commits, no diff:
```json
{
  "boot": {
    "gitContext": {
      "diffMode": "none",
      "maxCommits": 20
    }
  }
}
```

Disable git context entirely:
```json
{
  "boot": {
    "gitContext": {
      "enabled": false
    }
  }
}
```

### Auto-Breathe

Proactive context management — fires warn + exhale notifications before sessions hit critical context levels, then handles rotation gracefully. Three modes:

#### Quick reference

| Key | Default | Description |
|-----|---------|-------------|
| `auto` | `"model-aware"` | Mode: `"off"` \| `"global"` \| `"model-aware"` |
| `triggerAt` | `50` | Warn % (used when `auto = "global"`) |
| `rotateAt` | `70` | Exhale % (used when `auto = "global"`) |
| `thresholds` | (see below) | Per-model ranges (used when `auto = "model-aware"`) |
| `graceSeconds` | `30` | Seconds to wait for preload before timing out |
| `maxTokens` | `0` | Absolute token cap for % calculations. `0` = use model's native window. |

#### Tri-state mode

| Mode | Behavior |
|------|----------|
| `"off"` | Passive notifications only (`context.*` thresholds). No proactive rotation. |
| `"global"` | Proactive rotation at fixed `triggerAt`/`rotateAt` percentages (legacy behavior). |
| `"model-aware"` | Proactive rotation using per-model `warnRange`/`exhaleRange` brackets. **Default for new installs.** |

**Migration from boolean `auto`:** Existing settings with `auto: true` are migrated to `"global"` (legacy behavior preserved). `auto: false` → `"off"`. Unset installs get `"model-aware"` as the new default.

**Toggle at runtime:** `/auto-breathe off | global | model-aware | status`

#### Model-aware thresholds

In `"model-aware"` mode, the `thresholds` map resolves per-model warn and exhale ranges. Glob patterns match against `ctx.model.id` (case-insensitive, first match wins). `"default"` is the fallback.

**Default thresholds map:**
```json
{
  "breathe": {
    "auto": "model-aware",
    "thresholds": {
      "default":  { "warnRange": [50, 64], "exhaleRange": [65, 85] },
      "*sonnet*": { "warnRange": [28, 33], "exhaleRange": [34, 50] },
      "*opus*":   { "warnRange": [60, 74], "exhaleRange": [75, 90] }
    }
  }
}
```

The Sonnet thresholds (`warnRange: [28, 33]`, `exhaleRange: [34, 50]`) are calibrated against the empirical long-context billing tier wall (~40-48% context on standard Anthropic accounts). Warn fires **every turn** while in `warnRange`. Exhale fires **once per range entry** when pct enters `exhaleRange`, then resets if pct drops below `exhaleRange[0]`.

**Behavior flow (model-aware):**

| Phase | Trigger | What happens |
|-------|---------|-------------|
| Warn | pct ∈ warnRange | `ctx.ui.notify` every turn — 

### Context Warnings

Controls when context usage warnings fire during a session. These are the **passive warnings** — they fire when auto-breathe is off (or as a fallback alongside auto-breathe).

| Key | Default | Description |
|-----|---------|-------------|
| `notifyAt` | `50` | Subtle notification in the status area |
| `warnAt` | `70` | Warning-level notification |
| `urgentAt` | `80` | Urgent warning injected into the system prompt |
| `autoExhaleAt` | `85` | Safety net — triggers emergency preload + rotation prompt |

**How context warnings relate to auto-breathe:**
- With auto-breathe **off**: context warnings are your only alert system. The agent sees notifications at each threshold but has to decide what to do.
- With auto-breathe **on**: the auto-breathe phases (`triggerAt`, `rotateAt`) handle rotation proactively. Context warnings still fire as a safety net, but auto-breathe should resolve things before they get to `urgentAt`.
- The `autoExhaleAt` (85%) safety net fires regardless — it's the last resort.

**Why adjust:** If you find the agent panicking too early, push thresholds up. If sessions end abruptly without preloads, you might want them lower — but consider enabling auto-breathe instead, which is more graceful.

**Example: relaxed warnings for longer sessions:**
```json
{
  "context": {
    "notifyAt": 60,
    "urgentAt": 85,
    "autoExhaleAt": 90
  }
}
```

**Example: aggressive (small context models or token-conscious workflows):**
```json
{
  "context": {
    "notifyAt": 30,
    "urgentAt": 60,
    "autoExhaleAt": 70
  }
}
```

### Preload

| Key | Default | Description |
|-----|---------|-------------|
| `staleAfterHours` | `48` | Hours before a preload file is considered stale. |
| `autoInject` | `false` | Auto-inject latest preload on every fresh boot. When `true`, `soma` = `soma inhale`. |

### API Recovery

| Key | Default | Description |
|-----|---------|-------------|
| `extraUsageRecovery` | `"auto"` | Handles Anthropic's "extra usage required for long context" 429 error on session boot. `"auto"` — auto-sends a keepalive `.` after 1s debounce (recovers silently). `"notify"` — surfaces a notice, waits for you to respond. `"off"` — lets the error propagate (manual recovery). |

**Why this exists:** Anthropic's long-context tier charges extra. When Soma's context exceeds standard limits on the first turn, the API returns a 429 with "extra usage required." Auto mode quietly retries so sessions don't fail mysteriously.

**Why adjust:** The stale threshold prevents the agent from acting on outdated context. If you work on a project daily, 48 hours is right — a preload from 2 days ago is probably stale. For side projects you touch weekly, set it higher so your preloads still auto-load after a few days away.

```json
{
  "preload": {
    "staleAfterHours": 168
  }
}
```

### Sessions

**Session IDs** combine sequential numbering with a random hex suffix: `s05-a3f2c1`. The sequential part (`s05`) gives you human-readable order within a day. The hex part (`a3f2c1`) prevents collisions when multiple terminals run the same Soma agent simultaneously. Both appear in filenames (`2026-03-14-s05-a3f2c1.md`) and frontmatter (`session-id:`).

### Checkpoints

Two-track version control: Soma's own `.soma/` state and your project code are checkpointed separately.

#### Soma Track

| Key | Default | Description |
|-----|---------|-------------|
| `soma.autoCommit` | `true` | Auto-commit `.soma/` changes on exhale (identity, heat state, preload) |

#### Project Track

| Key | Default | Description |
|-----|---------|-------------|
| `project.style` | `"commit"` | How to save project state: `"commit"` (git commit), `"tag"` (lightweight tag), or `"stash"` (git stash) |
| `project.autoCheckpoint` | `false` | Auto-create checkpoint on exhale. When `false`, Soma prompts first. |
| `project.prefix` | `"checkpoint:"` | Commit message prefix for project checkpoints |


#### Boot Integration

| Key | Default | Description |
|-----|---------|-------------|
| `diffOnBoot` | `true` | Show diffs from last checkpoint when session starts |
| `maxDiffLines` | `80` | Max lines of diff to surface on boot |

**Example: auto-checkpoint on exhale:**
```json
{
  "checkpoints": {
    "project": {
      "autoCheckpoint": true,
      "style": "commit"
    }
  }
}
```

**Example: stash-based (non-destructive):**
```json
{
  "checkpoints": {
    "project": {
      "style": "stash",
      "autoCheckpoint": true
    }
  }
}
```

### Cache

Controls Anthropic prompt-cache TTL.

```json
{
  "cache": {
    "retention": null
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `retention` | `null` | One of `null`, `"long"`, `"short"`, `"none"`. Controls how long Anthropic holds your cached prompt prefix. `null` inherits the `PI_CACHE_RETENTION` env var if set, otherwise Pi's default (`"short"`). |

**Retention modes:**

| Mode | TTL | Cost shape | When useful |
|------|-----|-----------|-------------|
| `"short"` (Pi default) | 5 minutes | 1.25× cache write, then read-discounted | Short bursts of activity; idle gaps shorter than ~5 min |
| `"long"` | 1 hour | 2× cache write, then read-discounted | Sessions with idle gaps 5-60 min (e.g. you `soma -c` after a coffee break); breaks even with one re-hit within the hour |
| `"none"` | n/a | No caching | Diagnostic only |
| `null` | inherit shell `PI_CACHE_RETENTION`, else Pi default | varies | Default — zero behavior change |

**Status (validation):** ⚠️ *The schema and injection wiring shipped in v0.21.0 (SX-544 Phase A). The 1-hour TTL behavior is **not yet validated end-to-end** — SX-545 (Phase B) is the empirical test that confirms Anthropic respects `cacheRetention: "long"`. The estimated cost reduction (~70-80% of "first-5-minutes" cache rebuilds) comes from the SX-705 audit and is **modeled, not measured**. Opt in if you want to try it; we'd love a usage report.*

**Example: opt in to long retention (recommended path):**
```json
{
  "cache": {
    "retention": "long"
  }
}
```

**Example: opt in via shell env var (legacy / inherited path):**
```bash
# In ~/.zshrc, ~/.bashrc, or ~/.soma/env
export PI_CACHE_RETENTION=long
```
The env-var route works because `cache.retention: null` (the default) inherits from shell. Use the settings path when you can — it's project-scoped and survives shell changes.

**Tradeoff:** `"long"` charges 2× the per-write cost on a fresh cache vs `"short"`'s 1.25×. You break even with one cache *re-hit* within the hour. For typical session rhythms (`soma -c` repeatedly during a workday), net positive most of the time — but the magnitude is unmeasured.

### Keepalive

Controls the cache keepalive system — automatic pings that prevent expensive prompt re-caching when you step away.

```json
{
  "keepalive": {
    "maxPings": 5,
    "autoExhale": true,
    "autoExhaleMinTokens": 75000
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `maxPings` | `5` | Maximum keepalive pings per idle period (0–5). Resets when you send a message. Set to `0` to disable keepalive entirely. |
| `autoExhale` | `true` | Automatically triggers an exhale when keepalive lives are exhausted. The agent writes a preload before the cache expires, preserving your session state even if you walk away. |
| `autoExhaleMinTokens` | `75000` | Minimum context tokens used before auto-exhale triggers. Below this threshold, the session ends quietly instead — not worth saving a preload for a short interaction. |

**How it works:** Anthropic's prompt cache has a ~5 minute TTL. When you stop interacting, the cache countdown begins. Soma pings the cache before it expires, keeping your prompt cached at the discounted rate. Each ping uses one "life." When lives run out, the agent auto-exhales (if enough work was done) or goes idle quietly.

**Why limit pings:** Unlimited keepalive burns API credits if you forget about a session. 5 pings (∼24 minutes of idle time) covers most breaks. Set `maxPings: 3` for shorter sessions, or `0` to disable.

**Example: disable auto-exhale:**
```json
{
  "keepalive": {
    "autoExhale": false
  }
}
```

### Doctor

Controls how Soma handles project updates and migrations.

```json
{
  "doctor": {
    "autoUpdate": true,
    "declinedVersion": null
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `autoUpdate` | `true` | Show boot notification when a newer agent version is available. Set to `false` to suppress update prompts. |
| `declinedVersion` | `null` | Version string the user declined to update to. Suppresses notification for that specific version. Set automatically when user declines via `/soma doctor`. |

**How it works:**

- **Tier 1 (automatic, every boot):** Adds missing settings sections, body template files, and bundled protocols silently. Converts muscle `<!-- digest -->` blocks to `## TL;DR`. Safe and idempotent.
- **Tier 2+ (interactive, via `/soma doctor`):** Uses `compareTemplates()` to analyze content files, new templates, and structural changes. References migration phase files for step-by-step guidance.
- **Boot notification:** When `autoUpdate` is `true` and the agent version is newer than the project version (and not equal to `declinedVersion`), a warning appears suggesting `/soma doctor`.

**Example: suppress all update prompts:**
```json
{
  "doctor": {
    "autoUpdate": false
  }
}
```

### Image Budget

Auto-compact when screenshots accumulate in context. Each image is ~20K tokens — at 10 images, that's 200K tokens of visual data.

```json
{
  "imageBudget": {
    "softAt": 8,
    "hardAt": 10
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `softAt` | `8` | Notify agent to consider `/compact` when this many images are in context. `0` = no notification. |
| `hardAt` | `10` | Auto-compact at this count. The summary preserves visual observations while dropping raw image data. `0` = disabled. |

After auto-compact, the agent can take new screenshots. The counter resets. Light sessions (few images) never trigger — zero overhead.

**Example: disable auto-compact (manual only):**
```json
{
  "imageBudget": {
    "hardAt": 0
  }
}
```

## Examples

### Minimal Override

Only change what matters — everything else uses defaults:

```json
{
  "protocols": {
    "hotThreshold": 5
  }
}
```

### Aggressive Muscle Loading

```json
{
  "muscles": {
    "tokenBudget": 4000,
    "maxFull": 4,
    "maxDigest": 12
  }
}
```

### Quiet Boot (No Git, No Scripts)

```json
{
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles"]
  }
}
```

### Long-Running Project

Weekly sessions, big context, late warnings:

```json
{
  "preload": {
    "staleAfterHours": 168
  },
  "context": {
    "notifyAt": 60,
    "autoExhaleAt": 90
  },
  "boot": {
    "gitContext": {
      "since": "7d",
      "maxCommits": 30
    }
  }
}
```

### Custom Content Paths

If you use a different directory layout (e.g., `protocols/` instead of `amps/protocols/`):

```json
{
  "paths": {
    "muscles": "amps/muscles",
    "protocols": "amps/protocols",
    "scripts": "amps/scripts",
    "automations": "amps/automations",
    "preloads": "memory/preloads",
    "identity": "body/soul.md"
  }
}
```

All paths are relative to the `.soma/` root. Change these if you're migrating from an older layout or prefer a different structure.

### Script Discovery

Configure which file extensions are discovered as scripts:

```json
{
  "scripts": {
    "extensions": [".sh", ".py", ".ts", ".js", ".mjs"]
  }
}
```

### Extension Security

Configure an allowlist of approved extension filenames. Extensions not on the list trigger a warning on boot and in `/soma doctor`:

```json
{
  "extensions": {
    "allowlist": [
      "soma-boot.ts",
      "soma-breathe.ts",
      "soma-guard.ts",
      "soma-header.ts",
      "soma-hub.ts",
      "soma-route.ts",
      "soma-scratch.ts",
      "soma-statusline.ts",
      "soma-tools.ts",
      "bridge-connect.ts",
      "somaverse-tools.ts"
    ],
    "warnOnUnlisted": true
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `allowlist` | none | Array of approved extension filenames. When set, unlisted extensions trigger warnings. |
| `warnOnUnlisted` | `true` | Show warnings for extensions not in the allowlist. |

Without an allowlist configured, all extensions load without warnings.

## Environment Configuration (advanced)

> Reserved for future use — the shipped agent does not consume this block today.

The `environment` setting declares which endpoint tier the agent should route through. It is read only by dev-mode extensions in the current release; shipped extensions use baked defaults that match their install context.

```json
{
  "environment": {
    "mode": "auto",
    "overrides": { }
  }
}
```

| Mode | Meaning |
|------|---------|
| `local` | Local dev stack (localhost) |
| `cloud` | Shared public tier |
| `pro` | Private dedicated tier (future paid option) |
| `enterprise` | Tenant-declared endpoints (reservation — requires explicit overrides) |
| `auto` | Probe local, fall back to cloud |

Per-endpoint `overrides` accept string values (use the default when `null`). Back-compat environment variables (e.g. `BRIDGE_URL`, `SOMADIAN_URL`) remain honored as the lowest-priority override.

If you aren't sure whether you need this block, you don't.

## Global Config (~/.soma/)

Soma creates a global workspace at `~/.soma/` on first boot. This provides:

- **Global identity** — your name and preferences across all projects
- **Global scripts** — tools available everywhere (bundled scripts are seeded here)
- **Global protocols** — rules that apply to all projects
- **Global muscles** — personal patterns you've learned

Project-level `.soma/` inherits from `~/.soma/` automatically (controlled by `inherit` settings). Override any global setting at the project level.
```
