---
title: "Commands"
description: "Slash commands, CLI flags, context warnings, the breath cycle."
section: "Reference"
order: 7
---


<!-- tldr -->
CLI: `soma` (fresh), `soma inhale` (fresh + preload), `soma -c` (continue full history), `soma -r` (resume picker). Session: `/inhale`, `/breathe`, `/exhale`, `/rest`. Heat: `/pin <name>`, `/kill <name>`. Hub: `/hub install`, `/hub find`, `/hub list`, `/hub fork`, `/hub share`. Management: `/soma status`, `/soma init`, `/soma prompt`, `/soma <command>` (drop-in scripts). Body: `/body check`, `/body vars`, `/body map`, `/body render`. Script commands: `soma code` (codebase navigator), `soma verify` (structural checks), `soma refactor` (dependency analysis), `soma seam` (concept tracing), `soma session` (maintenance — strip images, list, stats). Scripts discovered via chain: bundled → project → global.
<!-- /tldr -->

Soma registers slash commands that control the breath cycle, heat system, and session management.

## Session Commands

These are **slash commands** used inside the Soma TUI during a session.

| Command | Description |
|---------|-------------|
| `/inhale` | **Reset session and load preload.** Saves heat state, starts a fresh session, and loads the most recent preload. Two use cases: (1) you started with plain `soma` and want the preload — `/inhale` resets and loads it. (2) You `/exhale`’d, updated the preload, and want to continue — `/inhale` gives you a fresh session with your curated preload. Warns if preload is stale (>5 tool calls since written). Use `--force` to override. |
| `/breathe` | Save state and rotate into a fresh session. Seamless rotation - exhale + inhale in one motion. |
| `/exhale` | Save state to disk. Writes `preload-next-<date>-<id>.md` to `memory/preloads/`, saves heat state with decay for unused content. Session ends. The preload written here is what `soma inhale` loads next time. |
| `/rest` | Going to bed? Disables cache keepalive, then exhales. No pings will fire after you walk away. |
| `/exit` | Save state and quit Soma cleanly. Exhales, then terminates. |

## Heat Commands

| Command | Description |
|---------|-------------|
| `/pin <name>` | Pin a protocol or muscle - bumps its heat by the configured `pinBump` (default: +5). Keeps it loaded in future sessions. |
| `/kill <name>` | Drop a protocol or muscle's heat to zero. It won't load until used again. |

## Hub Commands

| Command | Description |
|---------|-------------|
| `/hub` | Hub status - shows paths, repo info, index URL. |
| `/hub install <type> <name> [-g\|-p] [--force]` | Install from the Soma Hub. Types: `protocol`, `muscle`, `script`, `skill`, `template`. `-g` for global (default), `-p` for project-local. `--force` overwrites existing. |
| `/hub find <keywords>` | Search hub content by name, description, and tags. |
| `/hub list [type]` | Show locally installed AMPS content. Optionally filter by type. |
| `/hub list --remote [type]` | Browse all available content on the hub. Fetches live from `meetsoma/community`. |
| `/hub fork <type> <name>` | Install from hub and add `forked-from` lineage. Your copy to customize. |
| `/hub share <type> <name>` | Share your content to the hub - generates README, runs privacy scan, creates PR via `gh`. |
| `/hub status` | Detailed hub status - paths, repo, index URL. |
| `/install <type> <name>` | **Backward compat** - redirects to `/hub install`. Use `/hub install` instead. |

## Guard Commands

| Command | Description |
|---------|-------------|
| `/guard-status` | Show guard statistics: reads tracked, directories listed, interventions blocked. Provided by `soma-guard.ts` extension. |

## Debug Commands

| Command | Description |
|---------|-------------|
| `/route` | Show the extension capability router - registered capabilities (provider, description) and signal listeners. Useful for debugging inter-extension communication. Provided by `soma-route.ts`. |

## Info & Management Commands

| Command | Description |
|---------|-------------|
| `/soma` | Show Soma status - loaded identity, protocol heat states, muscle states, context usage, available commands. |
| `/soma init` | Create a `.soma/` directory in the current project. |
| `/soma doctor` | Project health check and migration. See [Doctor & Migration](/docs/doctor) for the full guide. |
| `/soma prompt` | Preview the compiled system prompt - shows all assembled sections, token estimate, and which toggles are active. |
| `/soma prompt full` | Dump the full compiled system prompt text. |
| `/soma prompt identity` | Show identity debug - chain, layering, char count. |
| `/soma preload` | Show available preload files (name, age, staleness). |
| `/soma debug on\|off` | Toggle debug logging to `.soma/debug/`. |
| `/soma <command>` | Run a drop-in command from `.soma/amps/scripts/commands/`. See below. |
| `/status` | Show session stats - context usage, turn count, uptime. Provided by `soma-statusline.ts`. |

## Reload & Rebuild

Two commands that look similar but do different things. Added in v0.20.3 —
the distinction matters because one is free and one costs a cache write.

| Command | Does | When to use |
|---|---|---|
| `/reload` | Re-imports extensions, reloads settings + skills + themes + keybindings + prompts. **Preserves the compiled system prompt** (restored from disk cache). | After editing an extension (`extensions/*.ts`) or tweaking settings. Free — no Anthropic cache invalidation. |
| `/rebuild` | Recompiles the system prompt from `body/*.md` and deletes the disk cache. Takes effect on the next turn. | **Optional.** Only when you've edited `body/*.md` mid-session AND you want the change to apply right now. Costs one cache write (~$1 on Sonnet/Opus). If you can wait for the next session, skip it. |

`/reload` covers everything Pi hot-reloads — extensions, skills, prompts,
themes, keybindings (authority: Pi's extensions docs). Extensions are
loaded via [jiti](https://github.com/unjs/jiti), which is mtime-keyed,
so transitive `core/*.ts` imports refresh along with them. If you
changed a `.ts` file, `/reload` picks it up.

### Statusline line 3 — what each label means

When a commit (or your own edits) touches files the running session might
want to pick up, line 3 of the statusline shows a short tag. Severity-labeled:

| Tag | What changed | What to do |
|---|---|---|
| `🔄 /reload` | `extensions/*.ts` or `core/*.ts` | Run `/reload` — takes <1s, no cost. |
| `📝 /rebuild?` | `body/*.md` | **Optional.** The `?` means "only if you want it applied right now." Skip freely if the edit is for your next session (preloads, journal, identity tweaks). |
| `⚠ relaunch` | `dist/*` or `core/*.js` | `/reload` can't help — Pi's static imports are frozen at process boot. `/exit`, then run `soma` again. Only happens when you've run `build-dist.mjs` or bumped Pi; normal source edits never trigger this. |

## Drop-in Commands

Drop a `.sh` script into `.soma/amps/scripts/commands/` and it becomes a `/soma <name>` command - no restart needed.

```bash
# Example: /soma find css → runs commands/find.sh with "css" as argument
.soma/amps/scripts/commands/
├── find.sh     # /soma find <keywords> - search AMPS content
├── heat.sh     # /soma heat - show protocol/muscle heat state
└── hub.sh      # /soma hub - hub drift report
```

Scripts receive arguments via `$@` and get `SOMA_DIR` and `SOMA_PROJECT` environment variables. Output is sent to the chat (ANSI codes stripped automatically). Add `--help` support and use the `# ---` YAML comment header convention.

Commands appear in `/soma status` output and tab completions. Install community commands with `/hub install script <name>`.

## User Tools

| Command | Description |
|---------|-------------|
| `/scratch <note>` | Append a quick note to `.soma/scratchpad.md`. The agent doesn't see it - it's your private notepad. |
| `/scratch read` | Show the scratchpad contents to the agent. |
| `/scratch clear` | Empty the scratchpad. |
| `/code <subcommand> [args]` | Fast codebase navigator - wraps `soma code`. Subcommands: `find`, `lines`, `map`, `refs`, `replace`, `structure`, `physics`, `events`, `css-vars`, `config`. |
| `/scrape <name\|topic> [--discover]` | Scrape docs for a tool, library, or topic. Providers: `github`, `npm`, `mdn`, `css`, `skills`. |
| `/scan-logs [count] [--send]` | Scan conversation logs - session analytics via `soma-stats.sh`. `--send` injects results into conversation. |
| `/body [check\|vars\|map\|render]` | Body template inspector. `check` = health report, `vars` = all variables by category, `map` = template structure, `render` = full compiled system prompt. All support `--send`. |

## Toggle Commands

| Command | Description |
|---------|-------------|
| `/auto-breathe on\|off` | Toggle auto-breathe mode - proactive context management. Wraps up at configurable %, auto-rotates before 85%. Rotation uses the capability router when available, or CLI process restart as fallback. Default: off. |
| `/auto-commit on\|off` | Toggle auto-commit of `.soma/` state on exhale/breathe. Default: on. |
| `/keepalive on\|off` | Toggle cache keepalive. When enabled, sends periodic pings to prevent cache eviction during idle periods. |

## Context Warnings

Soma monitors context usage and warns at configurable thresholds:

| Setting | Default | Behavior |
|---------|---------|----------|
| `context.notifyAt` | 50% | Gentle note: "Context halfway" |
| `context.urgentAt` | 80% | Strong suggestion to exhale soon (injected into prompt) |
| `context.autoExhaleAt` | 85% | Auto-exhale triggers - state saves, session rotates |

Override in `settings.json` - see [Configuration](configuration.md#context-warnings).

## Model Commands

| Command | Description |
|---------|-------------|
| `/model` | Open model selector - fuzzy search across all available models. |
| `/login` | Authenticate with a subscription provider (Claude Pro, ChatGPT, Copilot, Gemini CLI). |
| `/logout` | Clear OAuth credentials for a provider. |
| **Ctrl+P** | Cycle through available models (or models set by `--models`). |

See [Models & Providers](/docs/models) for full setup, including custom providers (Ollama, LM Studio), API key configuration, and `models.json`.

## Script Commands

Soma discovers bash scripts and makes them available as CLI commands. Type `soma <name>` and Soma finds `soma-<name>.sh` using a three-level discovery chain:

1. **Bundled** — `~/.soma/agent/scripts/` (ships with Soma)
2. **Project** — `.soma/amps/scripts/` (your project's scripts)
3. **Global** — `~/.soma/amps/scripts/` (your personal scripts)

First match wins. This means project scripts can override bundled ones.

### Codebase Tools

| Command | What it does |
|---------|-------------|
| `soma code map <file>` | Function/class index for any TS, JS, CSS, or Bash file |
| `soma code find <pattern> [dir]` | Scoped grep with file:line output |
| `soma code refs <symbol>` | Find definitions vs usages of a symbol |
| `soma code structure [dir]` | File tree with sizes |
| `soma code replace <file> <line> <old> <new>` | Line-specific sed replacement |
| `soma code blast <symbol> [dir]` | Blast radius — all files that reference a symbol |

```bash
# Map a file to see its structure
$ soma code map src/core/init.ts
  47: function scaffoldProject(dir, options)
  152: function installGitHooks(projectDir, somaDir)
  203: function seedScripts(somaDir, bundledDir)
  ...

# Find all references to a pattern
$ soma code find "settings.json" src/
  src/core/init.ts:89: const settingsPath = join(somaDir, "settings.json")
  src/core/prompt.ts:34: const settings = readSettings(settingsPath)
  ...
```

### Project Health

| Command | What it does |
|---------|-------------|
| `soma verify` | Post-change structural checks — symlinks, drift, stale refs |
| `soma refactor scan <file>` | Dependency graph and blast radius for a file |
| `soma refactor refs <symbol>` | Cross-file reference analysis |
| `soma health` | Project health dashboard — versions, services, disk |

### Session Maintenance

| Command | What it does |
|---------|-------------|
| `soma session list` | List all sessions with sizes per project |
| `soma session stats` | Image count, dimensions, oversized detection for latest session |
| `soma session strip-images` | Strip base64 image data from JSONL sessions (recovers disk space, fixes API limits) |
| `soma session strip --all` | Strip images from all sessions |
| `soma session strip --dry-run` | Preview what would be stripped without modifying |

When screenshots accumulate in a session, the JSONL file grows large (10-20MB) and can hit Anthropic's many-image size limit. `strip-images` replaces image data with text placeholders so `soma -c` can resume cleanly.

### Exploration

| Command | What it does |
|---------|-------------|
| `soma seam <topic>` | Trace a concept through memory, code, and sessions |
| `soma focus <keyword>` | Prime the next boot for a topic |
| `soma reflect` | Session log pattern mining |
| `soma plans` | Plan lifecycle management |
| `soma github <repo> <cmd>` | Scan GitHub repos without cloning (structure, map, deps, audit) |
| `soma tool` | List every registered Soma tool (one-liner each) |
| `soma tool <name>` | Full guidance for one tool — description, promptSnippet, promptGuidelines, parameters |
| `soma tool --extensions` | Group tools by the extension file that defines them |
| `soma new muscle <name>` | Scaffold a new muscle with correct frontmatter. `--global` writes to `~/.soma/`. `--no-edit` skips `$EDITOR`. |
| `soma new protocol <name>` | Scaffold a new protocol with correct frontmatter. Same flags as `new muscle`. |
| `soma children list` | Dashboard of background soma children registered in `~/.soma/state/children.json`. Enriched with live pane/cost data. |
| `soma children spawn <role> "<task>"` | Spawn a background child (tmux default; `--cmux` if available; `--model <alias>`). Registers in children.json. |
| `soma children watch [N]` | Flicker-free monitor dashboard, refresh every N seconds (default 2). Ctrl+C to stop. |
| `soma children tail <id>` | Tail a specific child's pane. |
| `soma children kill <id>` | Terminate a child. |
| `soma terminals list` | Show all terminal drivers with availability (tmux, cmux). |
| `soma terminals detect` | Same as list + recommended driver for this machine. |
| `soma terminals status` | Current configured driver (from `~/.soma/settings.json`). |
| `soma terminals prefer <driver>` | Persist driver preference to settings.json. |
| `soma terminals setup [<driver>]` | Walkthrough install + configure. No arg = detect first. |
| `soma terminals doctor [<driver>]` | Diagnose why a driver isn't working + suggest fixes. |
| `soma model-sync` | Audit `defaultModel` across global + project scopes. Read-only without `--set`. |
| `soma model-sync --set <id> [--crawl] [--yes]` | Set `defaultModel` at global + current project (and optionally all crawled `.soma/` dirs). `--yes` skips confirmation. |

### Installing More Scripts

Install community scripts from the hub:

```bash
soma hub install script soma-refactor
soma hub install script soma-browser
```

Or drop any `soma-<name>.sh` into `.soma/amps/scripts/` — it becomes `soma <name>` immediately, no restart needed.

Run `soma --help scripts` to see all discovered scripts with descriptions.

## CLI Commands

These commands are run from your **shell** (terminal), not inside the Soma TUI.

### Starting a Session

| Command | Description |
|---------|-------------|
| `soma` | **Fresh session** — runs the full boot sequence (identity, protocols, muscles, git context). By default does NOT load a preload (new projects have `preload.autoInject: false`). Use `soma inhale` to load your preload explicitly. |
| `soma inhale` | **Fresh session + preload** — starts a new session and loads the most recent preload. The recommended daily workflow: `/exhale` → review/update preload → `soma inhale`. Explicit and intentional — you know exactly what context the agent starts with. |
| `soma -c` | **Continue session** - reopens the last session with full conversation history preserved. No new boot sequence - you're back in the same context. |
| `soma -r` | **Resume picker** - choose from previous sessions to restore. |

> **`soma` vs `soma inhale` vs `soma -c`:**
>
> - `soma` = fresh start. No preload loaded (default `autoInject: false`). Good for quick sessions.
> - `soma inhale` = fresh start with deliberate preload. Best for daily work — you’ve reviewed and possibly updated the preload before loading it.
> - `soma -c` = same page. Full history, same context window. Best for short breaks.
>
> The preload is written during `/exhale` or `/breathe`. Power users often reflect and update the preload between sessions, then `soma inhale` to load the curated version.

### Session Options

These flags apply to the current session only — they don't change your defaults.

| Flag | Description |
|------|-------------|
| `soma --model <pattern>` | Start with a specific model for this session (e.g. `sonnet`, `opus-4-7`, `openai/gpt-4o`, `sonnet:high`). |
| `soma --provider <name>` | Use a specific provider for this session. |
| `soma --thinking <level>` | Set thinking level: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. |
| `soma --models <list>` | Limit Ctrl+P cycling to these models (comma-separated). |
| `soma --no-context-files` / `-nc` | Skip AGENTS.md and CLAUDE.md loading. |
| `soma --no-session` | Ephemeral session (not saved to disk). |
| `soma --print` / `-p` | Non-interactive: process prompt and exit. |
| `soma --list-models [search]` | List available models with optional fuzzy search. |
| `soma --map <name>` | Boot with a specific MAP loaded. |
| `soma --help` | Show formatted help. |

### Project Management

| Command | Description |
|---------|-------------|
| `soma init` | Initialize a new `.soma/` directory in the current project. First-time users also install the runtime here. Never updates an existing runtime — use `soma update` for that. |
| `soma update` | Update the installed Soma runtime in `~/.soma/agent/`. Pulls the latest soma-beta, runs `npm install --omit=dev` if dependencies changed (e.g. a new Pi runtime version). *As of v0.12.3* — previously this command was status-only. |
| `soma check-updates` | Report what updates are available without installing them. The old `soma update` behavior. |
| `soma model <pattern>` | Switch your default model. Fuzzy matches, asks you to pick if multiple hits, saves persistently. Use `soma model <pattern> set` to save without starting a session, or `soma model --list [search]` to browse. |
| `soma doctor` | Check project health and run migrations. Reports body file inventory, extension health, stale protocols, and version gaps. Tier 1 auto-fixes run silently. |
| `soma status` | Quick project health check — .soma/ structure, version, installed content. *As of v0.12.3* — now includes a Pi runtime check that flags drift between declared and installed Pi versions. |
| `soma --version` | Show agent version and CLI version. |
| `soma doctor --scan` | Scan for child .soma/ projects. |
| `soma doctor --all` | Fix all discovered projects. |

> **Update flow in v0.12.3+:** While the agent is running, the statusline quietly
> checks for new versions every 30 minutes. If there's one available, you'll see
> `⬆ update` in the statusline, and the next time you type `soma` you'll get a
> one-line notice pointing you at `soma update`. There's no background daemon
> and no network call at CLI launch — the check only runs while you're already
> using Soma.

## Pre-Session Tools

Run these **before** starting a session:

| Command | Description |
|---------|-------------|
| `soma focus <keyword>` | Prime the next boot for a topic - traces keyword through memory, boosts relevant muscles/MAPs. |
| `soma focus show` | Show current focus state. |
| `soma focus clear` | Remove focus. |

```bash
# Example: focus then start
soma focus authentication    # trace + boost auth-related content
soma                            # boots primed for auth work
```

## Scripts

Soma ships standalone bash scripts in `.soma/amps/scripts/`. They run outside the agent session and are also used by the agent during sessions. See [Scripts](/docs/scripts) for the full reference.

Key scripts:

| Script | What it does |
|--------|-------------|
| `soma code` | Codebase navigator: map, find, refs, replace, structure |
| `soma seam` | Trace concepts through memory, code, sessions |
| `soma query` | Unified search: find, list, sessions, related, impact |
| `soma reflect` | Session log pattern mining |
| `soma plans` | Plan lifecycle management |
| `soma scrape` | Doc discovery + scraping (requires gh, curl, jq) |
| `soma-snapshot.sh` | Rolling zip snapshots |

## The Breath Cycle

Commands map to Soma's breath metaphor:

1. **Inhale** - session starts, boot steps run in order (identity → preload → protocols → muscles → scripts → git-context). Configurable in [Configuration](configuration.md#boot-sequence).
2. **Work** - the session. Heat shifts based on what you use.
3. **Breathe** - context filling up? `/breathe` saves state and continues seamlessly.
4. **Exhale** - done for now? `/exhale` saves state and ends the session.
5. **Rest** - going to bed? `/rest` disables keepalive pings and exhales. No cache pings will fire after you walk away.

See [How It Works](/docs/how-it-works) for the full breath cycle explanation.
