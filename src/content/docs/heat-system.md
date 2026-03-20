---
title: "Heat System"
description: "How Soma decides what to load — temperature-based relevance that adapts through use."
section: "Core Concepts"
order: 4
---

# Heat System

> TL;DR: Everything in Soma has a temperature. Hot content loads fully into the agent's prompt. Warm content loads as a one-line reminder. Cold content is listed but not loaded. Heat rises when things get used, decays when they don't. The agent naturally learns what matters.

The heat system is how Soma decides what to put in the agent's context window. Instead of loading everything (which wastes tokens) or requiring manual configuration (which nobody maintains), heat makes it automatic: use something often and it stays loaded. Stop using it and it fades.

## How It Works

```
  INHALE (boot)              HOLD (work)              EXHALE (session end)
  ─────────────              ───────────              ────────────────────
  Load by heat:              Auto-detect:             For each item:
  🔥 HOT (8+) → full body    write frontmatter → +1   Used this session? → keep
  🟡 WARM (3-7) → breadcrumb  git commit → +1          Unused? → decay -1
  ❄️ COLD (0-2) → name only   write SVG → +1           Pinned? → no decay
                             Manual: /pin /kill        Save state to disk
```

### What Gets Loaded at Each Tier

**Protocols:**
| Tier | What Loads | Example |
|------|-----------|---------|
| 🔥 Hot | Full protocol body — all rules, all sections | The complete breath-cycle protocol with every phase described |
| 🟡 Warm | Breadcrumb — a single sentence from the `breadcrumb:` frontmatter field | "Commits must be attributed correctly. Check git config user.email before first commit." |
| ❄️ Cold | Just the protocol name in a list | `- git-identity` |

**Muscles:**
| Tier | What Loads | Example |
|------|-----------|---------|
| 🔥 Hot | Full muscle body — all learned patterns, rules, examples | The complete SVG logo design muscle with all techniques |
| 🟡 Warm | Digest only — the content between `<!-- digest:start -->` and `<!-- digest:end -->` markers | A 3-line summary of the muscle's key rules |
| ❄️ Cold | Name listed so the agent knows it exists | `- svg-logo-design` |

### Token Budget

Muscles have a token budget (default: 2000 estimated tokens). Hot muscles load first (up to 2 full muscles), then warm muscles fill remaining budget with digests (up to 8). This prevents muscles from consuming the entire context window.

Protocols are smaller and don't have a strict token budget, but are limited by count: max 3 hot (full body) and 10 warm (breadcrumbs).

## Heat Events

Heat changes based on what happens during a session:

| Event | Heat Change | How It's Detected |
|-------|-------------|------------------|
| Agent writes a file with YAML frontmatter | +1 to `frontmatter-standard` | Auto-detect: tool result has `---\n` prefix |
| Agent runs a git command | +1 to `git-identity` | Auto-detect: bash command matches `git config\|commit\|push\|remote` |
| Agent writes a preload file | +1 to `breath-cycle` | Auto-detect: file path contains "preload" or "continuation" |
| Agent writes an SVG file | +1 to `svg-logo-design` muscle | Auto-detect: file path ends in `.svg` |
| Agent uses GitHub App token | +1 to `github-app-auth` muscle | Auto-detect: command contains `gh-app-token` or `GH_APP_TOKEN` |
| You run `/pin <name>` | Heat set to hot + pinned | Manual command |
| You run `/kill <name>` | Heat set to 0 | Manual command |
| Session ends, item was used | No change | — |
| Session ends, item was NOT used | -1 (decay) | Automatic on exhale/shutdown |

Auto-detection runs on every tool result during a session. The agent doesn't need to explicitly say "I'm using this protocol" — the system infers it from actions.

## Commands

| Command | What It Does |
|---------|-------------|
| `/pin <name>` | Lock a protocol or muscle to hot. It stays loaded and doesn't decay. |
| `/kill <name>` | Drop heat to zero. It won't load until used again or manually pinned. |

These work for both protocols and muscles. Tab-complete the name.

## Where Heat Lives

Heat is stored in two places, depending on the content type:

**Protocols and scripts** use `.soma/state.json` — a JSON file managed by the runtime:

```json
{
  "protocols": {
    "workflow": {
      "heat": 8,
      "lastReferenced": "2026-03-20",
      "pinned": false
    }
  },
  "scripts": {
    "soma-code.sh": {
      "count": 19,
      "lastUsed": "2026-03-20"
    }
  }
}
```

**Muscles and automations** store heat in their own frontmatter (`heat: N`). The file itself is the source of truth:

```yaml
---
type: muscle
name: e2e-flow-testing
heat: 5
---
```

This dual storage is a known architectural gap — see "Known Gaps" below.

## Configuration

All thresholds are configurable in `settings.json`. Only set what you want to change — defaults fill the rest.

```json
{
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
    "fullThreshold": 5,
    "digestThreshold": 1
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  }
}
```

See [Configuration](configuration.md) for the full settings reference.

## First Boot

On first boot (no `state.json` exists), heat is seeded from each protocol's `heat-default` frontmatter field:

| `heat-default` | Starting Heat | Tier |
|----------------|--------------|------|
| `hot` | 8 (= hotThreshold) | Full body loaded |
| `warm` | 3 (= warmThreshold) | Breadcrumb loaded |
| `cold` | 0 | Name listed only |

After first boot, heat evolves through use and decay. The `heat-default` is just the starting point.

## Programmatic Tracking

Heat and usage are tracked automatically — no manual updates needed:

| Content | What's tracked | Where stored | Mechanism |
|---------|---------------|-------------|-----------|
| Protocols | Heat (bump on reference, decay on exhale) | `state.json` | Auto-detect on tool_result |
| Muscles | Heat in frontmatter | Each muscle's `.md` file | `bumpMuscleHeat()` on focus match, decay on exhale |
| MAPs | Run count, last run date | Each MAP's frontmatter | `trackMapRun()` on .boot-target load |
| Scripts | Usage count, last used date | `state.json` | Auto-detect bash command regex on tool_result |
| Automations | Heat in frontmatter | Each automation's `.md` file | Bump/decay via `automations.ts` |

### Focus Overrides

The [Focus](/docs/focus) system and [MAPs](/docs/maps) can temporarily override heat for a session:

```yaml
# In a MAP's prompt-config:
prompt-config:
  heat:
    muscles:
      ship-cycle: 10       # force hot for this session
    protocols:
      workflow: 10
  force-include:
    muscles: [pre-flight-check]  # load even if cold
```

These overrides don't change the persisted heat — they apply only to the session's system prompt compilation.

## The Big Picture

Heat solves a fundamental problem: agents have limited context windows, but users accumulate knowledge over time. Without heat, you'd either load everything (wasting tokens on irrelevant content) or manually curate what loads (nobody does this).

With heat, the system self-organizes. Protocols you use daily stay hot and fully loaded. Muscles you haven't touched in a week cool down to digests, then to just names. If you need them again, one use warms them back up.

Context thresholds are percentages of the model's window — they scale automatically from 200K to 1M+ context models.

The result: **the agent's prompt reflects what you actually do, not what you once configured.**

## Known Gaps

We're being honest about where the heat system is today versus where it's going.

**Muscle heat doesn't bump on natural use.** Muscles only get heat bumped when matched by `soma focus`. A muscle that loads at boot because it's warm stays at the same heat forever — regular use during a session doesn't bump it. This means most muscle heat values sit at 0. Fix is in progress.

**Decay only runs on clean shutdown.** If a session crashes, gets interrupted, or rotates unexpectedly, `saveAllHeatState()` never fires. Heat stays stale until the next clean exit. Sessions that end with Ctrl+C don't save heat.

**Dual storage.** Protocols and scripts use `state.json` (centralized JSON). Muscles and automations use frontmatter in each file (distributed markdown). There's no single place to see the full heat picture. We're evaluating whether to unify this.

**No heat visibility command.** There's no way to run "show me what's hot" across all four AMPS layers. You have to read `state.json` and scan frontmatter in individual files. A unified heat dashboard is planned.

**Heat thresholds are hardcoded.** The cold/warm/hot boundaries (0-2, 3-7, 8+) and decay rate are in TypeScript, not in settings. Moving these to configurable settings is part of our [AMPS extraction trajectory](/blog/the-ratio#the-trajectory).

These are architectural gaps, not bugs — the system works within its current constraints. Heat tracking for protocols and scripts is solid. Muscle and automation heat needs the fixes above to reach the same level.

## Related

- [Configuration](configuration.md) — all heat thresholds, boot steps, context warnings
- [Protocols](protocols.md) — writing protocols, domain scoping, frontmatter
- [Muscles](muscles.md) — writing muscles, digest system, token budget
- [MAPs](maps.md) — workflow templates with prompt-config overrides
- [Focus](focus.md) — seam-traced boot priming with heat overrides
