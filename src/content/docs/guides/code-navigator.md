---
title: "Code Navigator"
description: "soma code — agent-first codebase navigator with auto-detect, progressive scan, hard timeouts, and 12-language map support. (s01-4d36c6: missing-from-manifest fix)"
section: "Guide"
order: 28
---


<!-- tldr -->
`soma code` is the codebase navigator both you and the agent should reach for first. Maps file structure across **12 languages** (TS/JS, Rust, Python, Bash, CSS, Astro/Svelte/Vue, TOML, YAML, JSON, Markdown), auto-detects the project type from `cwd` markers (Cargo.toml → Rust, package.json → TS/JS, etc.), respects `.gitignore`, and never hangs the agent's session — every long search has a hard wall-clock timeout (30s default) plus stutter detection. Uses `ripgrep` when installed, falls back to `grep` transparently. **v3.1+ (s01-4d36c6)** adds rg type aliases (`type=rust` / `t=cpp` delegates to ripgrep's 215 built-in language types), per-command help with examples, fuzzy command correction (`fnd → find`), and three new subcommands: `stats` (count without listing), `files` (what would be searched), `types` (list aliases).
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
| Rust | `pub fn` / `fn` / `async fn`, `struct` / `enum` / `trait` / `union`, `impl` / `impl T for U`, `mod`, `type`, `const` / `static`, `macro_rules!`, section dividers |
| Python | `class`, `def` / `async def` (top-level + nested), `@decorator` lines, `UPPER_CASE = ...` constants, section dividers |
| Bash | `foo()` function definitions, `case` branches, `CMD=…` dispatchers, `# ──` section headers |
| CSS/SCSS | Selectors (`.class`, `#id`, `@media`, pseudos) and section comments |
| Astro/Svelte/Vue | Frontmatter fences, `<script>`/`<style>`/`<template>` tags, imports, exports, top-level consts |
| TOML | `[section]` and `[[array.section]]` headers, top-level `key = value` pairs |
| YAML | top-level keys, `- name:` / `- id:` list items, section dividers |
| JSON | top-level `"key":` pairs, nested object/array entry lines |
| Markdown | `---` frontmatter delimiters, `#`/`##`/`###`/`####` heading hierarchy with indent |

`map` is also smart enough to show tool-registration blocks as green section markers with the tool name on the next line — so a multi-hundred-line addon file like `somaverse-addons/workspace.ts` (10 `route.provide("somaverse:workspace.*")` caps) becomes browsable in under 30 lines of output.

### `soma code find <pattern> [path] [ext_or_type]`

Scoped grep with `file:line:match` output. Respects `.gitignore`. Uses `rg` (ripgrep) if installed, falls back to `grep`.

```bash
soma code find "sendUserMessage"                  # auto-detects ext from cwd
soma code find "fn main" . rs                     # ext list (Rust files only)
soma code find "fn main" . type=rust              # rg type alias (delegates to ripgrep's --type)
soma code find "console.log" . t=js               # short form
soma code find "TODO" src                         # narrow path; default ext
```

**Auto-detect:** when `ext_or_type` is omitted, the script walks up from `cwd` looking for project markers (`Cargo.toml`, `package.json`, `pyproject.toml`, `go.mod`, `Gemfile`, `CMakeLists.txt`) and picks a sensible default. Monorepo case (`somadian/bins/<bin>/Cargo.toml`) is handled by also probing immediate children. Generic fallback covers all 12 supported languages.

**Type aliases (v3.1+):** when ripgrep is installed, `type=NAME` delegates directly to rg's 215 built-in `--type` (`rust`, `cpp`, `cmake`, `bazel`, etc.). Run `soma code types` to list them. For grep-only fallback, a small built-in subset covers the common cases (`rust`, `py`, `ts`, `js`, `sh`, `cpp`, `c`, `go`, `ruby`, `md`, `toml`, `yaml`, `json`).

**Regex flavor:** when backed by `rg`, you get Rust regex (use `|` for alternation, no escape). When backed by `grep`, it's POSIX BRE (escape as `\|`). The script's hint message tells you which engine is active.

**Progressive scan with timeouts:** long searches print a heartbeat every 3 seconds (`scanning ... 6s • N matches`), enforce a hard 30-second wall-clock timeout, and abort gracefully if no progress for 9 seconds. Override via `SOMA_CODE_TIMEOUT=N`, `SOMA_CODE_STUTTER=N`, or `SOMA_CODE_QUIET=1`. **Result: the agent's session never hangs on a bad query.**

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

### `soma code blast <symbol> [path]`

Blast radius before deletion or rename. Counts references per file, classifies risk (low/med/high), shows the first occurrence per file. Run before deleting any exported symbol.

```bash
$ soma code blast getAgentDir core/

Files affected: 2

  low  core/discovery.ts  (2 refs)
       :14  import { getAgentDir } from "@mariozechner/pi-coding-agent";
  low  core/prompt.ts  (1 refs)
       :805  * @param agentDir - Agent installation directory (from getAgentDir())
```

Risk: `low` (≤3 refs), `med` (4-10), `high` (>10). For deeper analysis, pair with `soma refactor scan`.

### `soma code stats <pattern> [path] [ext_or_type]`

Count matches per file without listing them. Useful for "how many TODOs in the Rust crates?" without flooding context.

```bash
$ soma code stats TODO . type=rust
crates/core/messages.rs:6
crates/core/search.rs:22
crates/printer/src/color.rs:3
```

### `soma code files [path] [ext_or_type]`

Debug helper — shows which files **would** be searched if you ran `find` with the same scope. Useful when a search returns 0 matches and you suspect glob/ignore filtering is too tight.

```bash
$ soma code files . type=rust
bins/cloud/crates/bin/src/main.rs
bins/cloud/crates/sdk/src/capability.rs
...
```

### `soma code types [name]`

List ripgrep's 215 known type aliases (rust, cpp, bazel, cmake, ...). With `[name]`, show the globs for one type.

```bash
$ soma code types rust
rust: *.rs

$ soma code types cmake
cmake: *.cmake, CMakeLists.txt
```

### `soma code tsc-errors [path]`

TypeScript errors with surrounding code context. One-line summary per error + the 3-line code window around it.

## When to use what

| You want to… | Use |
|---|---|
| Understand a file's shape before editing | `soma code map <file>` |
| Find all places a function is used | `soma code refs <name>` |
| Check blast radius before deleting | `soma code blast <name>` |
| Find a string in the codebase | `soma code find <pattern>` |
| Same, but only counts (no listing) | `soma code stats <pattern>` |
| Debug "why is my search empty?" | `soma code files [path] [type=...]` |
| List supported language type aliases | `soma code types` |
| See a specific line range | `soma code lines <file> <start> <end>` |
| Survey a directory | `soma code structure <path>` |
| See TypeScript errors | `soma code tsc-errors` |
| Replace a specific line | `soma code replace <file> <line> <old> <new>` |

## Help discovery

Every command has its own `--help` with usage + 3 working examples + notes:

```bash
soma code --help              # top-level: detected project + engine + timeout + limit
soma code find --help         # examples + auto-detect notes + regex flavor
soma code map --help          # languages + per-file vs per-dir behavior
soma code blast --help        # output explanation
```

**Fuzzy correct:** typo a command name and the script tells you what you meant.

```bash
$ soma code fnd
✗ Unknown command: 'fnd'
  Did you mean: find?
  Run: soma-code find --help
```

## Environment knobs

| Variable | Default | Effect |
|---|---|---|
| `SOMA_CODE_TIMEOUT` | 30 | Hard wall-clock timeout in seconds |
| `SOMA_CODE_STUTTER` | 9 | Abort after N seconds without progress |
| `SOMA_CODE_LIMIT` | 100 | Max hits to display (then suggests narrowing) |
| `SOMA_CODE_HEARTBEAT` | 3 | Status interval in seconds |
| `SOMA_CODE_QUIET` | 0 | Set to `1` to silence heartbeats (useful in scripts) |

## Agent-side usage

The same tools are exposed to the agent via the `soma` meta-tool (from `extensions/soma-addons/code.ts`, v0.22.0+):

- `soma(op='call', cap='soma:code.find', args={pattern, path?, ext?, limit?})` — same as `soma code find`
- `soma(op='call', cap='soma:code.map', args={file})` — same as `soma code map`
- `soma(op='call', cap='soma:code.refs', args={symbol, path?, limit?})` — same as `soma code refs`
- `soma(op='call', cap='soma:code.structure', args={path?})` — same as `soma code structure`
- `soma(op='call', cap='soma:code.blast', args={symbol, path?})` — symbol-blast-radius analysis (which files touch a symbol, severity-weighted)
- `soma(op='call', cap='soma:code.outline', args={path})` — markdown/text heading outline (was `file_outline`)
- `soma(op='call', cap='soma:code.history', args={file, limit?})` — git log for a file (sha + date + author + subject). v0.23.0+ (SX-700).

Legacy flat names (`code_find`, `code_refs`, `code_map`, `code_structure`, `code_blast`, `file_outline`) were archived in v0.22.0; call via the namespaced `soma:*` caps now.

Agents should prefer these over `Bash` running raw grep, for the same cache reasons that apply to humans: unbounded grep output bloats context.

## Why this matters for sessions

Every unscoped `grep -rn` that returns a large result adds its whole output to the conversation. Over a 100-turn session, five sloppy greps can add 50KB+ of tokens to the permanent prefix — enough to trigger Anthropic prompt-cache breakpoint cycling (see `releases/v0.20.x/v0.20.3/research-cache-breakpoints.md` in our internal research). At long session sizes this costs real money.

`soma code find` is not a performance tool — it's a **discipline tool** that keeps sessions cheap and correct.

## Implementation

Single bash script: `repos/agent/scripts/soma-code.sh` (~990 lines, v3.1).

Core techniques:

- **Engine detection:** `rg` if available (faster, smart-case, native `.gitignore` handling), `grep` fallback transparent.
- **Args as arrays, not strings:** `--glob` / `--include` patterns built into bash arrays to prevent cwd-glob expansion before reaching the engine. (v3.0 had a real positional-shift bug in the cap impl; v3.1 uses arrays + auto-defaults to fix.)
- **Project detection:** walks up from `cwd` for marker files (`Cargo.toml`, `package.json`, `pyproject.toml`, `go.mod`, `Gemfile`, `CMakeLists.txt`); falls back to immediate-children probe for monorepos; generic fallback for unrecognized projects.
- **Progressive monitoring:** background subshell + watchdog loop tracks tmpfile line count. Heartbeat every `SOMA_CODE_HEARTBEAT`s, hard kill at `SOMA_CODE_TIMEOUT`, stutter abort at `SOMA_CODE_STUTTER` no-progress.
- **Per-language map:** `awk` programs select section dividers + signature lines per file extension (`case ... esac` in `cmd_map`). 12 languages currently.
- **Type alias delegation:** `type=NAME` is passed through to `rg --type NAME` (zero duplication of ripgrep's 215-entry table). Grep fallback maps a small subset manually.
- **Pipefail-safe:** `set -uo pipefail` (no `-e`) since `grep`/`rg` exit 1 on no-match. Functions return 0 explicitly.

Extension: **nothing to install** — `soma code` ships with every `soma init` in `.soma/amps/scripts/soma-code.sh` and is auto-discovered by the `soma <name>` router.

## Troubleshooting

**"No results found"** — the tool suggests alternatives. Usually one of:
- The pattern isn't in the default extension set. Pass an `ext` arg: `soma code find "foo" . "ts,tsx,js"`.
- The target is in `.gitignore` (often the right answer — don't un-ignore without reason).
- The pattern has special regex characters. Escape or simplify.

**Map shows nothing for my file type** — v3.1 supports TS/JS/JSX/MJS/MTS, Rust, Python, Bash, CSS/SCSS, Astro/Svelte/Vue, TOML, YAML, JSON, Markdown. For other languages, `soma code outline <file>` (markdown/text headings) or just `cat` is the fallback. To add a language, edit the `cmd_map` `case` block in `scripts/soma-code.sh` — each case is a self-contained `awk` program.

**`pi.registerTool` blocks not appearing in map** — ensure the registration starts at column 0 or with standard indentation; the awk pattern matches common cases but can miss unusual formatting.

## Related

- [Scripts](/docs/scripts) — full index of bundled scripts
- [Tools](/docs/tools) — Pi-callable tool registration (`soma code`'s agent-facing side)
- [Extending Soma](/docs/extending) — writing your own scripts
- [working-style protocol](https://github.com/meetsoma/community/blob/main/protocols/working-style.md) — "search discipline" section explains why this tool exists
