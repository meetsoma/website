---
title: "Protocols & Heat"
description: "Behavioral rules, heat system, domain scoping, writing your own."
section: "Core Concepts"
order: 3
---

# Protocols

<!-- tldr -->
Behavioral rules in `.soma/amps/protocols/` as markdown with YAML frontmatter. Loaded by heat: hot (≥8) = full body, warm (≥3) = TL;DR/description only, cold = name only. Heat rises on use (+1 auto-detect), decays per session if unused. Domain scoping via `applies-to` field. Write your own: add `name`, `heat-default`, `description`, `applies-to` frontmatter. Configure thresholds in `settings.json`.
<!-- /tldr -->

Protocols are behavioral rules that guide Soma's actions. They live in `.soma/amps/protocols/` as markdown files with YAML frontmatter.

## Built-in Protocols

Soma ships with 16 protocols, scaffolded on `soma init`:

| Protocol | Default Heat | What It Does |
|----------|-------------|-------------|
| `breath-cycle` | hot | Sessions have phases: inhale, hold, exhale. Never skip exhale. |
| `correction-capture` | warm | When corrected: acknowledge, don't justify. Second time → muscle. |
| `detection-triggers` | warm | When to capture patterns, preferences, and knowledge gaps. |
| `frontmatter-standard` | warm | All `.md` files get YAML frontmatter with type, status, dates. |
| `git-identity` | warm | Commits use the correct name/email for the repo context. |
| `heat-tracking` | hot | Protocols and muscles have temperature that rises on use and decays. |
| `maps` | warm | Check for MAPs before tasks. Build MAPs after repeated processes. |
| `pattern-evolution` | warm | Skills → Muscles → Protocols → Automations. Born from friction. |
| `plan-hygiene` | warm | Plans rot. Track status, remaining, budget ≤12 active. |
| `pre-flight` | warm | Check what exists before building. Prevent duplication. |
| `quality-standards` | warm | Clean commits, close the loop, tests match shipped code. |
| `response-style` | warm | Voice, length, emoji, format preferences. |
| `session-checkpoints` | warm | Session logs capture what happened AND what was noticed. |
| `task-tracking` | warm | One board. Move cards in real time. Verify on exhale. |
| `tool-discipline` | warm | Scripts first, then raw commands. Build tools for yourself. |
| `working-style` | warm | Read before write. Verify before claiming. |

## Heat

Every protocol has a temperature. Hot (8+) loads the full body. Warm (3-7) loads the `## TL;DR` (or the `description` breadcrumb if there's no TL;DR section). Cold (0-2) shows the name but nothing else.

Heat rises when a protocol gets used (auto-detected from tool results) and decays by 1 each session if unused. `/pin` locks something hot. `/kill` drops it to zero.

Protocol heat is stored in `.soma/state.json`. For the full deep-dive on how heat works across all AMPS layers, see the Heat System doc.

## Writing Your Own Protocol

### 1. Create the file

```bash
cp .soma/amps/protocols/_template.md .soma/amps/protocols/my-protocol.md
```

### 2. Edit the frontmatter

```yaml
---
type: protocol
name: my-protocol
status: active
updated: 2026-03-09
heat-default: warm
applies-to: [typescript]
description: "One sentence that captures what this protocol enforces — the warm-tier fallback if there's no ## TL;DR section."
---
```

**Required frontmatter fields:**

| Field | Purpose |
|-------|---------|
| `name` | Protocol identifier (used in heat state, `/pin`, `/kill`) |
| `heat-default` | Starting temperature: `cold`, `warm`, or `hot` |
| `description` | One sentence; the warm-tier fallback breadcrumb when the protocol has no `## TL;DR` |

**Optional fields:**

| Field | Default | Purpose |
|-------|---------|---------|
| `applies-to` | `[always]` | Domain signals this protocol applies to |
| `scope` | `local` | `local` = project only, `shared` = eligible for parent chain, `core` = built-in behavior documentation (never loads into prompt) |
| `tier` | `community` | `community` or `official` |

### 3. Write the body

```markdown
# My Protocol

## TL;DR
- Dense bullet points
- What the agent MUST do
- 3-7 bullets max

## Rule

The detailed behavioral rules go here. This is loaded when the protocol is hot.

## When to Apply

Contexts where this activates.

## When NOT to Apply

Explicit exclusions.
```

### 4. The three loading tiers

| Tier | What the Agent Sees | When |
|------|-------------------|------|
| **TL;DR** | `## TL;DR` section (or the `description` breadcrumb if absent) | Protocol is warm |
| **Full body** | Entire file (minus frontmatter) | Protocol is hot |

Write a `## TL;DR` — it's what loads at warm. Keep the `description` self-contained too, as the fallback when a protocol has no TL;DR.

## Protocol Resolution Chain

Protocols resolve from project → parent → global, with project protocols shadowing same-named parent/global ones:

```
CWD/.soma/amps/protocols/       ← project (highest priority)
  ↓
../.soma/amps/protocols/         ← parent (if exists)
  ↓
~/.soma/amps/protocols/          ← global (lowest priority)
```

If both project and global define `git-identity.md`, the project version wins.

## Files to Know

| File | Purpose |
|------|---------|
| `.soma/amps/protocols/*.md` | Protocol definitions |
| `.soma/amps/protocols/_template.md` | Template for new protocols |
| `.soma/state.json` | Heat state (auto-managed, don't edit) |
| `.soma/settings.json` | Override heat thresholds |
