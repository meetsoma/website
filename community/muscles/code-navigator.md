---
name: code-navigator
type: muscle
status: active
description: "soma-code.sh — 11 commands for codebase navigation. map before editing, refs before renaming, find before grep."
heat: 15
triggers: [find, map, refs, structure, grep, navigate, codebase, navigation, search, tsc-errors, css-vars]
tags: [tooling, search, refactor, shell]
applies-to: [any]
created: 2026-03-15
updated: 2026-04-04
tools: [soma-code.sh]
related: [incremental-refactor, task-tooling]
---
# Code Navigator

## TL;DR
**`soma-code.sh` — fast codebase navigator.** 11 commands: `find` (grep with file:line), `lines` (exact line range), `map` (function/class index for TS/JS/Bash/CSS), `refs` (def vs use classification), `replace` (line-specific sed), `structure` (file tree + sizes), `tsc-errors` (TypeScript errors with context), `physics` (motion/animation audit), `events` (listeners/dispatchers), `css-vars` (custom property audit), `config` (settings objects). Use `map` before editing any file. Use `refs` before renaming. Use `find` instead of raw `grep -rn`. Default target: project root.

## Commands

| Command | Use When | Example |
|---------|----------|---------|
| `find <pattern> [path] [ext]` | Searching codebase — replaces `grep -rn` | `soma-code.sh find "loadAllContent"` |
| `lines <file> <start> [end]` | Reading exact lines (default: 20 lines) | `soma-code.sh lines core/body.ts 580 620` |
| `map <file>` | **Before editing** — function/class layout | `soma-code.sh map core/prompt.ts` |
| `refs <symbol> [path]` | **Before renaming** — DEF vs USE sites | `soma-code.sh refs "compileWithTemplate"` |
| `replace <file> <line> <old> <new>` | Surgical line-specific replacement | `soma-code.sh replace core/body.ts 45 "old" "new"` |
| `structure [path]` | File tree with sizes | `soma-code.sh structure repos/agent/core` |
| `tsc-errors [path]` | TypeScript errors with code context | `soma-code.sh tsc-errors repos/agent` |
| `physics [path]` | Audit motion/animation/scroll code | `soma-code.sh physics src/` |
| `events [path]` | Find event listeners and dispatchers | `soma-code.sh events src/` |
| `css-vars [path]` | CSS custom property definitions + usages | `soma-code.sh css-vars src/` |
| `config [path]` | Find config/options/settings objects | `soma-code.sh config src/` |

## When to Reach for This

- **Before editing a file** → `map` gives the function index with line numbers
- **Before renaming anything** → `refs` shows every def and usage site
- **Before searching** → `find` instead of raw `grep -rn` (better output format)
- **Before refactoring** → `map` + `refs` + `structure` to understand the shape, then `incremental-refactor` muscle for the process
- **After CSS changes** → `css-vars` to verify no orphaned variables
- **After TypeScript changes** → `tsc-errors` for errors with code context (better than raw `tsc`)

## Language Support (map command)

| Language | What it finds |
|----------|--------------|
| **TypeScript/JavaScript** | `export`, `function`, `class`, `interface`, `type`, `enum`, `const`, methods, getters/setters |
| **Bash** | Functions `name()`, case labels, section comments (`# ──`) |
| **CSS** | Selectors, `@`-rules, section comments |

## Relationship to Other Tools

- **soma-code.sh** = understand the code (find, map, refs)
- **soma-refactor.sh** = change the code safely (scan blast radius, verify, risk score)
- **soma-find.sh** = search beyond code (vault, archives, other projects)
- **soma-seam.sh** = trace concepts through memory (sessions, docs, seams)
