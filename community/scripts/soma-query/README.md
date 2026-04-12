---
type: script
name: soma-query
version: 1.0.0
status: active
author: meetsoma
license: MIT
tier: official
language: bash
description: Search and explore across the entire Soma ecosystem — docs, code, sessions, and git
tags: [search, query, explore, sessions, frontmatter]
requires: [bash 4+, grep, sed, awk]
created: 2026-03-21
updated: 2026-04-04
---

# soma-query

## TL;DR
**`soma-query.sh` — unified search across everything.** Use `topic` for broad searches that span docs, code, sessions, and git history. Use `search --stale` to find content that's rotting. Use `sessions` to search past session logs. Use `related` to find what links to a specific file. When you need to find something and don't know where it lives — start here.

Cross-ecosystem search that spans docs, code, sessions, and git history. Understands frontmatter, tags, and staleness.

## Commands

- **`topic <query>`** — Search across all sources (docs, code, sessions, git).
- **`search [--type X] [--tags Y] [--stale] [--deep]`** — Frontmatter-based query.
- **`related <file>`** — Find files linked via frontmatter references.
- **`sessions <query>`** — Search session logs and preloads.

## Usage

```bash
# Search everything for a topic
soma-query.sh topic "heat system"

# Find stale protocols (no updates in 30+ days)
soma-query.sh search --type protocol --stale

# Find files related to a plan
soma-query.sh related releases/v0.6.x/plans/init-prompt.md

# Search past session logs
soma-query.sh sessions "correction"
```

## Install

```bash
soma hub install script soma-query
```
