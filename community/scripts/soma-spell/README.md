---
type: script
name: soma-spell
version: 1.0.0
status: active
author: meetsoma
license: MIT
language: bash
description: Canadian English spelling checker and fixer with project dictionary
tags: [spelling, grammar, docs, canadian-english, writing]
requires: [bash 4+, grep, sed]
created: 2026-03-18
updated: 2026-03-21
---

# soma-spell

Canadian English spelling checker and auto-fixer. Catches American spellings (color → colour, analyze → analyse) and offers automatic fixes. Supports a project-level dictionary for custom terms.

## Commands

| Command | What it does |
|---------|-------------|
| `check <file-or-dir>` | Scan for American spellings |
| `fix <file-or-dir>` | Auto-fix American → Canadian |
| `rules` | Show all spelling rules |

## Usage

```bash
# Check a docs directory
soma-spell.sh check docs/

# Fix all blog posts
soma-spell.sh fix src/content/blog/

# Check everything
soma-spell.sh check --all

# See the rules
soma-spell.sh rules
```

## Project Dictionary

Add project-specific terms to `.soma/dictionary.txt` (one word per line) to suppress false positives on brand names, technical terms, or intentional American spellings.

## Install

```bash
cp soma-spell.sh ~/.soma/amps/scripts/soma-spell.sh
chmod +x ~/.soma/amps/scripts/soma-spell.sh
```
