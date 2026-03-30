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

| Command | Description |
|---------|-------------|
| `/inhale` | Start a fresh session. Shows preload status and suggests `soma -c` to continue with context. |
| `/breathe` | Save state and rotate into a fresh session. Seamless rotation — exhale + inhale in one motion. |
| `/exhale` | Save state to disk. Writes `preload-next-<date>-<id>.md` to `memory/preloads/`, saves heat state with decay for unused content. Session ends. |
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
| `/soma doctor` | Check for pending migrations. Runs migration scripts with confirmation, reloads settings after. |
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

| Command | Description |
|---------|-------------|
| `soma` | Fresh session — no preload. Clean slate with identity, hot protocols, active muscles. |
| `soma inhale` | Fresh session with preload from last session. Use when continuing a project across sessions. |
| `soma -c` | Continue previous session — full history preserved. |
| `soma -r` | Resume — pick from previous sessions to restore. |
| `soma --help` | Show formatted help (uses gum when available). |
| `soma --map <name>` | Boot with a specific MAP loaded — applies prompt-config overrides, loads targeted preload and MAP body. |
| `soma --model <pattern>` | Start with a specific model (e.g. `sonnet`, `gpt-4o`, `openai/gpt-4o`, `sonnet:high`). |
| `soma --provider <name>` | Set the default provider for this session. |
| `soma --models <list>` | Limit Ctrl+P cycling to these models (comma-separated). |
| `soma --list-models [search]` | List available models with optional fuzzy search. |

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
