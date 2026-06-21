---
title: "Heat System"
description: "How Soma decides what to load — temperature-based relevance that adapts through use."
section: "Core Concepts"
order: 3.5
---

# Heat System

<!-- UPDATE WHEN: heat thresholds change, new tier added, decay/boost logic changes -->
<!-- SEAMS: configuration.md#heat, protocols.md#heat-tracking, muscles.md#heat, how-it-works.md#heat -->

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
| 🟡 Warm | Description — a single sentence from the `description:` frontmatter field | "Commits must be attributed correctly. Check git config user.email before first commit." |
| ❄️ Cold | Just the protocol name in a list | `- git-identity` |

**Muscles:**
| Tier | What Loads | Example |
|------|-----------|---------|
| 🔥 Hot | Full muscle body — all learned patterns, rules, examples | The complete SVG logo design muscle with all techniques |
| 🟡 Warm | TL;DR only — the `## TL;DR` section of the muscle | A 3-line summary of the muscle's key rules |
| ❄️ Cold | Name listed so the agent knows it exists | `- svg-logo-design` |

### Token Budget

Muscles have a token budget (default: 2000 estimated tokens). Hot muscles load first (up to 2 full muscles), then warm muscles fill remaining budget with TL;DRs (up to 8). This prevents muscles from consuming the entire context window.

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

**Note:** Core protocols (`scope: core`) can't be pinned or killed — their behavior is built into extensions, not loaded via heat. `/pin breath-cycle` will explain this.

## Where Heat Lives

**Protocols:** Heat state is stored in `.soma/state.json` — a JSON file managed by the runtime. You don't edit this directly.

```json
{
  "protocols": {
    "breath-cycle": {
      "heat": 10,
      "last_referenced": "2026-03-09",
      "times_applied": 42,
      "pinned": false
    },
    "frontmatter-standard": {
      "heat": 5,
      "last_referenced": "2026-03-08",
      "times_applied": 18,
      "pinned": false
    }
  }
}
```

**Muscles + Automations:** Heat is stored in `.soma/state.json` (alongside protocols, in `muscles` / `automations` dicts), updated in-memory during a session and saved once at exhale. The frontmatter `heat: N` is a **static seed** — read once to seed a muscle's first state entry, then never written (so muscle files don't churn every session).

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
| Protocols | Heat events (applied, referenced, pinned) | `state.json` (`protocols.{name}`) | `recordHeatEvent()` on tool_result |
| Muscles | heat, timesApplied | `state.json` (`muscles.{name}`) | `seedAndOverlayMuscleHeat()` at boot, `recordMuscleHeat()` on use, decay at exhale |
| Automations | heat, timesApplied | `state.json` (`automations.{name}`) | `seedAndOverlayAutomationHeat()` / `recordAutomationHeat()` |
| MAPs (run-count) | runs, last-run date | Frontmatter (`runs:`, `last-run:`) | `trackMapRun()` on .boot-target load |
| Scripts | Usage count, last used date | `state.json` (`scripts.{name}`) | Auto-detect on `tool_result` (bash command regex) |

> **Note (v0.36.0):** muscle + automation **heat** moved out of `.md` frontmatter into `state.json`
> (no more per-session file churn). Frontmatter `heat:` is now a one-time **seed** only. MAP **run-count**
> (`runs:`/`last-run:`) is separate and still lives in frontmatter.

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

## New Muscle Visibility (cold-start boost)

A muscle or automation you just wrote should be loaded **even if it's never been triggered yet**. The heat tier system handles this with a **cold-start boost**: any item created in the last 48 hours gets a temporary heat floor.

The rule (`core/utils.ts` `tierByHeat`):

```
effective_heat = max(raw_heat, digestThreshold + 3)   # if item.created < 48h old
effective_heat = raw_heat                              # otherwise
```

With default `digestThreshold = 1`, that means a brand-new muscle starts at **effective heat 4** (above the digest threshold, just below the full-load threshold). It loads as a TL;DR digest in the system prompt for the first 48 hours, even if nothing has triggered it. After 48 hours, the boost lifts and the item's actual usage takes over.

**Why:** without this, a muscle written Tuesday wouldn't be visible to the agent until Wednesday's correction triggered it. The boost ensures "my just-written context shows up next session." After the window, the heat system's normal usage-based promotion takes over.

**Scope:** the boost applies to **muscles** and **automations** (anything tiered through `tierByHeat`). **Protocols** use different logic (always-on for warm-tier, no time-based boost).

### Budget overflow

Even boosted, items can fall to a lower tier if the **token budget** doesn't accommodate them.

- **`maxFull`** caps how many items load fully expanded in the hot tier (default: 2 muscles).
- **`maxDigest`** caps how many items load as TL;DR digests in the warm tier (default: 8 muscles).
- **`tokenBudget`** caps total muscle tokens (default: 2000).

When a muscle qualifies for hot by heat (heat ≥ 5) but `maxFull` is already filled by hotter items, it **falls to warm** (TL;DR digest) instead. Same logic for warm → cold (just the name).

Result: heat is necessary, not sufficient. A new muscle gets the cold-start boost into the warm tier; whether it actually loads depends on whether 8 hotter muscles already filled the budget.

### Verifying it for a specific muscle

If a just-written muscle isn't loading, check the order:

1. **Created < 48h ago?** Frontmatter `created:` field. If older, it's not a cold-start case — it needs heat from usage or an explicit `pin` bump.
2. **Above digest threshold?** With `digestThreshold = 1` and the boost of `+3`, effective heat is at least `1 + 3 = 4` for new items. Should clear `digestThreshold` easily.
3. **Within `maxDigest`?** If 8 hotter muscles are loaded, the new one falls to cold (name-only).
4. **Within `tokenBudget`?** Even within `maxDigest`, if total digest tokens exceed `tokenBudget`, items get truncated.

For protocols (different logic): they always load if any of: heat ≥ `hotThreshold` (full content), heat ≥ `warmThreshold` (digest), referenced by an active automation, or explicitly pinned.

## The Big Picture

Heat solves a fundamental problem: agents have limited context windows, but users accumulate knowledge over time. Without heat, you'd either load everything (wasting tokens on irrelevant content) or manually curate what loads (nobody does this).

With heat, the system self-organizes. Protocols you use daily stay hot and fully loaded. Muscles you haven't touched in a week cool down to TL;DRs, then to just names. If you need them again, one use warms them back up.

Context thresholds are percentages of the model's window — they scale automatically from 200K to 1M+ context models.

The result: **the agent's prompt reflects what you actually do, not what you once configured.**

## Related

- [Configuration](configuration.md) — all heat thresholds, boot steps, context warnings
- [Protocols](protocols.md) — writing protocols, domain scoping, frontmatter
- [Muscles](muscles.md) — writing muscles, TL;DR system, token budget
- [MAPs](maps.md) — workflow templates with prompt-config overrides
- [Focus](focus.md) — seam-traced boot priming with heat overrides
