---
type: protocol
name: breath-cycle
status: active
heat-default: hot
applies-to: [always]
breadcrumb: "Sessions have 3 phases: inhale (boot, load identity + memory + protocols), hold (work, track context), exhale (flush state, update heat, write preload). Never skip exhale."
author: Soma Team
license: MIT
version: 1.0.0
created: 2026-03-09
updated: 2026-03-09
---

# Breath Cycle Protocol

## TL;DR
- Three phases, no exceptions: **inhale** (boot identity + memory + protocols), **hold** (work + track context), **exhale** (flush state + write preload)
- Exhale triggers at 85% context or on command — never skip it, or session learnings are lost
- Inhale loads: identity (layered) → preload → muscles (by heat) → protocols → project state
- Exhale writes: preload for next session → protocol heat state → muscle updates
- This protocol is meta — it governs when all other protocols load and when their heat updates

## Rule

Every agent session follows three phases. No exceptions.

### Inhale (Boot)
1. Discover memory directory (walk up filesystem)
2. Load identity (project → parent → global, layered)
3. Load preload if exists and fresh (< 48h)
4. Load muscles by heat (hottest first, within token budget)
5. Scan protocols — inject hot protocols fully, warm as breadcrumbs
6. Surface available scripts — agent knows its tools
7. Load project state for architecture context

### Hold (Work)
1. Monitor context usage (warn at 50%, 70%, 80%)
2. Track which protocols are being applied (heat events)
3. Track which muscles are being referenced
4. Do the actual work the human asked for

### Exhale (Flush)
1. Triggered at 85% context or by command
2. Extract session state into preload
3. Update protocol heat — heat up used protocols, decay unused
4. Update muscle frontmatter if muscles were referenced
5. Note any patterns worth crystallizing (muscle candidates)

### Pre-Publish Gate
Before any public push or release:
1. **Default is preservation.** Archive, move, gitignore — deletion requires justification.
2. Every file being removed: `grep -rn` tests and imports for references first.
3. Run all test suites after any removal. Count should not silently drop.

## Critical Rule

**Never skip exhale.** If context runs out before exhale, the session's learnings are lost. The 85% auto-trigger exists to prevent this. If the human ends the session early, exhale what you can.

## When to Apply

Always. This protocol governs the session lifecycle. It's meta — it's the protocol that makes other protocols work.

## When NOT to Apply

Never. This is always-on.
