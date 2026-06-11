---
title: "Focus"
description: "Topic-driven session priming — boost relevant muscles, MAPs, and preloads automatically."
section: "Workflows"
order: 11
---

# Focus — Seam-Traced Boot

<!-- tldr -->
Run `soma focus <keyword>` before starting a session to prime the agent for a specific topic. It traces the keyword through your memory, scores muscle/protocol/MAP relevance, and generates system prompt overrides. The agent wakes up already knowing what to focus on.
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
soma focus authentication

# Step 2: Start session — agent boots primed
soma

# Other commands:
soma focus show            # see current focus state
soma focus clear           # remove focus
soma focus dry-run auth    # preview without writing
```

## How Matching Works

Each muscle is scored against the keyword by `matchMusclesToFocus` in `core/muscles.ts`:

| Match type | Score | Example |
|-----------|-------|---------|
| **Activation list** match | 10 | Keyword appears in the muscle's merged trigger list |
| Name contains keyword | 3 | `auth-flow.md` matches "auth" |
| Digest contains keyword | 2 | Keyword appears in the muscle's TL;DR/digest |

The **activation list** is a deduplicated merge of three frontmatter fields: `triggers`, `keywords`, and `topic` (singular). Any match against any of them counts as a trigger match (score 10). The `tags` field is **not** used for focus matching — it's for heat classification and natural-use detection only.

- Muscles scoring `>= 8` are **force-included** (loaded even if normally cold)
- Heat override = `score + 2` — so a trigger match (score 10) gets heat 12 (HOT tier). Score-3 matches get heat 5 (WARM tier).
- Shell-side `soma-focus.sh` does a parallel seam-trace (multi-word keyword expansion, session matching, MAP matching) — its scores merge in via the `.boot-target` promptConfig; boot-side and shell-side both contribute, and the higher wins per muscle.

When a related MAP is loaded, its `prompt-config` heat overrides merge in — MAP settings win on conflict since they're more specific than keyword scoring.

## Adding Triggers to Your Content

Add `triggers:`, `keywords:`, or `topic:` to muscle frontmatter to control what activates on focus — all three are merged into one activation list:

```yaml
---
type: muscle
name: auth-flow
triggers: [auth, login, oauth, jwt, session]  # explicit focus triggers
keywords: [bearer, credentials]                # also merged into triggers
topic: authentication                           # also merged
tags: [security, backend]                       # NOT used for focus matching
---
```

Only `triggers` + `keywords` + `topic` participate in `soma focus` matching. `tags` is separate (used for heat defaults and natural-use detection elsewhere in Soma).

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
- [Scripts](/docs/scripts) — `soma focus` reference
