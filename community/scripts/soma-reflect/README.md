---
type: script
name: soma-reflect
version: 1.0.0
status: active
author: meetsoma
license: MIT
tier: official
language: bash
description: Parse session logs for observations, gaps, and recurring patterns
tags: [memory, reflection, patterns, session-logs, observations]
requires: [bash 4+, grep, sed, awk]
created: 2026-03-21
updated: 2026-04-04
---

# soma-reflect

## TL;DR
**`soma-reflect.sh` — your pattern detector.** Run at session start to check what past sessions learned. Run mid-session to see if a problem was seen before. Use `--gaps` to find recurring issues. Use `--recurring` to find patterns worth escalating to muscles. The session logs are full of insights — this tool surfaces them so they don't stay buried.

Scans your session logs for observations, gaps, corrections, and recurring patterns. Surfaces insights that would otherwise be buried in conversation history.

## Commands

- **`(default)`** — Scan last 7 days, show all signals.
- **`--since <date>`** — Scan since a specific date.
- **`--days <N>`** — Scan last N days.
- **`--gaps`** — Show only gaps, bugs, and fixes.
- **`--observations`** — Show only observations and insights.
- **`--recurring`** — Show patterns that appear 2+ times.
- **`--search <term>`** — Search across all reflections.
- **`--summary`** — Condensed view for quick reviews.

## What It Finds

- **Observations** — tagged insights from sessions (`[testing]`, `[architecture]`, etc.)
- **Gaps** — things that broke or were missing
- **Corrections** — behavioral adjustments the agent learned
- **Recurring patterns** — themes across multiple sessions (candidates for muscles)

## Usage

```bash
# Quick check: what did recent sessions learn?
soma-reflect.sh

# Find recurring problems
soma-reflect.sh --recurring

# Search for a specific topic
soma-reflect.sh --search "sync"
```

## Install

```bash
soma hub install script soma-reflect
```
