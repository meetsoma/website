---
title: "Code Navigator"
description: "soma code — map, find, refs, structure, lines, replace. Fast codebase navigation that saves context and prevents cache-busting raw greps."
section: "Guide"
order: 28
---

# Code Navigator

<!-- tldr -->
`soma code` is the codebase navigator both you and the agent should reach for first. Maps file structure (functions, classes, tool registrations), finds patterns with scoped grep, classifies symbol references as DEF vs USE, shows targeted line ranges. Works across TypeScript, JavaScript, Bash, CSS, Astro. Respects `.gitignore` by default — so you never accidentally dump minified `dist/` or `node_modules/` into your terminal (or your agent's context).
<!-- /tldr -->

## Why it exists

Raw `grep -rn` and `find` don't respect `.gitignore`. On a modern repo that means one command can return:

- The whole minified `dist/` bundle
- `node_modules/` matches
- Every archived `_archive/` file
- Git internals
- Build caches

For a human, that's noise. For an AI agent working through a session, **it's a multi-dollar cache-invalidation risk**: a single unbounded grep can dump 50KB of minified output into the conversation, which then sits in every subsequent prompt until the session ends.

`soma code` fixes this by:

1. **Respecting `.gitignore`** — skips `dist/`, `node_modules/`, `_archive/`, whatever your project excludes.
2. **Consistent `file:line` output** — pipe-friendly and click-to-open in most editors.
3. **Scope-aware by default** — filters to source-code extensions unless told otherwise.
4. **Structured commands** — `map`, `find`, `refs`, `lines`, `replace`, `structure` each do one thing well.

When a scoped call returns nothing, it prints a `💡 Try instead` hint for the next move. **Don't fall back to raw grep** — broaden the scope with `soma code find` first.

## The commands

### `soma code map <file>`

Function/class/section index with line numbers. Use this **before editing any file you haven't read recently**.

```bash
$ soma code map repos/agent/extensions/soma-addons/code.ts

 30 │   // ── ANSI-stripping + soma code subprocess helper ──────────────────────────
 32 │ const ANSI_RE = /\u001b\[[0-9;]*m/g;
 35 │ function runCode(args: string[]): string {
 48 │ function cap(text: string, limit: number, hint: string): string {
 54 │   // ── Implementation functions ──────────────────────────────────────────
134 │   // ── Route registration ───────────────────────────────────────────────
136 │ export function register(route: any): void {
```

What it picks up (per-language):

| Language | Captures |
|---|---|
| TypeScript/JavaScript | `export {function,class,const,let,interface,type,enum}`, unexported top-level declarations, class methods, `pi.registerTool`/`pi.registerCommand`/`somaRegisterTool`/`route.provide` blocks (with their `name:` / cap-string line), `===` and `───` section dividers |
| Bash | `foo()` function definitions, `case` branches, `CMD=…` dispatchers, `# ──` section headers |
| CSS/SCSS | Selectors (`.class`, `#id`, `@media`, pseudos) and section comments |
| Astro/Svelte/Vue | Frontmatter fences, `<script>`/`<style>`/`<template>` tags, imports, exports, top-level consts |

`map` is also smart enough to show tool-registration blocks as green section markers with the tool name on the next line — so a multi-hundred-line addon file like `somaverse-addons/workspace.ts` (10 `route.provide("somaverse:workspace.*")` caps) becomes browsable in under 30 lines of output.

### `soma code find <pattern> [path] [ext]`

Scoped grep with `file:line:match` output. Respects `.gitignore`.

```bash
soma code find "sendUserMessage"                        # all TS/JS/MD/Rust/etc in cwd
soma code find "cache_control" node_modules ts          # scoped to a dir + ext
soma code find "invalidateCompiledPrompt" repos/agent   # specific project
```

**Important behavior:** the pattern is a POSIX grep regex (not PCRE), and pipe-alternation like `foo|bar` requires the `-E` flag internally — use separate calls or a character class. If you need rich regex, pass it through and read the output carefully.

When it finds zero matches, it prints three `💡 Try instead` suggestions — usually "broaden scope" or "try refs." Take them.

### `soma code refs <symbol> [path]`

Every reference to a symbol, classified as **DEF** (definition) or **USE** (call/reference). Essential before renaming or deleting.

```bash
$ soma code refs invalidateCompiledPrompt

DEF  repos/agent/extensions/soma-boot.ts:2182: function invalidateCompiledPrompt() {
USE  repos/agent/extensions/soma-boot.ts:2370:     invalidateCompiledPrompt();
USE  repos/agent/extensions/soma-boot.ts:2375:     invalidateCompiledPrompt();
...
8 total refs across 1 files
```

Pair with `soma refactor scan` (Pro) for full blast radius including indirect references.

### `soma code lines <file> <start> [end]`

Show an exact line range. Cheaper than `cat`-ing the whole file, more precise than `head`/`tail`.

```bash
soma code lines core/body.ts 540 560     # show lines 540-560
soma code lines extensions/soma-boot.ts 2182  # show line 2182 (single line)
```

### `soma code replace <file> <line> <old> <new>`

Line-specific text replacement. Guards against accidental multi-site edits — the replacement only applies at the named line.

### `soma code structure [path]`

Directory tree with file sizes. Respects `.gitignore`. Use for orientation before planning a refactor or grepping broadly.

```bash
$ soma code structure repos/agent/extensions
extensions/
├── _tool-template.ts         2.1K
├── soma-boot.ts            132.0K
├── soma-breathe.ts          45.1K
├── soma-addons/             10.2K  (code, body, browser, docs)
...
```

### `soma code tsc-errors [path]`

TypeScript errors with surrounding code context. One-line summary per error + the 3-line code window around it.

## When to use what

| You want to… | Use |
|---|---|
| Understand a file's shape before editing | `soma code map <file>` |
| Find all places a function is used | `soma code refs <name>` |
| Find a string in the codebase | `soma code find <pattern>` |
| See a specific line range | `soma code lines <file> <start> <end>` |
| Survey a directory | `soma code structure <path>` |
| See TypeScript errors | `soma code tsc-errors` |
| Replace a specific line | `soma code replace <file> <line> <old> <new>` |

## Agent-side usage

The same tools are exposed to the agent via the `soma` meta-tool (from `extensions/soma-addons/code.ts`, v0.22.0+):

- `soma(op='call', cap='soma:code.find', args={pattern, path?, ext?, limit?})` — same as `soma code find`
- `soma(op='call', cap='soma:code.map', args={file})` — same as `soma code map`
- `soma(op='call', cap='soma:code.refs', args={symbol, path?, limit?})` — same as `soma code refs`
- `soma(op='call', cap='soma:code.structure', args={path?})` — same as `soma code structure`
- `soma(op='call', cap='soma:code.blast', args={symbol, path?})` — symbol-blast-radius analysis (which files touch a symbol, severity-weighted)
- `soma(op='call', cap='soma:code.outline', args={path})` — markdown/text heading outline (was `file_outline`)

Legacy flat names (`code_find`, `code_refs`, `code_map`, `code_structure`, `code_blast`, `file_outline`) were archived in v0.22.0; call via the namespaced `soma:*` caps now.

Agents should prefer these over `Bash` running raw grep, for the same cache reasons that apply to humans: unbounded grep output bloats context.

## Why this matters for sessions

Every unscoped `grep -rn` that returns a large result adds its whole output to the conversation. Over a 100-turn session, five sloppy greps can add 50KB+ of tokens to the permanent prefix — enough to trigger Anthropic prompt-cache breakpoint cycling (see `releases/v0.20.x/v0.20.3/research-cache-breakpoints.md` in our internal research). At long session sizes this costs real money.

`soma code find` is not a performance tool — it's a **discipline tool** that keeps sessions cheap and correct.

## Implementation

Single bash script: `repos/agent/scripts/soma-code.sh` (~600 lines).

Core techniques:

- `grep -rn` with auto-generated `--include=*.ext` flags derived from a default set (TS/JS/MD/Rust/Python/Go/Bash/CSS/Astro).
- `--exclude-dir=node_modules` and similar, plus `.gitignore`-awareness via `git ls-files` filtering on the grep result.
- Language-specific `awk` programs for `map` (see the map fn around `cmd_map`).
- Consistent ANSI coloring and a uniform `file:line` output format.

Extension: **nothing to install** — `soma code` ships with every `soma init` in `.soma/amps/scripts/soma-code.sh` and is auto-discovered by the `soma <name>` router.

## Troubleshooting

**"No results found"** — the tool suggests alternatives. Usually one of:
- The pattern isn't in the default extension set. Pass an `ext` arg: `soma code find "foo" . "ts,tsx,js"`.
- The target is in `.gitignore` (often the right answer — don't un-ignore without reason).
- The pattern has special regex characters. Escape or simplify.

**Map shows nothing for my file type** — `soma code map` supports TS/JS/Bash/CSS/Astro/Svelte/Vue. For other languages, `soma code outline <file>` (markdown/text headings) or just `cat` is the fallback.

**`pi.registerTool` blocks not appearing in map** — ensure the registration starts at column 0 or with standard indentation; the awk pattern matches common cases but can miss unusual formatting.

## Related

- [Scripts](/docs/scripts) — full index of bundled scripts
- [Tools](/docs/tools) — Pi-callable tool registration (`soma code`'s agent-facing side)
- [Extending Soma](/docs/extending) — writing your own scripts
- [working-style protocol](https://github.com/meetsoma/community/blob/main/protocols/working-style.md) — "search discipline" section explains why this tool exists
