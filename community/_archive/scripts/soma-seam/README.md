---
type: script
name: soma-seam
version: 1.0.0
status: active
author: meetsoma
license: MIT
tier: core
language: bash
description: Trace concepts through memory, code, and sessions — the connective tissue of your .soma/
tags: [memory, trace, search, connections, seam, graph, timeline]
requires: [bash 4+, grep, sed, awk]
created: 2026-03-15
updated: 2026-04-04
---

# soma-seam

## TL;DR
**`soma-seam.sh` — your memory thread-puller.** Use `trace` to follow a concept across sessions, plans, muscles, and code. Use `web` to generate a full connection map. Use `timeline` to see how something evolved. When you need to understand how an idea became a feature — or where a decision is documented — this is the tool. Think of it as grep that understands your `.soma/` workspace.

Traces concepts through your entire `.soma/` workspace — memory, code, sessions, plans, and protocols. Shows how ideas connect, evolve, and where they live.

## Commands

- **`trace <term>`** — Follow a concept through everything — sessions, plans, muscles, code.
- **`graph <seam-hash>`** — Map everything connected to a session.
- **`matrix <tag> [--depth N]`** — Build connection matrix for a tag.
- **`timeline [--tag TAG]`** — Chronological evolution of a concept.
- **`code <pattern>`** — Code + `.soma/` context together.
- **`seeds [--unplanted]`** — Find seeds — forward pointers to future work.
- **`gaps`** — Find orphan documents with no connections.
- **`web <term> [-o FILE]`** — Generate a full markdown web of connections.
- **`audit [range|file]`** — Code health + commit context.
- **`audit upstream [range]`** — Cross-reference upstream changes vs your imports.

## Usage

```bash
# Trace a concept across all memory
soma-seam.sh trace "heat system"

# Timeline of how a feature evolved
soma-seam.sh timeline --tag heat

# Generate a connection web
soma-seam.sh web "identity" -o identity-web.md

# Find orphan docs (no connections to anything)
soma-seam.sh gaps

# Audit upstream Pi changes for breakage
soma-seam.sh audit upstream v0.63.1..v0.64.0
```

## Install

```bash
soma hub install script soma-seam
```
