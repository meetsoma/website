---
type: script
name: soma-code
version: 2.0.0
status: active
author: meetsoma
license: MIT
tier: core
language: bash
description: Fast codebase navigator — find, map, refs, blast radius, structure, and more
tags: [navigation, search, code, grep, map, refactor, blast-radius]
requires: [bash 4+, grep, sed, awk]
created: 2026-03-15
updated: 2026-04-12
---

# soma-code

## TL;DR
**`soma-code.sh` — your codebase eyes.** Use `map` before editing any file — it gives you the function index. Use `refs` before renaming anything — it classifies DEF vs USE. Use `blast` to see how many files a change touches before you start. Use `find` instead of raw `grep`. Default target: project root. When you're reaching for grep, sed, or find — stop and use soma-code instead.

Fast codebase navigator built for AI agents. Replaces scattered `grep`, `find`, and `cat` commands with structured, line-numbered output that's immediately actionable.

## Commands

- **`find <pattern> [path] [ext]`** — Grep with `file:line` format, clickable in terminal. Optional extension filter.
- **`lines <file> <start> [end]`** — Show exact line range with line numbers.
- **`map <file|dir>`** — Function/class/interface map for TS/JS/Bash/CSS/Astro. The first thing to run before editing.
- **`refs <symbol> [path]`** — Find all references — classifies as DEF, IMP, or USE.
- **`blast <symbol> [path]`** — Blast radius — how many files × risk level. Run before renaming or deleting.
- **`replace <file> <ln> <old> <new>`** — Line-specific find & replace. Safer than sed.
- **`structure [path]`** — File tree with sizes. Quick orientation.
- **`tsc-errors [path]`** — TypeScript errors with surrounding context lines.
- **`physics [path]`** — Find all physics/animation/spring code.
- **`events [path]`** — Find all event listeners and dispatchers.
- **`css-vars [path]`** — CSS custom property definitions and usage count.
- **`config [path]`** — Find config/options/settings objects.

## Usage

```bash
# Map a file before editing — see what's where
soma-code.sh map src/core/identity.ts

# Find all references to a function before renaming
soma-code.sh refs loadSettings

# Check blast radius before a refactor
soma-code.sh blast findPreload extensions/

# Grep with file:line format (better than raw grep)
soma-code.sh find "session_start" extensions/ ts

# See project structure
soma-code.sh structure src/
```

## v2.0.0 Changes

- Added `blast` — blast radius analysis with risk scoring (low/med/high per file)
- Added `tsc-errors` — TypeScript errors with surrounding context
- Improved `refs` — DEF/IMP/USE classification
- Improved `find` — optional extension filter, suggestions on no results
- Better `--help` output with colored formatting

## Install

```bash
soma hub install script soma-code
```

Or copy `soma-code.sh` to your project and run directly.
