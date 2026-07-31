---
name: plan-lifecycle
type: muscle
status: active
description: "end-to-end flow from idea to shipped to consolidated. (1) **Idea** → capture in `docs/ideas/`, link from kanban. (2) **Revise** → read against current state, strip what's done/stale, extract survi"
heat: 0
triggers: [plan, idea, pre-flight, kanban, preload, consolidation, lifecycle, planning, execution, preloads]
applies-to: [any]
created: 2026-03-14
updated: 2026-04-18
tools: [soma-plans.sh]
loads: 0
seams: [s01-3498d3]
version: 1.0.0
author: meetsoma
license: MIT
heat-default: warm
tier: official
---
# Plan Lifecycle

## TL;DR
**Plan Lifecycle** — end-to-end flow from idea to shipped to consolidated. (1) **Idea** → capture in `docs/ideas/`, link from kanban. (2) **Revise** → read against current state, strip what's done/stale, extract surviving kernel. (3) **Plan** → rewrite as version-scoped plan in `plans/` (or `docs/plans/` if cross-cutting), with phases, remaining, tooling. (4) **Pre-flight** → check what exists, verify assumptions, find overlapping plans. (5) **Correct plan** → update phases based on findings. (6) **Kanban tasks** → with `plan: path` and section references. (7) **Targeted preload** → file:line references for the executor session. (8) **Execute** → focused session, tests pass, ship. (9) **Consolidate** → mark plan complete, extract surviving ideas back to `docs/ideas/`, compare against kanban. Loop back to step 2 for next phase.

## The Pipeline

### 1. Idea → Capture

```
Write idea file → kanban task → keep working
```
- File: `.soma/docs/ideas/<name>.md`
- Kanban: `- [ ] Description (added:DATE) <!-- id:SOMA### -->`
- Don't scope yet. Just capture the thought.

### 2. Plan → Scope

When ready to work on an idea, promote to plan:
- File: `.soma/plans/<name>.md` or `.soma/plans/<name>.md`
- Required frontmatter: `type: plan`, `status: active`, `remaining: [...]`, `tooling: {}`
- Break into phases with clear deliverables
- Each phase should be independently shippable

### 3. Pre-flight → Verify Assumptions

**Before writing any code**, run the pre-flight check:
- Does this already exist? (`grep`, ATLAS, `soma-query.sh search`)
- Are there overlapping plans? (scan `plans/` and `releases/`)
- Do the code paths I plan to modify still look the way the plan assumes?
- Are the test files where I expect them?
- Are there muscles/scripts that cover parts of this work?

Pre-flight findings go back into the plan as corrections.

### 4. Correct Plan → Remove Wrong Assumptions

Update the plan based on pre-flight:
- Remove phases that are already done (or done differently than expected)
- Fix file paths, function names, line numbers that drifted
- Add discovered dependencies the original plan missed
- Update `remaining` to reflect actual work needed

### 5. Kanban Tasks → With References

Each task on the kanban should reference the plan:
```
- [ ] Implement countdown grace period (plan: archive/projects/session-notifications/plan.md §Grace Period) <!-- id:SOMA258 -->
```
- Reference specific sections of the plan
- Include blockers and dependencies
- One task per shippable unit

### 6. Targeted Preload → Surgical Briefing

For complex tasks, write a preload that's a **surgical briefing**:

```markdown
## Implementation Map

### Phase 1: Add graceTurns setting
- `repos/agent-stable/core/settings.ts:136-145` — add graceTurns to BreatheSettings type
- `repos/agent-stable/core/settings.ts:348-352` — add default value
- `repos/agent-stable/docs/configuration.md:370-376` — document in settings table

### Phase 2: Countdown logic
- `repos/agent-stable/extensions/soma-boot.ts:193-210` — add state variables
- `repos/agent-stable/extensions/soma-boot.ts:1107-1120` — replace instant rotation with countdown
- `repos/agent-stable/extensions/soma-boot.ts:1155-1170` — reset in session_switch

### Phase 3: Tests
- `repos/agent-stable/tests/test-auto-breathe.sh:285-300` — add countdown test section
```

This is the most efficient format. The executing session reads the preload, has exact file:line targets, and executes without exploration. 20% context used, all tests pass, ship.

### 7. Execute → Ship

- Follow the preload's implementation map
- Test after each phase
- Commit atomically per phase
- Ship via `soma-ship.sh`
- Log to session

### 8. Consolidate → Clean Up

After shipping, sweep related plans:

**For each plan in the feature area:**

| State | Action |
|-------|--------|
| All remaining items done | `status: complete`, `remaining: []` |
| Mostly stale, some surviving ideas | Extract ideas → new idea files, then archive |
| Overlaps with other plans | Merge into condensed version |
| Still has active remaining items | Update `remaining`, keep active |

**Condensed merge format** (when consolidating multiple stale plans):
```markdown
# [Feature Area] — Consolidated Plan History

## What Shipped
- Phase 1: X (commit, date)
- Phase 2: Y (commit, date)

## What Didn't Ship (and why)
- Z — descoped, too complex for v1
- W — superseded by different approach

## Key Decisions
- Chose Option A over B because...
- Originally planned X but discovered Y during pre-flight

## Surviving Ideas (extracted to docs/ideas/)
- idea-name.md — brief description

## Original Plans (archived)
- plan-a.md (archived DATE)
- plan-b.md (archived DATE)
```

**Compare against kanban:** ensure done items match reality, parked items have reasons, active items still make sense.

## The Targeted Preload Pattern

The session where we had line numbers for every edit was the most efficient. The pattern:

1. **Before rotating**, the current session writes a preload with exact `file:line` targets
2. Each target includes WHAT to change, not just WHERE to look
3. The fresh session reads the preload and executes mechanically
4. No exploration, no "let me check what this file looks like"
5. Result: 20% context, all tests pass, clean ship

**When to write targeted preloads:**
- Task is well-scoped (plan is corrected, pre-flight done)
- Multiple files need coordinated changes
- The current session has full context of the codebase state
- The next session shouldn't need to rediscover what this session already knows

**When NOT to write targeted preloads:**
- Task is exploratory (need to read and understand first)
- Scope is unclear (plan needs more pre-flight)
- Single-file change (just do it, don't over-plan)

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Write a plan and never update it | Update `remaining` on every touch |
| Keep 5 stale plans for the same feature | Consolidate into one with history |
| Start coding without pre-flight | Verify assumptions first — code drifts |
| Write a preload with vague targets | Include file:line, what to change, why |
| Archive a plan without extracting ideas | Pull out surviving ideas first |
| Leave kanban tasks without plan refs | Reference specific plan sections |

## Origin

Session 16 — We observed that post-ship plan cleanup should be systematic, not ad-hoc. The targeted preload pattern from an earlier session (line-by-line references, 20% context used) proved that surgical briefings dramatically reduce waste. Combined into a full idea→ship→consolidate lifecycle.
