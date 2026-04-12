---
type: script
name: soma-focus
version: 1.0.0
status: active
author: meetsoma
license: MIT
tier: core
language: bash
description: Set boot focus — primes the next session to load relevant MAPs, plans, and context for a keyword
tags: [focus, boot, maps, context, workflow]
requires: [bash 4+, grep, sed]
created: 2026-03-21
updated: 2026-04-04
---

# soma-focus

## TL;DR
**`soma-focus.sh` — session priming.** Run before starting `soma` to focus the next session on a specific topic. It traces the keyword through your `.soma/` workspace, scores relevance, and generates heat overrides so the right muscles, protocols, and MAPs load automatically. Use `dry-run` to preview without committing. Use `clear` between tasks.

Sets a keyword focus for the next Soma boot. When you run `soma` after focusing, the system prompt is primed with relevant MAPs, plans, and AMPS content matching your keyword.

## Commands

- **`<keyword>`** — Set focus for next boot.
- **`show`** — Show current focus state.
- **`clear`** — Remove focus.
- **`dry-run <keyword>`** — Preview what would load without setting focus.

## Usage

```bash
# Focus next session on release work
soma-focus.sh release

# Preview what "testing" would load
soma-focus.sh dry-run testing

# Check current focus
soma-focus.sh show

# Clear focus between tasks
soma-focus.sh clear
```

## Install

```bash
soma hub install script soma-focus
```
