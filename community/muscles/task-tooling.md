---
name: task-tooling
type: muscle
status: active
description: "Before touching code, name your tools. Map scripts, muscles, and MAPs for each phase of the task. Gaps are worth building for."
heat: 0
triggers: [scripts, muscles, tools, tooling, plan, implementation, gap, extend, planning, meta]
tags: [workflow, planning, tools, scripts, awareness]
applies-to: [any]
created: 2026-03-13
updated: 2026-04-18
tools: [soma-query.sh, soma-find.sh, soma-plans.sh]
version: 1.0.0
author: meetsoma
license: MIT
heat-default: warm
tier: official
---

# Task Tooling

## TL;DR
**Before touching code, name your tools.** For each phase of the task, which script handles it? Which muscle applies? Where's the MAP? When there's no tool for a phase, say so — that's a gap worth building for. The agent who maps tools before starting finishes faster than the agent who reaches for raw grep mid-task. Check: `ls .soma/amps/scripts/*.sh`, `grep -rl "<keyword>" .soma/amps/muscles/`, `ls .soma/amps/automations/maps/`. If a MAP exists, read it first. If a muscle matches, load it with `/pin`. If no script covers it, consider building one — scripts survive across sessions, memory doesn't.

## The Pattern

When a task is identified (from a plan, kanban item, or user request), before writing any code:

### 1. Scan — What tools exist for this work?

```markdown
## Tooling Map for [TASK]

### Scripts
| Phase | Script | Status |
|-------|--------|--------|
| Research Pi internals | `soma-explore-pi.sh` | ✅ ready |
| Post-commit ship | `soma-ship.sh` | ✅ ready |
| Verify ecosystem | `soma-verify.sh` | ✅ ready |
| Test extensions | — | ❌ gap — no extension test harness |

### Muscles
| Phase | Muscle | Why |
|-------|--------|-----|
| Modifying extensions | `incremental-refactor` | Existing code, need scan→plan→execute |
| Shipping changes | `ship-cycle` | Multi-repo sync |
| Runtime changes | `self-restart` | Hot-swap after extension edits |

### Plans
| Plan | Path | Status |
|------|------|--------|
| Session notifications | `archive/projects/session-notifications/plan.md` | active — 4 research items, 2 impl phases |
```

### 2. Assess — What's missing or needs updating?

For each gap (`❌`):
- Can we work around it? (often yes — manual steps)
- Should we build it? (only if we'll use it again)
- Should we extend an existing tool? (preferred — less to maintain)

For each tool marked ready:
- Does it actually cover our specific use case? Or does it need a new subcommand/flag?
- Example: `soma-verify.sh` exists but might need a `notifications` subcommand after this work

### 3. Surface — Put it in the plan or preload

The tooling map goes into:
- **The plan** (if one exists) — under a `## Tooling` section
- **The preload** — under `## Implementation Notes` so the next session knows
- **Session log** — if a gap was discovered mid-work

## When to Apply

- **Starting a new plan** — map tools as part of the planning phase
- **Resuming from preload** — verify tools still apply, note any new ones built since
- **Mid-task** — when you reach for a tool and realize it doesn't exist or needs updating
- **Session end** — note which tools were used, which gaps were felt

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Start coding without checking what tools exist | Map tools first, code second |
| Forget about muscles during implementation | Muscles ARE the implementation patterns |
| Wait for the user to say "use soma-ship.sh" | Already know it applies post-commit |
| Build a new script when an existing one needs a flag | Extend first, create only when domains differ |
| Only mention scripts, ignore muscles | Scripts = mechanical, muscles = behavioral. Both matter. |

## Trust Through Verification (from MLR Cycle 1, s01-7631fc)

Tools you built but don't use are tools you don't trust. Trust comes from VERIFIED USEFULNESS — not from being told "use this." At session start, when you load this muscle, remember:

- You reach for `grep` because it's familiar. `soma-code.sh find` does the same thing with file:line formatting.
- You reach for `ls` on extension dirs. `soma-dev.sh status` shows extensions, hooks, git state, and cmux layout in one command.
- You reach for manual GitHub API calls. `soma-pr.sh` wraps the entire token + PR flow.
- You reach for `grep -r` across .soma/. `soma-seam.sh trace` does this AND follows frontmatter connections.

The tools work. They were verified (s01-7631fc, 11/11). Use them FIRST. If they don't cover the case, EXTEND them — don't abandon them for raw alternatives.

## The Deeper Point

Scripts are your hands. Muscles are your habits. Plans are your map. A senior engineer doesn't start a task without knowing which tools they'll reach for — and they notice immediately when a tool is missing. The agent should demonstrate this same awareness:

- "For this work, I'll use X for research, Y for shipping, and Z for verification"
- "We don't have a tool for testing extensions in isolation — should I build one, or manual-test?"
- "soma-verify.sh covers repo sync but not notification behavior — I'll add a subcommand after"

This is the difference between executing instructions and understanding the workspace.

## Origin

Session 10 — Curtis observed that tool awareness shouldn't be reactive ("oh right, we have a script for that") but proactive ("here's which tools apply to each phase, and here's what's missing").
