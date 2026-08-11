---
name: tool-discipline
type: protocol
status: active
description: "Scripts first, then raw commands. Read before edit. Check .soma/amps/scripts/ before writing grep/find. Build a script when you do the same thing twice."
heat-default: cold
tags: [tools, safety, self-awareness, scripts]
applies-to: [always]
gates:
  - command: "\\| *(tail|head|grep|sort|uniq|wc)[^;]*; *echo\\b[^;]*\\$\\?"
    mode: remind
    rule: "That exit code is the PIPE's last command, not yours — including when you wrap it in a label like echo \"rc=$?\". Run the command bare and read $? immediately; this has reported exit=0 over a FAILED git push."
  - command: "\\bpgrep\\s+-f\\s+(?:'[^']*'|\"[^\"]*\"|\\S+)\\s*\\|\\s*head\\b"
    mode: remind
    rule: "`pgrep -f X | head` returns A matching process, not THE one holding the resource — it can hand back a days-old zombie while the port is held by something else. Ask who holds the resource instead: `lsof -nP -iTCP:<port> -sTCP:LISTEN`."
  - command: "\\b(perl|sed|awk)\\b[^|;]*\\s-[a-zA-Z0-9]*i[a-zA-Z0-9]*\\b[^|;]*\\.md\\b"
    mode: remind
    rule: "Do NOT in-place edit .md with perl/sed/awk — without explicit UTF-8 layers they re-encode the WHOLE file, not just your match, and break YAML frontmatter silently. Use the edit tool."
  - command: "python3?[\\s\\S]*?(?:open\\([^)]*\\.md[^)]*[\"']w[\"']|\\.md[\"']\\)\\.write_text)"
    mode: block
    rule: "Do NOT write .md with python — open(p,'w') truncates BEFORE it can fail, so a UnicodeEncodeError on emoji or box-drawing leaves a 0-byte file. No encoding argument fixes it. Use the edit tool."
  - command: "(?<!['\"])\\b(grep|egrep|zgrep) +(-[a-zA-Z]*[rR]|--recursive\\b|--[a-zA-Z-]+=?[^ ]* +-[a-zA-Z]*[rR])"
    mode: block
    rule: "Don't grep -r a tree. WHICH tool depends on the QUESTION: 'where is this string / symbol / file?' -> soma:code.find (respects .gitignore, ~10x faster, ranked). 'where did this IDEA come from, who said it, how did it evolve?' -> soma:seam.trace (walks sessions + preloads + journal as ONE corpus; code.find CANNOT see that and will hand you literal hits while the answer sits in a session log). Scoped to one known dir, `grep -l` with explicit globs is fine."
  - command: "\\bfind +(~|\\$HOME|/Users/[^/]+) "
    mode: remind
    rule: "Never run find above a project dir — it walks node_modules and caches (measured once at 663s). Use soma:code.find, or find INSIDE one known dir with -maxdepth."
  - command: "\\bsleep +(26[1-9]|2[7-9][0-9]|[3-9][0-9][0-9]|[0-9]{4,})\\b"
    mode: remind
    rule: "Never sleep longer than 260 seconds — it burns the prompt cache. Chain shorter sleeps across turns, or do other work between polls."
  - command: "(^|[;|&(]\\s*|\\bthen\\s+|\\bdo\\s+|\\bsudo\\s+)\\s*(timeout|gtimeout|setsid)\\s"
    mode: remind
    rule: "macOS has no timeout/gtimeout/setsid — the command will fail. Bound it another way: run the process in the background and poll, or use a language-level timeout."
scope: bundled
tier: core
created: 2026-03-10
updated: 2026-08-10
version: 3.1.0
author: meetsoma
license: MIT
---
# Tool Discipline

> How Soma uses tools safely and efficiently. Scripts are your extended memory — they don't forget, they don't hallucinate, and they return structured output you can act on immediately.

## TL;DR
Scripts first, raw commands second. Read before edit. Build tools for yourself — when you do the same thing twice manually, make a script. Guard auto-blocks dangerous bash. The agent that builds its own tools gets faster every session.

## Script-First Workflow

Your scripts live in `.soma/amps/scripts/`. They're surfaced at boot and tracked by usage.

**Before writing a raw command, check:**
1. Is there a script that does this? (`ls .soma/amps/scripts/`)
2. Does it have `--help`? (Run it to see what it does)
3. Can an existing script be extended instead of writing a new one?

**When to build a new script:**
- You've done the same manual command pattern 2+ times
- The task has multiple steps that should be atomic
- You want future sessions to have this capability

**Script standards:**
- Add `--help` with usage examples
- Add header comments explaining purpose
- Leave breadcrumbs in comments: "Related: <muscle-name>, <other-script>"
- Use `.soma/` discovery (walk up from cwd) so scripts work in any project

## What the Guard Handles (Automatic)

The `soma-guard.ts` extension intercepts bash commands and flags dangerous patterns:

- `rm -rf` on sensitive paths
- `>` redirect to root/system paths (but `>>` append is allowed)
- Force pushes, rebase on shared branches
- Credential/secret exposure

**Guard levels** (configurable):
```jsonc
{
  "guard": {
    "bashCommands": "warn",
    "coreFiles": "warn"
  }
}
```

| Level | Behavior |
|-------|----------|
| `allow` | No prompts. Power user mode. |
| `warn` | Flags dangerous commands, asks for confirmation. |
| `block` | Requires explicit override for each dangerous command. |

## Craft Practices

- **Read before edit** — always check file contents before modifying
- **Edit for surgical changes** — `edit` replaces exact text, safer than `write`
- **Write for new files only** — `write` overwrites everything; use `edit` for existing files
- **Batch independent calls** — if two reads don't depend on each other, do them in one turn
- **Verify claims against code** — don't say "this is broken" without checking. Run it. Read the output.
- **Blast radius with multiple tools** — one tool isn't enough. Before changing a function or type:
  1. `soma:code.blast` — the one call that answers "what breaks if I change this"
  2. `soma:code.refs` — every reference site, ranked
  3. `soma:code.find` scoped to `tests/` — test coverage (if nothing, you need to add tests)
  4. Check scripts and docs that might reference it
  A single search misses things. Use 3-4 across different scopes to catch the full blast radius.

## Shipped Tools

Install from the community hub to extend your toolkit:

| Task | Script | Install |
|------|--------|---------|
| Navigate codebase (find, map, refs, structure) | `soma-code` | `/hub install script soma-code` |
| Doc discovery + SDK research | `soma:refdocs.*` | built in — `refdocs.find` / `.fetch` / `.tree` |
| Spelling + grammar checking | `soma-spell` | `/hub install script soma-spell` |

Browse all available scripts: `/hub list --remote script`

Run any script with `--help` for full usage. Build your own — drop a `.sh` into `.soma/amps/scripts/` and it's available next session. Drop it into `.soma/amps/scripts/commands/` and it becomes a `/soma <name>` command.

## Source

- Guard extension: `extensions/soma-guard.ts`
- Settings: `core/settings.ts` → `GuardSettings`
- Scripts directory: `.soma/amps/scripts/`

---
