---
type: muscle
name: task-tooling
status: active
heat-default: warm
heat: 0
loads: 0
breadcrumb: "Before starting any task, map which scripts, muscles, and tools apply. Name the tool for each phase. When a gap exists, say so explicitly."
author: meetsoma
license: MIT
version: 1.0.0
tier: official
scope: hub
topic: [workflow, awareness, planning, tools]
keywords: [task-tooling, map-tools, situational-awareness, scripts, muscles, gaps]
created: 2026-03-14
updated: 2026-03-15
---

# Task Tooling

<!-- digest:start -->
> **Task Tooling** — before starting any task, map which scripts and muscles apply. Name the tools per phase. When a gap exists, say so explicitly.
<!-- digest:end -->

## The Pattern

When a task is identified, before writing any code:

### 1. Scan — What tools exist?

```markdown
## Tooling Map for [TASK]

| Phase | Tool | Status |
|-------|------|--------|
| Research | grep, read existing code | ✅ ready |
| Implementation | edit, write | ✅ ready |
| Testing | project test suite | ✅ ready |
| Verification | — | ❌ gap — no verify script |
| Shipping | git commit + push | ✅ ready |
```

### 2. Assess — What's missing?

For each gap:
- Can you work around it? (manual steps)
- Should you build it? (only if reusable)
- Should you extend an existing tool? (preferred)

### 3. Surface — Put it in the plan

The tooling map goes into your plan, preload, or session log. Future sessions inherit the awareness.

## Why This Matters

A senior engineer doesn't start a task without knowing which tools they'll reach for. The agent should demonstrate the same awareness:

- "For this work, I'll use X for research, Y for testing, and Z for verification"
- "We don't have a tool for testing this in isolation — should I build one, or manual-test?"
- "The verify script covers A but not B — I'll add that after"

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Start coding without checking what tools exist | Map tools first, code second |
| Wait for the user to say "use X script" | Already know it applies |
| Build a new tool when an existing one needs a flag | Extend first, create when domains differ |
| Only mention scripts, ignore muscles/patterns | Scripts = hands, muscles = habits. Both matter. |
