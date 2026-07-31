---
name: doc-hygiene
type: muscle
status: active
description: "plans rot. Update `remaining` on every touch. Empty → archive. After shipping, scan for stale docs. Verify docs match code before referencing."
heat: 0
heat-default: warm
triggers: [doc-hygiene, plans-rot, stale-docs, context-hygiene, plan-lifecycle, archive, remaining, documentation, maintenance, plans, staleness]
scope: hub
tier: official
created: 2026-03-14
updated: 2026-04-04
version: 1.0.0
author: meetsoma
license: MIT
loads: 0
---

# Doc Hygiene

## TL;DR
**Doc Hygiene** — plans rot. Update `remaining` on every touch. Empty → archive. After shipping, scan for stale docs. Verify docs match code before referencing.

## Plan Lifecycle

Plans are living documents, not write-once specs.

### Required frontmatter
```yaml
status: active          # draft → active → blocked → complete → archived
remaining:
  - task one
  - task two
```

### Rules
1. **Update `remaining` every time you touch the plan.** Cross off what's done.
2. **Empty remaining → complete.** Set `status: complete`, move to archive.
3. **Plans older than 2 weeks without updates → stale.** Review: still relevant? Update or archive.
4. **Before starting work from a plan, verify it.** Does the plan match current code? Plans written 5 sessions ago may describe old architecture.

## Context Hygiene

Stale documentation creates false context that leads to wrong decisions.

### After shipping
1. **Scan for overlapping docs** — multiple plans covering the same area should be consolidated
2. **Archive completed plans** — `status: archived` with a note on what shipped
3. **Extract surviving ideas** — if an old plan has unshipped ideas worth keeping, pull them into a new doc before archiving
4. **Update references** — if other docs point to the archived plan, update them

### Before referencing
- **Verify against code** — don't trust a doc's claims. Check the source.
- **Check the `updated` date** — if it's weeks old, read with skepticism
- **If you find a stale doc mid-task** — fix it or flag it. Don't just work around it.

## Anti-patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Leave completed plans as "active" | Archive them, note what shipped |
| Reference a plan without checking if it's current | Verify claims against code |
| Delete plans with unshipped ideas | Extract ideas first, then archive |
| Let plans accumulate without review | Budget: ≤12 active plans |
| Write a plan and never update `remaining` | Touch remaining on every interaction |
