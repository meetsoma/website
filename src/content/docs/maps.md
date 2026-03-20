---
title: "MAPs"
description: "My Automation Protocol Scripts — reusable workflow templates that tell the agent which muscles to load, which scripts to run, and in what order."
section: "Workflows"
order: 2
---

# MAPs — My Automation Protocol Scripts

<!-- tldr -->
MAPs are the navigation layer over AMPS. A MAP is a markdown file that describes a repeatable process — which muscles to read, which protocols to follow, which scripts to run, and in what order. MAPs live in `.soma/amps/automations/maps/`. Load a MAP with `soma --map <name>` to prime the agent's system prompt for that specific workflow.
<!-- /tldr -->

## What MAPs Solve

Without MAPs, each session starts generic. The agent loads muscles and protocols by heat — whatever was used recently gets loaded. But when you're doing a specific task (releasing, refactoring, debugging), you need specific tools loaded in the right order.

A MAP says: "For this task, load THESE muscles, follow THESE protocols, run THESE scripts, and here's the checklist."

## Creating a MAP

MAPs are markdown files with YAML frontmatter. Place them in `.soma/amps/automations/maps/`:

```yaml
---
type: map
name: my-workflow
status: active
created: 2026-03-18
triggers: [keyword1, keyword2]  # matched by soma focus
reads:
  muscles: [incremental-refactor, pre-flight-check]
  protocols: [workflow, quality-standards]
  scripts: [soma-code.sh, soma-verify.sh]
estimated-turns: 10-20
requires: [tested code changes]
produces: [pushed commit, updated docs]
prompt-config:
  heat:
    muscles:
      incremental-refactor: 10
      pre-flight-check: 10
    protocols:
      workflow: 10
  force-include:
    muscles: [incremental-refactor]
---

# My Workflow

## Steps

1. Pre-flight — read related code
2. Plan — break into sub-tasks
3. Execute — edit → test → commit per task
4. Ship — push + verify
```

## MAP Frontmatter Fields

| Field | Purpose |
|-------|---------|
| `triggers` | Keywords that match this MAP when using `soma focus` |
| `reads.muscles` | Muscles the agent should read before starting |
| `reads.protocols` | Protocols that govern this workflow |
| `reads.scripts` | Scripts used during execution |
| `estimated-turns` | Rough context budget for this task |
| `requires` | What must be true before starting |
| `produces` | What this MAP creates when complete |
| `prompt-config` | System prompt overrides (see below) |
| `runs` | Auto-incremented each time the MAP loads |
| `last-run` | Auto-updated with the date of last use |

## Prompt Config

The `prompt-config` section lets a MAP control the agent's brain for that session:

```yaml
prompt-config:
  heat:
    protocols:
      workflow: 10        # boost workflow protocol to hot
      frontmatter-standard: 0  # suppress frontmatter checks
    muscles:
      ship-cycle: 10      # ensure ship-cycle loads fully
  force-include:
    muscles: [pre-flight-check]  # load even if cold
  force-exclude:
    muscles: [css-theme-engine]  # don't load (saves tokens)
  identity: |
    This session is focused on shipping. Prioritize test → commit → push.
```

## Loading a MAP

### At session start

```bash
soma --map release-cycle    # start session with MAP loaded
```

This writes a `.boot-target` signal file that the boot system reads. The MAP's prompt-config overrides heat scores, and the MAP body is injected as navigation context.

### Via focus (keyword matching)

```bash
soma-focus.sh release       # traces "release" through memory
soma                        # boots with release-related MAPs loaded
```

`soma focus` matches the keyword against MAP `triggers` fields and loads relevant MAPs automatically.

## Tracking

MAP usage is tracked programmatically:
- `runs:` increments each time the MAP loads via `.boot-target`
- `last-run:` updates to the current date
- No manual tracking needed — the system handles it

## Built-in MAPs

Soma doesn't ship MAPs in the npm package (they're project-specific), but you can install community MAPs from the hub:

```bash
soma install map:release-cycle
```

Or create your own — any repeatable process deserves a MAP. The second time you do something manually, build a MAP.

## Meta-MAPs

A meta-MAP is a navigation hub that routes to sub-MAPs based on what you're doing. Instead of remembering which MAP to load, the meta-MAP presents the decision tree.

```yaml
---
type: map
name: my-project-dev
triggers: [my-project, dev]
---

# My Project Dev — Meta MAP

## What Are You Doing?

### Writing Code → use `dev-ship` MAP
### Releasing → use `release-cycle` MAP  
### Debugging → use `debug` MAP

## Sub-MAP Index
| MAP | When |
|-----|------|
| dev-ship | After every commit |
| release-cycle | Shipping a version |
| debug | Something's broken |
```

Meta-MAPs work especially well with `soma focus` — the keyword matches the meta-MAP's triggers, which loads it as navigation context. The meta-MAP's `prompt-config` also merges in, boosting the right muscles and protocols for the whole workflow area.

## Multi-Phase MAPs

For projects with sequential phases, chain MAPs using `next-map` and `refine-after` fields:

```yaml
---
name: my-project-p1-design
next-map: my-project-p2-build
refine-after: my-project-p0-plan
---
```

Each phase MAP starts rough and sharpens as earlier phases complete. The completing agent updates the next phase's `prompt-config` based on what it discovered — cascading intelligence across sessions.

## Related

- [Muscles](/docs/muscles) — learned patterns that MAPs reference
- [Protocols](/docs/protocols) — behavioral rules that MAPs follow  
- [Scripts](/docs/scripts) — tools that MAPs invoke
- [Heat System](/docs/heat-system) — how prompt-config overrides work
