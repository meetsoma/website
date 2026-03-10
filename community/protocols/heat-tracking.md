---
type: protocol
name: heat-tracking
status: active
heat-default: hot
applies-to: [always]
breadcrumb: "Protocols have temperature: cold (not loaded), warm (breadcrumb in prompt), hot (full in prompt). Heat rises on use (+1/+2), decays per session if unused (-1). Thresholds configurable."
author: meetsoma
license: MIT
version: 1.0.0
tier: core
tags: [memory, loading, performance]
created: 2026-03-09
updated: 2026-03-10
---

# Heat Tracking Protocol

## TL;DR
- Three temperatures: **cold** (0-2, name only), **warm** (3-7, breadcrumb in prompt), **hot** (8+, full body in prompt)
- Heat rises on use: +2 explicit reference, +1 applied in action. Decays -1 per session if unused
- Pin to hot: user says "always use X" → heat 10. Kill: "stop using X" → heat 0
- Limits: max 3 full protocols in prompt, max 10 breadcrumbs. Highest heat wins ties
- State persists across sessions, updated during exhale phase

## Rule

Every protocol has a temperature that determines how it loads into the agent's system prompt.

### Temperature Scale

| Range | State | System Prompt Behavior |
|-------|-------|----------------------|
| 0-2 | COLD | Not loaded. Discoverable via search. |
| 3-7 | WARM | Breadcrumb (1-2 sentence TL;DR) injected. |
| 8+ | HOT | Full protocol content injected. |

### Heat Events

| Event | Δ Heat | Example |
|-------|--------|---------|
| User explicitly references protocol | +2 | "Use the frontmatter standard" |
| Agent applies protocol in action | +1 | Agent adds frontmatter to a file |
| Session ends, protocol was used | +0 | Heat holds, no decay |
| Session ends, protocol NOT used | -1 | Cooling — unused protocols fade |
| User says "always use X" | → 10 | Manual pin to HOT |
| User says "stop using X" | → 0 | Manual kill to COLD |

### Limits (Token Budget)

- Max full protocols in prompt: 3
- Max breadcrumbs in prompt: 10
- Max heat: 15
- Decay rate: 1 per unused session

If more protocols qualify for HOT than the max, highest heat wins. Same for WARM breadcrumbs.

## When to Apply

During every inhale (protocol loading) and every exhale (heat update). This protocol is always-on.

## When NOT to Apply

If you prefer static protocol loading (all protocols always fully loaded), disable heat tracking and load everything. Works fine for small protocol sets.
