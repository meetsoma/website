---
title: "Focus"
description: "Topic-driven session priming — boost relevant muscles, MAPs, and preloads automatically."
section: "Workflows"
order: 11
---


<!-- tldr -->
Run `soma-focus.sh <keyword>` before starting a session to prime the agent for a specific topic. It traces the keyword through your memory, scores muscle/protocol/MAP relevance, and generates system prompt overrides. The agent wakes up already knowing what to focus on.
<!-- /tldr -->

## The Problem

Every session starts generic — the agent loads whatever muscles and protocols are hottest by heat score. If you're about to work on "authentication" but your last session was about "CSS theming," the CSS muscles are hot and the auth muscles are cold. You waste turns re-orienting.

## The Solution

Focus priming runs **before** the model starts. It traces your keyword through:

- **Muscles** — tags, keywords, triggers, digest content
- **Protocols** — content matching
- **MAPs** — trigger keywords, name matching
- **Sessions** — past session logs mentioning the keyword
- **Preloads** — continuation state with relevant context

Everything that matches gets heat-boosted. High-relevance items get force-included. The agent boots already focused.

## Usage

```bash
# Step 1: Set focus
soma-focus.sh authentication

# Step 2: Start session — agent boots primed
soma

# Other commands:
soma-focus.sh show            # see current focus state
soma-focus.sh clear           # remove focus
soma-focus.sh dry-run auth    # preview without writing
```

## How Matching Works

Each muscle is scored against the keyword:

| Match type | Score | Example |
|-----------|-------|---------|
| Explicit trigger (`triggers: [auth]`) | 10 | Muscle declares it activates on "auth" |
| Tag match (`tags: [auth]`) | 5 | Muscle is tagged with the keyword |
| Keyword match (`keywords: [auth]`) | 5 | Keyword in frontmatter keywords list |
| Topic match (`topics: [auth]`) | 4 | Topic in frontmatter topics list |
| Name contains keyword | 3 | `auth-flow.md` matches "auth" |
| Digest contains keyword | 2 | Keyword appears in the muscle summary |

Muscles scoring 5+ are **force-included** (loaded even if normally cold). Heat is set to `score × 2` — so a tag match (score 5) gets heat 10 (HOT tier, full body in prompt). Score-3 matches get heat 6 (WARM tier, digest only).

When a related MAP is loaded, its `prompt-config` heat overrides merge in — MAP settings win on conflict since they're more specific than keyword scoring.

## Adding Triggers to Your Content

Add `triggers:` to muscle frontmatter to control what activates on focus:

```yaml
---
type: muscle
name: auth-flow
triggers: [auth, login, oauth, jwt, session]
tags: [security, backend]
---
```

Shorthand format — each keyword becomes a focus trigger:
```yaml
triggers: [css, theming, tokens, design-system]
```

Full format — specify trigger type:
```yaml
triggers:
  - on: focus
    match: "css"
  - on: focus
    match: "design"
```

## How It Integrates

Focus writes a `.boot-target` file in `.soma/`. The boot system reads it and applies:

1. **Heat overrides** — matched muscles/protocols get boosted
2. **Force-includes** — high-scoring items load regardless of heat
3. **Preload injection** — latest preload mentioning the keyword is loaded
4. **MAP loading** — up to 3 related MAPs injected as navigation context
5. **Supplementary identity** — focus context added to the agent's identity

The `.boot-target` is consumed (deleted) after boot — focus is a one-shot prime.

## Related

- [MAPs](/docs/maps) — workflow templates surfaced by focus
- [Muscles](/docs/muscles) — learned patterns with trigger support
- [Heat System](/docs/heat-system) — how heat overrides work
- [Scripts](/docs/scripts) — `soma-focus.sh` reference
