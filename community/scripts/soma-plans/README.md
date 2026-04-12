---
type: script
name: soma-plans
version: 1.0.0
status: active
author: meetsoma
license: MIT
tier: official
language: bash
description: Plan lifecycle management — list, check, archive, and audit plans
tags: [plans, lifecycle, audit, workflow, hygiene]
requires: [bash 4+, grep, sed, awk]
created: 2026-03-21
updated: 2026-04-04
---

# soma-plans

## TL;DR
**`soma-plans.sh` — plan hygiene.** Plans rot. This tool helps you catch it. Use `status` to check your active plan count (≤12 recommended). Use `stale` to find plans nobody's touched in a week. Use `overlap` to catch duplicate efforts. Run on exhale to verify plan state. When you're about to create a new plan — check here first.

Manages the plan lifecycle — lists active plans, checks for stale or completed plans, and helps with archival. Works with the plan-hygiene protocol.

## Commands

- **`status`** — Active plan count + budget check (≤12 recommended).
- **`scan`** — List all plans with status, line count, last updated.
- **`stale [--days N]`** — Find plans not updated in N days (default: 7).
- **`overlap`** — Detect plans with overlapping topics.
- **`archive <plan>`** — Archive a completed plan.

## Usage

```bash
# Quick health check
soma-plans.sh status

# Find plans going stale
soma-plans.sh stale

# Before creating a new plan — check for overlap
soma-plans.sh overlap
```

## Install

```bash
soma hub install script soma-plans
```
