---
title: "Commands"
description: "Slash commands, CLI flags, context warnings, the breath cycle."
section: "Reference"
order: 7
---


<!-- tldr -->
CLI: `soma` (fresh), `soma inhale` (fresh + preload), `soma -c` (continue), `soma -r` (resume picker). Session: `/inhale`, `/breathe`, `/exhale`, `/rest`. Heat: `/pin <name>`, `/kill <name>`. Hub: `/hub install`, `/hub find`, `/hub list`, `/hub fork`, `/hub share`. Management: `/soma status`, `/soma init`, `/soma prompt`, `/soma <command>` (drop-in scripts). Body: `/body check`, `/body vars`, `/body map`, `/body render`.
<!-- /tldr -->

Soma registers slash commands that control the breath cycle, heat system, and session management.

## Session Commands

These are **slash commands** used inside the Soma TUI during a session.

| Command | Description |
|---------|-------------|
| `/inhale` | **Check preload status** — shows whether a preload exists and how stale it is. Warns if no preload found (suggests `/exhale`). Warns if preload is stale (>5 tool calls since write). Use `/inhale --force` to override. **Note:** this does _not_ start a new session — to start a session with a preload, use `soma inhale` from your shell (see [CLI Commands](#cli-commands)). |
| `/breathe` | Save state and rotate into a fresh session. Seamless rotation — exhale + inhale in one motion. |
| `/exhale` | Save state to disk. Writes `preload-next-<date>-<id>.md` to `memory/preloads/`, saves heat state with decay for unused content. Session ends. The preload written here is what `soma inhale` loads next time. |
| `/rest` | Going to bed? Disables cache keepalive, then exhales. No pings will fire after you walk away. |
| `/exit` | Save state and quit Soma cleanly. Exhales, then terminates. |

## Heat Commands

| Command | Description |
|---------|-------------|
| `/pin <name>` | Pin a protocol or muscle — bumps its heat by the configured `pinBump` (default: +5). Keeps it loaded in future sessions. |
| `/kill <name>` | Drop a protocol or muscle's heat to zero. It won't load until used again. |

## Hub Commands

| Command | Description |
|---------|-------------|
| `/hub` | Hub status — shows paths, repo info, index URL. |
| `/hub install <type> <name> [-g\|-p] [--force]` | Install from the Soma Hub. Types: `protocol`, `muscle`, `script`, `skill`, `template`. `-g` for global (default), `-p` for project-local. `--force` overwrites existing. |
| `/hub find <keywords>` | Search hub content by name, description, and tags. |
| `/hub list [type]` | Show locally installed AMPS content. Optionally filter by type. |
| `/hub list --remote [type]` | Browse all available content on the hub. Fetches live from `meetsoma/community`. |
| `/hub fork <type> <name>` | Install from hub and add `forked-from` lineage. Your copy to customize. |
| `/hub share <type> <name>` | Share your content to the hub — generates README, runs privacy scan, creates PR via `gh`. |
| `/hub status` | Detailed hub status — paths, repo, index URL. |
| `/install <type> <name>` | **Backward compat** — redirects to `/hub install`. Use `/hub install` instead. |

## Guard Commands

| Command | Description |
|---------|-------------|
| `/guard-status` | Show guard statistics: reads tracked, directories listed, interventions blocked. Provided by `soma-guard.ts` extension. |

## Debug Commands

| Command | Description |
|---------|-------------|
| `/route` | Show the extension capability router — registered capabilities (provider, description) and signal listeners. Useful for debugging inter-extension communication. Provided by `soma-route.ts`. |

## Info & Management Commands

| Command | Description |
|---------|-------------|
| `/soma` | Show Soma status — loaded identity, protocol heat states, muscle states, context usage, available commands. |
| `/soma init` | Create a `.soma/` directory in the current project. |
| `/soma doctor` | Project health check and migration. Shows `compareTemplates()` analysis (content files, new templates, structural changes), references migration phase files for step-by-step guidance. Tier 2+ interactive migration with agent assistance. |
| `/soma prompt` | Preview the compiled system prompt — shows all assembled sections, token estimate, and which toggles are active. |
| `/soma prompt full` | Dump the full compiled system prompt text. |
| `/soma prompt identity` | Show identity debug — chain, layering, char count. |
| `/soma preload` | Show available preload files (name, age, staleness). |
| `/soma debug on\|off` | Toggle debug logging to `.soma/debug/`. |
| `/soma <command>` | Run a drop-in command from `.soma/amps/scripts/commands/`. See below. |
| `/status` | Show session stats — context usage, turn count, uptime. Provided by `soma-statusline.ts`. |

## Drop-in Commands

Drop a `.sh` script into `.soma/amps/scripts/commands/` and it becomes a `/soma <name>` command — no restart needed.

```bash
# Example: /soma find css → runs commands/find.sh with "css" as argument
.soma/amps/scripts/commands/
├── find.sh     # /soma find <keywords> — search AMPS content
├── heat.sh     # /soma heat — show protocol/muscle heat state
└── hub.sh      # /soma hub — hub drift report
```

Scripts receive arguments via `$@` and get `SOMA_DIR` and `SOMA_PROJECT` environment variables. Output is sent to the chat (ANSI codes stripped automatically). Add `--help` support and use the `# ---` YAML comment header convention.

Commands appear in `/soma status` output and tab completions. Install community commands with `/hub install script <name>`.

## User Tools

| Command | Description |
|---------|-------------|
| `/scratch <note>` | Append a quick note to `.soma/scratchpad.md`. The agent doesn't see it — it's your private notepad. |
| `/scratch read` | Show the scratchpad contents to the agent. |
| `/scratch clear` | Empty the scratchpad. |
| `/code <subcommand> [args]` | Fast codebase navigator — wraps `soma-code.sh`. Subcommands: `find`, `lines`, `map`, `refs`, `replace`, `structure`, `physics`, `events`, `css-vars`, `config`. |
| `/scrape <name\|topic> [--discover]` | Scrape docs for a tool, library, or topic. Providers: `github`, `npm`, `mdn`, `css`, `skills`. |
| `/scan-logs [count] [--send]` | Scan conversation logs — session analytics via `soma-stats.sh`. `--send` injects results into conversation. |
| `/body [check\|vars\|map\|render]` | Body template inspector. `check` = health report, `vars` = all variables by category, `map` = template structure, `render` = full compiled system prompt. All support `--send`. |

## Toggle Commands

| Command | Description |
|---------|-------------|
| `/auto-breathe on\|off` | Toggle auto-breathe mode — proactive context management. Wraps up at configurable %, auto-rotates before 85%. Rotation uses the capability router when available, or CLI process restart as fallback. Default: off. |
| `/auto-commit on\|off` | Toggle auto-commit of `.soma/` state on exhale/breathe. Default: on. |
| `/keepalive on\|off` | Toggle cache keepalive. When enabled, sends periodic pings to prevent cache eviction during idle periods. |

## Context Warnings

Soma monitors context usage and warns at configurable thresholds:

| Setting | Default | Behavior |
|---------|---------|----------|
| `context.notifyAt` | 50% | Gentle note: "Context halfway" |
| `context.urgentAt` | 80% | Strong suggestion to exhale soon (injected into prompt) |
| `context.autoExhaleAt` | 85% | Auto-exhale triggers — state saves, session rotates |

Override in `settings.json` — see [Configuration](configuration.md#context-warnings).

## Model Commands

| Command | Description |
|---------|-------------|
| `/model` | Open model selector — fuzzy search across all available models. |
| `/login` | Authenticate with a subscription provider (Claude Pro, ChatGPT, Copilot, Gemini CLI). |
| `/logout` | Clear OAuth credentials for a provider. |
| **Ctrl+P** | Cycle through available models (or models set by `--models`). |

See [Models & Providers](/docs/models) for full setup, including custom providers (Ollama, LM Studio), API key configuration, and `models.json`.

## CLI Commands

These commands are run from your **shell** (terminal), not inside the Soma TUI.

### Starting a Session

| Command | Description |
|---------|-------------|
| `soma` | **Fresh session** — clean slate. Runs the full boot sequence (identity, protocols, muscles, git context) but does not load any preload. Use when starting new work or when no prior session exists. |
| `soma inhale` | **Fresh session + preload** — starts a new session and automatically injects the most recent preload from `memory/preloads/`. Use when picking up where you left off across sessions. This is the recommended way to continue a project day-to-day. |
| `soma -c` | **Continue session** — reopens the last session with full conversation history preserved. No new boot sequence — you're back in the same context. |
| `soma -r` | **Resume picker** — choose from previous sessions to restore. |

> **`soma` vs `soma inhale` vs `soma -c`:**
>
> - `soma` = blank page. No memory of yesterday.
> - `soma inhale` = blank page with a note from your past self. Fresh context, but the preload tells you what happened, what's next, and what to read. Best for daily work.
> - `soma -c` = same page. Full history, same context window. Best for short breaks.
>
> The preload loaded by `soma inhale` is written during `/exhale` or `/breathe` inside the TUI. If you haven't exhaled yet, `soma inhale` will warn that no preload exists.

### Options

| Command | Description |
|---------|-------------|
| `soma --help` | Show formatted help (uses gum when available). |
| `soma --map <name>` | Boot with a specific MAP loaded — applies prompt-config overrides, loads targeted preload and MAP body. |
| `soma --model <pattern>` | Start with a specific model (e.g. `sonnet`, `gpt-4o`, `openai/gpt-4o`, `sonnet:high`). |
| `soma --provider <name>` | Set the default provider for this session. |
| `soma --models <list>` | Limit Ctrl+P cycling to these models (comma-separated). |
| `soma --list-models [search]` | List available models with optional fuzzy search. |

### Project Management

| Command | Description |
|---------|-------------|
| `soma doctor` | Check project health and run migrations. Tier 1 auto-fixes (missing settings, body files, protocols) run silently. Reports stale protocols and version gaps. Use in TUI (`/soma doctor`) for interactive Tier 2+ migration. |
| `soma status` | Quick project health check — shows .soma/ structure, version, installed content. |
| `soma health` | Alias for `soma status`. |
| `soma --version` | Show agent version and CLI version. |
| `soma doctor --scan` | Scan for child .soma/ projects (delegates to core). |
| `soma doctor --all` | Fix all discovered projects (delegates to core). |

## Pre-Session Tools

Run these **before** starting a session:

| Command | Description |
|---------|-------------|
| `soma-focus.sh <keyword>` | Prime the next boot for a topic — traces keyword through memory, boosts relevant muscles/MAPs. |
| `soma-focus.sh show` | Show current focus state. |
| `soma-focus.sh clear` | Remove focus. |

```bash
# Example: focus then start
soma-focus.sh authentication    # trace + boost auth-related content
soma                            # boots primed for auth work
```

## Scripts

Soma ships standalone bash scripts in `.soma/amps/scripts/`. They run outside the agent session and are also used by the agent during sessions. See [Scripts](/docs/scripts) for the full reference.

Key scripts:

| Script | What it does |
|--------|-------------|
| `soma-code.sh` | Codebase navigator: map, find, refs, replace, structure |
| `soma-seam.sh` | Trace concepts through memory, code, sessions |
| `soma-query.sh` | Unified search: find, list, sessions, related, impact |
| `soma-reflect.sh` | Session log pattern mining |
| `soma-plans.sh` | Plan lifecycle management |
| `soma-scrape.sh` | Doc discovery + scraping (requires gh, curl, jq) |
| `soma-snapshot.sh` | Rolling zip snapshots |

## The Breath Cycle

Commands map to Soma's breath metaphor:

1. **Inhale** — session starts, boot steps run in order (identity → preload → protocols → muscles → scripts → git-context). Configurable in [Configuration](configuration.md#boot-sequence).
2. **Work** — the session. Heat shifts based on what you use.
3. **Breathe** — context filling up? `/breathe` saves state and continues seamlessly.
4. **Exhale** — done for now? `/exhale` saves state and ends the session.
5. **Rest** — going to bed? `/rest` disables keepalive pings and exhales. No cache pings will fire after you walk away.

See [How It Works](/docs/how-it-works) for the full breath cycle explanation.
