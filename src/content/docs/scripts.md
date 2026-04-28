---
title: "Scripts & Audits"
description: "Standalone tools for searching, auditing, scanning, and maintaining your .soma/ ecosystem."
section: "Reference"
order: 9
---


<!-- tldr -->
Standalone bash tools for Soma. Run from the command line — no agent session needed. Your agent also uses these during sessions. **20+ free scripts** ship with the agent + **5 Pro scripts** as compiled `.js`; more are available via `soma hub install script <name>`. Run `soma --help scripts` to see what's installed.
<!-- /tldr -->

## Bundled Scripts

Installed to `.soma/amps/scripts/` (or available via your global `soma` CLI). All ship with the agent — no hub install needed. `soma-theme.sh` is a shared dependency sourced by other scripts; not run directly. Use `soma tool` to introspect the agent-side tool surface (separate from these CLI scripts).

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

📖 **Full guide:** [Code Navigator](/docs/guides/code-navigator) — per-command docs, examples, why it exists, troubleshooting.

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

### soma body

Body template inspector. Check health, list variables, preview the compiled system prompt.

```bash
soma body check                     # health report — missing vars, duplicates
soma body vars                      # all variables grouped by category
soma body map                       # template structure with var status
soma body render                    # full compiled system prompt
```

### soma reflect

Parse session logs for observations, gaps, and recurring patterns.

```bash
soma reflect                        # observations from last 7 days
soma reflect --since 2026-03-12     # observations since date
soma reflect --gaps                 # gaps and recoveries only
soma reflect --recurring            # patterns mentioned 2+ times
```

### soma plans

Plan lifecycle management. Plans rot — this tool helps you keep them alive.

```bash
soma plans status                   # active plan count + budget check
soma plans scan                     # list all plans with status
soma plans stale [--days N]         # find stale plans
soma plans archive <plan>           # archive a completed plan
```

### soma session

Session maintenance — strip images, list sizes, analyze sessions.

```bash
soma session list                   # show all sessions with sizes per project
soma session stats                  # image count, dimensions for latest session
soma session strip-images           # strip base64 images from latest session
soma session strip --all            # strip images from all sessions
soma session strip --dry-run        # preview without modifying
```

When screenshots accumulate in a session, the JSONL file grows large and can hit API image limits. `strip-images` replaces image data with text placeholders so `soma -c` can resume cleanly.

### soma-update-check.sh

Check installed content against the hub for newer versions.

```bash
soma-update-check.sh            # check for updates
soma-update-check.sh --json     # machine-readable output
```

### soma children

Delegated-child monitor + spawner. Wraps tmux/cmux session management plus the `~/.soma/state/children.json` registry that the in-session `delegate(background:true)` Pi tool writes.

```bash
soma children list                              # active children + cost/runtime
soma children spawn <role> "<task>"             # tmux-default; --cmux when available
soma children spawn <role> "<task>" --model haiku   # pin model
soma children watch [interval]                  # flicker-free dashboard
soma children tail <id>                         # tail a child's output
soma children kill <id>                         # terminate a child
```

Dashboard reads from `children.json` as the source of truth; pane scan is enrichment only. Hex IDs (`child-xxxxxx`) match the in-session tool's shape so the agent and CLI views stay coherent.

### soma tool

Discover what tools the agent has registered. Static parser — doesn't start a session.

```bash
soma tool                       # list every tool with one-liner
soma tool <name>                # full guidance: description, promptSnippet, params
soma tool --extensions          # group by extension file
```

For the runtime view (post-`_tools.md` overrides), call `capabilities(op:'list')` from inside a session.

### soma new

Scaffold a new muscle or protocol with correct frontmatter — lowers the friction of crystallizing patterns. Idempotent: re-running on an existing name opens it in `$EDITOR` instead of clobbering.

```bash
soma new muscle <name>                          # .soma/amps/muscles/<name>.md
soma new protocol <name>                        # .soma/amps/protocols/<name>.md
soma new muscle <name> --global                 # ~/.soma/amps/...
soma new muscle <name> -d "description" -t trigger1,trigger2
soma new muscle <name> --no-edit                # skip $EDITOR
```

Templates live at `templates/default/_muscle-template.md` + `_protocol-template.md` — single source of truth for frontmatter conventions.

### validate-content.sh

Validate AMPS content files before submitting to the community hub.

```bash
validate-content.sh protocols/my-protocol.md
validate-content.sh muscles/                    # validate all in dir
```

### soma-theme.sh

Shared theming for all Soma scripts. Provides colors, header/footer helpers, and status functions. Sourced by other scripts — you don't run this directly.

---

## Advanced Scripts (Pro tier — beta)

These 5 scripts ship as compiled `.js` files (base64-encoded bash, obfuscated) and provide deeper capabilities — dependency analysis, memory tracing, doc scraping, remote repo inspection, and browser automation.

**During the v0.21.x beta, every install gets these working** — a Pro session token is provisioned automatically on first `soma` invocation. The auth scaffold inside each compiled script is real (not a no-op); when the Pro subscription tier ships, only the token-provisioning source changes — the scripts themselves ship unchanged. No friction for current users.

### soma seam

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

### soma refactor

Dependency analysis for safe refactoring. Scan before renaming or deleting anything.

```bash
soma refactor scan <file>           # dependency graph + blast radius
soma refactor refs <symbol>         # cross-file reference analysis
soma refactor graph <file>          # import/require tree
```

### soma scrape

Intelligent doc discovery and scraping. Give it a library name, it finds the repo, scans for docs, pulls them locally into `.soma/knowledge/`.

```bash
soma scrape resolve <name>          # find repo + doc sources
soma scrape pull <name> [--full]    # download docs locally
soma scrape search <name> <query>   # search within scraped docs
soma scrape discover <topic>        # broad search across GitHub, npm, MDN
soma scrape list                    # show all scraped sources
```

**Requires:** `gh` (GitHub CLI), `curl`, `jq`.

### soma github

Remote repo analysis — scan GitHub repos WITHOUT cloning.

```bash
soma github <repo> structure         # file tree + sizes
soma github <repo> map <file>        # function/class index
soma github <repo> deps              # dependency analysis
soma github <repo> audit             # security + quality scan
soma github <repo> routes            # route discovery (web frameworks)
soma github <repo> stats             # repo statistics
```

### soma browser

CDP-based browser automation for testing and scraping.

---

## Hub Scripts (install with `/hub install script <name>`)

These scripts are available on the [Soma Hub](https://soma.gravicity.ai/hub). Install any of them:

```bash
# Inside a Soma session:
/hub install script soma-query

# Or from CLI:
soma hub install script soma-query
```

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
