---
type: script
name: soma-compat
version: 1.0.0
status: active
author: meetsoma
license: MIT
language: bash
description: Check AMPS content for compatibility conflicts and redundancy
tags: [validation, compatibility, protocols, muscles, audit]
requires: [bash 4+, grep]
created: 2026-03-15
updated: 2026-03-21
---

# soma-compat

Compatibility checker for Soma AMPS content. Detects overlapping tags, redundant protocols, and directive conflicts before they cause confusion at runtime.

## What It Checks

| Check | What it catches |
|-------|----------------|
| **Tag overlap** | Two protocols covering the same tags (potential redundancy) |
| **Directive conflicts** | Contradictory instructions ("always do X" vs "never do X") |
| **Redundancy** | High tag overlap suggesting content should be merged |

## Usage

```bash
# Check your current .soma/ setup
soma-compat.sh

# Check a specific directory
soma-compat.sh path/to/protocols/
```

## Output

Returns a compatibility score (0–100) and lists specific conflicts:

```
σ Compatibility Check — 18 items
═══════════════════════════════
  🟢 92/100 — good compatibility

  ⚠️ OVERLAP: breath-cycle ↔ session-checkpoints — 50% tag overlap
```

## When to Use

- After installing new protocols or muscles from the hub
- Before submitting content to the community
- During periodic `.soma/` health checks

## Install

```bash
cp soma-compat.sh ~/.soma/amps/scripts/soma-compat.sh
chmod +x ~/.soma/amps/scripts/soma-compat.sh
```
