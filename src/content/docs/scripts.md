---
title: "Scripts"
description: "Standalone tools that ship with Soma — codebase navigation, memory tracing, session focus, doc scraping, and more."
section: "Reference"
order: 9
---

# Scripts

<!-- tldr -->
Standalone bash tools for Soma. Run from the command line — no agent session needed. Your agent also uses these during sessions. 6 scripts are seeded on `soma init`; more are available via `soma hub install script <name>`. Run `soma --help scripts` to see what's installed.
<!-- /tldr -->

## Bundled Scripts (seeded on init)

These 6 scripts are installed into `.soma/amps/scripts/` when you run `soma init`. They're available immediately — no hub install needed. (`soma-theme.sh` is also bundled as a shared dependency sourced by other scripts — it's not run directly.)

### soma code — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-code)

Fast codebase navigator. Maps file structure, finds patterns, classifies references. Works with TypeScript, Python, Rust, Go, Bash, CSS, and more.

```bash
soma code map <file>                   # function/class index with line numbers
soma code find <pattern> [path] [ext]  # structured grep with file:line format
soma code refs <symbol> [path]         # all references, classified as DEF or USE
soma code lines <file> <start> [end]   # show exact lines
soma code replace <file> <ln> <old> <new>  # line-specific text replace
soma code structure [path]             # file tree with sizes
soma code tsc-errors [path]            # TypeScript errors with code context
```

**Use `map` before editing any file** — it gives you the function index so you know where to make changes.

### soma seam — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-seam)

Trace concepts through memory, code, and sessions. The memory superpower — finds connections across your entire `.soma/` workspace.

```bash
soma seam trace <term>              # follow a concept through everything
soma seam graph <session-id>        # map everything connected to a session
soma seam timeline [--tag TAG]      # chronological evolution of a concept
soma seam code <pattern>            # code + the ideas/plans that reference it
soma seam seeds [--unplanted]       # find seeds that haven't become plans
soma seam gaps                      # find orphan documents (no connections)
soma seam web <term> [-o FILE]      # generate a full markdown web of connections
```

### soma focus — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-focus)

Seam-traced boot priming. Run **before** starting a session to focus the agent on a specific topic. Traces the keyword through memory, scores relevance, and generates heat overrides so the right muscles, protocols, and MAPs load.

```bash
soma focus <keyword>       # set focus — next soma boot is primed
soma focus show            # show current focus state
soma focus clear           # remove focus
soma focus dry-run <kw>    # preview without writing

# Example workflow:
soma focus runtime         # focus on runtime work
soma                          # start — agent wakes up primed for runtime
```

### soma-update-check.sh

Check installed content against the hub for newer versions.

```bash
soma-update-check.sh            # check for updates
soma-update-check.sh --json     # machine-readable output
```

### validate-content.sh

Validate AMPS content files before submitting to the community hub.

```bash
validate-content.sh protocols/my-protocol.md
validate-content.sh muscles/                    # validate all in dir
```

### soma-theme.sh

Shared theming for all Soma scripts. Provides colors, header/footer helpers, and status functions. Sourced by other scripts — you don't run this directly.

---

## Hub Scripts (install with `/hub install script <name>`)

These scripts are available on the [Soma Hub](https://soma.gravicity.ai/hub). Install any of them:

```bash
# Inside a Soma session:
/hub install script soma-reflect

# Or from CLI:
soma hub install script soma-reflect
```

### soma reflect — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-reflect)

Parse session logs for observations, gaps, and recurring patterns. Use at session start to orient from past lessons, or mid-session to check if an issue was seen before.

```bash
soma reflect                        # observations from last 7 days
soma reflect --since 2026-03-12     # observations since date
soma reflect --gaps                 # gaps and recoveries only
soma reflect --recurring            # patterns mentioned 2+ times
soma reflect --search "sync"        # search across all reflections
soma reflect --summary              # condensed view for reviews
```

### soma plans — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-plans)

Plan lifecycle management. Plans rot — this tool helps you keep them alive.

```bash
soma plans status              # active plan count + budget check (≤12)
soma plans scan                # list all plans with status/lines
soma plans stale [--days N]    # find plans not updated in N days
soma plans overlap             # detect plans with overlapping topics
soma plans archive <plan>      # archive a completed plan
```

### soma scrape — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-scrape)

Intelligent doc discovery and scraping. Give it a library name, it finds the repo, scans for docs, pulls them locally into `.soma/knowledge/`.

```bash
soma scrape resolve <name>          # find repo + doc sources
soma scrape pull <name> [--full]    # download docs locally
soma scrape search <name> <query>   # search within scraped docs
soma scrape discover <topic>        # broad search across GitHub, npm, MDN
soma scrape list                    # show all scraped sources
```

**Requires:** `gh` (GitHub CLI), `curl`, `jq`.

### soma query — [hub](https://soma.gravicity.ai/hub/view?type=script&slug=soma-query)

Unified search across your `.soma/` workspace. Find content, check staleness, search sessions, trace connections.

```bash
soma query find "auth"              # search across all content + code
soma query list --type muscle       # list all muscles
soma query list --stale             # find stale content (30+ days)
soma query search --tags workflow   # search by tag
soma query search --deep "deploy"   # show TL;DR for matches
soma query sessions "typescript"    # search past session logs
soma query related my-muscle.md     # find linked docs via frontmatter
soma query impact settings.ts       # what references this file
```

### soma-compat.sh

Compatibility checker — detects protocol/muscle overlap and conflicts. Produces a 0–100 score.

```bash
soma-compat.sh              # run compat check
soma-compat.sh --json       # JSON output
```

### soma-snapshot.sh

Rolling zip snapshots of project directories.

```bash
soma-snapshot.sh . "pre-refactor"
```

### soma-spell.sh

Spellcheck for AMPS content — catches common formatting and naming issues.

```bash
soma-spell.sh protocols/my-protocol.md
soma-spell.sh .soma/amps/    # check everything
```

### git-identity-hook.sh

Git pre-commit hook that validates your git identity matches `guard.gitIdentity` settings.

## Building Your Own Scripts

Scripts in `.soma/amps/scripts/` are discovered at boot and listed in the "Available Scripts" table. Build your own:

1. Create a `.sh` file in `.soma/amps/scripts/`
2. Add a header comment (first `# comment` line becomes the description)
3. Add `--help` with usage examples
4. Leave breadcrumbs: `# Related: <muscle-name>, <other-script>`

Your scripts get usage tracking automatically — the boot system records how often each is run in `state.json`.

```bash
#!/usr/bin/env bash
# my-tool.sh — one-line description shown in boot table
# Related muscles: incremental-refactor
# Related scripts: soma-code.sh

case "${1:-help}" in
  run)   echo "doing the thing" ;;
  help)  echo "my-tool.sh — usage: run" ;;
esac
```

When you do the same thing twice manually, build a script. The agent that builds its own tools gets faster every session.
