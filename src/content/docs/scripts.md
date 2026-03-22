---
title: "Scripts"
description: "Standalone tools that ship with Soma — codebase navigation, memory tracing, session focus, doc scraping, and more."
section: "Reference"
order: 1
---

# Scripts

<!-- tldr -->
Standalone bash tools that ship with Soma. Run from the command line — no agent session needed. Your agent also uses these during sessions (they appear in the "Available Scripts" boot table). Scripts are seeded into `.soma/amps/scripts/` on `soma init`. Build your own scripts there — they'll be discovered automatically.
<!-- /tldr -->

## Core Tools

These are the tools your agent uses most. They're designed to be faster and more structured than raw grep/find.

### soma-code.sh

Fast codebase navigator. Maps file structure, finds patterns, classifies references. Works with TypeScript, Python, Rust, Go, Bash, CSS, and more.

```bash
soma-code.sh map <file>                   # function/class index with line numbers
soma-code.sh find <pattern> [path] [ext]  # structured grep with file:line format
soma-code.sh refs <symbol> [path]         # all references, classified as DEF or USE
soma-code.sh lines <file> <start> [end]   # show exact lines
soma-code.sh replace <file> <ln> <old> <new>  # line-specific text replace
soma-code.sh structure [path]             # file tree with sizes
soma-code.sh tsc-errors [path]            # TypeScript errors with code context
```

**Use `map` before editing any file** — it gives you the function index so you know where to make changes.

### soma-seam.sh

Trace concepts through memory, code, and sessions. The memory superpower — finds connections across your entire `.soma/` workspace.

```bash
soma-seam.sh trace <term>              # follow a concept through everything
soma-seam.sh graph <session-id>        # map everything connected to a session
soma-seam.sh timeline [--tag TAG]      # chronological evolution of a concept
soma-seam.sh code <pattern>            # code + the ideas/plans that reference it
soma-seam.sh seeds [--unplanted]       # find seeds that haven't become plans
soma-seam.sh gaps                      # find orphan documents (no connections)
soma-seam.sh web <term> [-o FILE]      # generate a full markdown web of connections
```

### soma-focus.sh

Seam-traced boot priming. Run **before** starting a session to focus the agent on a specific topic. Traces the keyword through memory, scores relevance, and generates heat overrides so the right muscles, protocols, and MAPs load.

```bash
soma-focus.sh <keyword>       # set focus — next soma boot is primed
soma-focus.sh show            # show current focus state
soma-focus.sh clear           # remove focus
soma-focus.sh dry-run <kw>    # preview without writing

# Example workflow:
soma-focus.sh runtime         # focus on runtime work
soma                          # start — agent wakes up primed for runtime
```

### soma-reflect.sh

Parse session logs for observations, gaps, and recurring patterns. Use at session start to orient from past lessons, or mid-session to check if an issue was seen before.

```bash
soma-reflect.sh                        # observations from last 7 days
soma-reflect.sh --since 2026-03-12     # observations since date
soma-reflect.sh --gaps                 # gaps and recoveries only
soma-reflect.sh --recurring            # patterns mentioned 2+ times
soma-reflect.sh --search "sync"        # search across all reflections
soma-reflect.sh --summary              # condensed view for reviews
```

### soma-plans.sh

Plan lifecycle management. Plans rot — this tool helps you keep them alive.

```bash
soma-plans.sh status              # active plan count + budget check (≤12)
soma-plans.sh scan                # list all plans with status/lines
soma-plans.sh stale [--days N]    # find plans not updated in N days
soma-plans.sh overlap             # detect plans with overlapping topics
soma-plans.sh archive <plan>      # archive a completed plan
```

### soma-scrape.sh

Intelligent doc discovery and scraping. Give it a library name, it finds the repo, scans for docs, pulls them locally into `.soma/knowledge/`.

```bash
soma-scrape.sh resolve <name>          # find repo + doc sources
soma-scrape.sh pull <name> [--full]    # download docs locally
soma-scrape.sh search <name> <query>   # search within scraped docs
soma-scrape.sh discover <topic>        # broad search across GitHub, npm, MDN
soma-scrape.sh list                    # show all scraped sources
```

**Requires:** `gh` (GitHub CLI), `curl`, `jq`.

## Utility Scripts

### soma-query.sh

Unified search across your `.soma/` workspace. Find content, check staleness, search sessions, trace connections.

```bash
soma-query.sh find "auth"              # search across all content + code
soma-query.sh list --type muscle       # list all muscles
soma-query.sh list --stale             # find stale content (30+ days)
soma-query.sh search --tags workflow   # search by tag
soma-query.sh search --deep "deploy"   # show TL;DR for matches
soma-query.sh sessions "typescript"    # search past session logs
soma-query.sh related my-muscle.md     # find linked docs via frontmatter
soma-query.sh impact settings.ts       # what references this file
```

### soma-compat.sh

Compatibility checker — detects protocol/muscle overlap and conflicts. Produces a 0–100 score.

```bash
soma-compat.sh              # run compat check
soma-compat.sh --json       # JSON output
```

### soma-update-check.sh

Check installed content against the hub for newer versions.

```bash
soma-update-check.sh            # check for updates
soma-update-check.sh --json     # machine-readable output
```

### soma-snapshot.sh

Rolling zip snapshots of project directories.

```bash
soma-snapshot.sh . "pre-refactor"
```

### validate-content.sh

Validate AMPS content files before submitting to the community hub.

```bash
validate-content.sh protocols/my-protocol.md
validate-content.sh muscles/                    # validate all in dir
```

### git-identity-hook.sh

Git pre-commit hook that validates your git identity matches `guard.gitIdentity` settings.

### prompt-preview.ts

Preview the compiled system prompt without starting a session.

```bash
npx jiti scripts/prompt-preview.ts
```

## Drop-in Commands

Scripts in `.soma/amps/scripts/commands/` become `/soma <name>` slash commands — **no restart needed**.

```bash
# Create a command
cat > .soma/amps/scripts/commands/deploy.sh << 'EOF'
#!/usr/bin/env bash
# ---
# name: deploy
# description: Deploy to production
# ---
echo "Deploying $(basename $(pwd))..."
git push origin main
EOF
chmod +x .soma/amps/scripts/commands/deploy.sh

# Use it immediately — no restart
/soma deploy
```

Drop-in commands receive arguments via `$@` and get two environment variables:
- `SOMA_DIR` — path to `.soma/` directory
- `SOMA_PROJECT` — path to project root

Output is sent to the chat with ANSI codes stripped. Commands appear in `/soma status` output and tab completions.

**Install community commands:**
```bash
/hub install script soma-code    # installs to .soma/amps/scripts/
```

## Building Your Own Scripts

Scripts in `.soma/amps/scripts/` are discovered at boot and listed in the "Available Scripts" table. Build your own:

1. Create a `.sh` file in `.soma/amps/scripts/`
2. Add a `# ---` YAML comment header with name, description, tags
3. Add `--help` with usage examples
4. Leave breadcrumbs: `# Related: <muscle-name>, <other-script>`

Your scripts get usage tracking automatically — the boot system records how often each is run in `state.json`.

```bash
#!/usr/bin/env bash
# ---
# name: my-tool
# description: One-line description shown in boot table
# tags: [workflow, automation]
# ---
# Related muscles: incremental-refactor
# Related scripts: soma-code.sh

case "${1:-help}" in
  run)   echo "doing the thing" ;;
  --help|help)  echo "my-tool.sh — usage: run" ;;
esac
```

**To make it a slash command too:** put it in `.soma/amps/scripts/commands/` instead. Same format, but now accessible as `/soma my-tool`.

When you do the same thing twice manually, build a script. The agent that builds its own tools gets faster every session.
