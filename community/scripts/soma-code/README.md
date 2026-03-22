---
type: script
name: soma-code
version: 1.0.0
status: active
author: meetsoma
license: MIT
language: bash
description: Fast codebase navigator — find, map, refs, structure, and more
tags: [navigation, search, code, grep, map, refactor]
requires: [bash 4+, grep, sed, awk]
created: 2026-03-15
updated: 2026-03-21
---

# soma-code

Fast codebase navigator built for AI agents. Replaces scattered `grep`, `find`, and `cat` commands with structured, line-numbered output that's immediately actionable.

## Commands

| Command | What it does |
|---------|-------------|
| `find <pattern> [path] [ext]` | Grep with `file:line:col` format — clickable in terminal |
| `lines <file> <start> [end]` | Show exact line range with line numbers |
| `map <file>` | Function/class/interface map — see the structure before editing |
| `refs <symbol> [path]` | Find all references (definitions vs. usage) |
| `replace <file> <ln> <old> <new>` | Line-specific find & replace |
| `structure [path]` | File tree with sizes |
| `physics [path]` | Find all physics/animation code |
| `events [path]` | Find all event listeners/dispatchers |
| `css-vars [path]` | CSS custom property audit |
| `config [path]` | Config/options objects |
| `tsc-errors [path]` | TypeScript errors with surrounding code context |

## Usage

```bash
# Map a file before editing it
soma-code.sh map src/core/prompt.ts

# Find all references to a function
soma-code.sh refs buildPrompt

# Search for a pattern, scoped to .ts files
soma-code.sh find "heat" src/ ts

# See the project structure
soma-code.sh structure
```

## Why

Agents waste turns on exploratory grep commands that return too much or too little. `soma-code map` gives you the function layout in one call. `soma-code find` returns clickable `file:line:col` output. `soma-code refs` distinguishes definitions from usage. Every command is designed to give the agent exactly what it needs to make the next edit confidently.

## Install

```bash
cp soma-code.sh ~/.soma/amps/scripts/soma-code.sh
chmod +x ~/.soma/amps/scripts/soma-code.sh
```

Or use the Soma CLI:
```bash
soma install script soma-code
```
