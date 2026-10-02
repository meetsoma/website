---
title: "Commands"
description: "Slash commands, CLI flags, context warnings, the breath cycle."
section: "Reference"
updated: 2026-10-02
order: 7
---

# Commands

<!-- tldr -->
CLI: `soma` (fresh, no preload), `soma inhale` (fresh + the preload soma ranks first), `soma preload` → `soma preload <#>` (list, then fresh + the preload you pick), `soma -c` (continue full history), `soma -r` (resume picker). Session: `/inhale`, `/breathe`, `/exhale`, `/rest`. Heat: `/pin <name>`, `/kill <name>`. Hub: `/hub install`, `/hub find`, `/hub list`, `/hub fork`, `/hub share`. Management: `/soma status`, `/soma init`, `/soma prompt`, `/soma <command>` (drop-in scripts). Body: `/body check`, `/body vars`, `/body map`, `/body render`. Script commands: `soma code` (codebase navigator), `soma verify` (structural checks), `soma refactor` (dependency analysis), `soma seam` (concept tracing), `soma session` (maintenance — strip images, list, stats). Scripts discovered via chain: bundled → project → global.
<!-- /tldr -->

Soma registers slash commands that control the breath cycle, heat system, and session management.

## Session Commands

These are **slash commands** used inside the Soma TUI during a session.

| Command | Description |
|---------|-------------|
| `/inhale` | **Reset session and load preload.** Saves heat state, starts a fresh session, and loads the most recent preload. Two use cases: (1) you started with plain `soma` and want the preload — `/inhale` resets and loads it. (2) You `/exhale`’d, updated the preload, and want to continue — `/inhale` gives you a fresh session with your curated preload. Warns if preload is stale (>5 tool calls since written). Use `--force` to override. `/inhale <arc>` finds the preload for that arc by arc name, not just filename — ambiguous matches list the candidates. |
| `/breathe` | Save state and rotate into a fresh session. Seamless rotation - exhale + inhale in one motion. |
| `/exhale ["note"]` | Save state to disk. Writes `preload-next-<date>-<id>.md` to `memory/preloads/`, saves heat state with decay for unused content. Signals shared preload lifecycle (state → `REQUESTED`) so auto-rotation safety net defers. Session ends. **Optional note:** text after `/exhale` is injected as a `⚠️ USER NOTE` block — the agent uses it to scope this wrap ("quick" skips body audit + MLR) AND to pass directives forward to the next session. (v0.28.1) |
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
| `/reload` | Re-imports extensions (fresh jiti, `moduleCache: false` per `loader.js:271`), reloads settings + skills + themes + keybindings + prompts. **Preserves the compiled system prompt** (restored from disk cache by soma-boot's cache-stickiness). | After editing the **JavaScript layer** of an extension — the `.ts` file's `execute` body, `register()` function, etc. **Not needed** when editing a CLI script that an extension shells out to (the wrapper spawns a fresh subprocess each call — it picks up edits to the script automatically). **Pair with `/rebuild`** when you edited a `pi.registerTool` tool's `description`/`parameters`/`promptSnippet` — `/reload` updates the local registry but the system prompt sent to Anthropic is restored from cache, so the model still sees the old fields. `route.provide` caps don't have this issue (caps live in the runtime registry, not the prompt). Pi 0.80.x+ also makes `pi.registerTool()` calls *added at runtime* live without `/reload`. See [extending.md § Cache-safe registration vs hot-reload](extending.md#cache-safe-registration-vs-hot-reload-dont-conflate). |
| `/rebuild` | Recompiles the system prompt from `body/*.md` and deletes the disk cache. Takes effect on the next turn. | **Optional.** Only when you've edited `body/*.md` mid-session AND you want the change to apply right now. Costs one cache write (~$1 on Sonnet/Opus). If you can wait for the next session, skip it. |

`/reload` covers everything Pi hot-reloads — extensions, skills, prompts,
themes, keybindings (authority: Pi's extensions docs). Extensions are
loaded via [jiti](https://github.com/unjs/jiti), which is mtime-keyed,
so transitive `core/*.ts` imports refresh along with them. If you
changed a `.ts` file, `/reload` picks it up.

### Statusline line 3 — what each label means

When a commit (or your own edits) touches files the running session might want
to pick up, line 3 of the statusline shows a short tag (`🔄 /reload`,
`📝 /rebuild?`, `⚠ relaunch`). See **[Statusline & Notices](/docs/statusline)**
for the full table and what to do for each — along with every other statusline
indicator and Soma's toast notices.

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
| `/soma vision-review <path> "<prompt>"` | **Image/vision analysis** — sends screenshot or image to Cohere Command A Vision for analysis. Also available as CLI: `soma vision-review <path> "<prompt>"`. Use when your current model lacks vision support. Requires Cohere API key (free tier available). |
| `/body [check\|vars\|map\|render]` | Body template inspector. `check` = health report, `vars` = all variables by category, `map` = template structure, `render` = full compiled system prompt. All support `--send`. |

## Toggle Commands

| Command | Description |
|---------|-------------|
| `/auto-breathe off\|global\|model-aware\|status` | Tri-state proactive context management (cycle 16, v0.27.1). `off` = passive notifications only. `global` = fixed `triggerAt`/`rotateAt` percentages (legacy behavior). `model-aware` = per-glob thresholds from `breathe.thresholds` map (default install). `status` = show resolved thresholds for current model. Sonnet defaults: warn at 28-33%, exhale at 34-50% (BEFORE the empirical ~48% long-context wall). Boolean still parsed for back-compat (true → "global", false → "off") via migration `breathe-tri-state-v0.27.0`. |
| `/auto-commit on\|off` | Toggle auto-commit of `.soma/` state on exhale/breathe. Default: on. |
| `/keepalive on\|off` | Toggle cache keepalive. When enabled, sends periodic pings to prevent cache eviction during idle periods. |

## Context Warnings

Soma monitors context usage and warns at configurable thresholds:

| Setting | Default | Behavior |
|---------|---------|----------|
| `context.notifyAt` | 50% | Gentle note: "Context halfway" |
| `context.urgentAt` | 80% | Strong suggestion to exhale soon (injected into prompt) |
| `context.autoExhaleAt` | 85% | Safety net fires — by default it asks for a preload and keeps running (`breathe.onFull`) |

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
| `soma terminals detect [--json]` | Which terminal app you are in (`warp`, `iterm`, … — sees through tmux), then the driver list + a recommendation. `--json` prints one line: `{app, insideTmux, container, source}`. |
| `soma terminals status` | Current configured driver (from `~/.soma/settings.json`). |
| `soma terminals prefer <driver>` | Persist driver preference to settings.json. |
| `soma terminals setup [<driver>]` | Walkthrough install + configure. No arg = detect first. |
| `soma terminals doctor [<driver>]` | Diagnose why a driver isn't working + suggest fixes. |
| `soma terminals open <layout.json>` | Put commands where you are looking. In Warp: a new tab in the active window with the panes pre-split (a Tab Config). Inside tmux: splits your current window. Anywhere else: splits only if you configured a viewer (`delegate.viewer`), otherwise prints the commands to run. `--dry-run` shows what it would do; `--adapter warp\|tmux\|viewer` forces one. Exit 0 = opened, 1 = handed you the commands. |
| `soma terminals grid <id>...` | `open` with one pane per session, each running `soma attach <id>`. |
| `soma terminals tune [--yes] [--remove] [--json]` | Checks the four tmux keys that let a modern terminal's key combos, images and focus reach the agent inside (`extended-keys`, `terminal-features extkeys`, `allow-passthrough`, `focus-events`). Shows what is missing, asks, then appends one fenced `# >>> soma tmux >>>` block to your tmux conf (backup taken; running server reloaded). `--remove` takes the block out again. `soma doctor` mentions it when something is unset. |
| `soma model-sync` | Audit `defaultModel` across global + project scopes. Read-only without `--set`. |
| `soma model-sync --set <id> [--crawl] [--yes]` | Set `defaultModel` at global + current project (and optionally all crawled `.soma/` dirs). `--yes` skips confirmation. |

### Installing More Scripts

Install community scripts from the hub:

```bash
soma hub install script soma-refactor
soma hub install script soma-browser   # shell CLI; for agent use, prefer soma:browser.* (see browser-setup.md)
```

Or drop any `soma-<name>.sh` into `.soma/amps/scripts/` — it becomes `soma <name>` immediately, no restart needed.

**For agent-facing browser automation**, use `soma:browser.*` instead of the shell CLI. The cap surface auto-configures for any Chromium-family browser + Firefox via env or settings:

```
soma(op='call', cap='soma:browser.setup')      # first-run probe + configure
soma(op='call', cap='soma:browser.navigate', args={url: '...'})
```

See `cli-tools.md` for the three-pattern model (when to use shell scripts vs caps), `browser-setup.md` for the multi-browser configuration, and `pro-tools.md` for the tier distinction.

Run `soma --help scripts` to see all discovered scripts with descriptions.

## CLI Commands

These commands are run from your **shell** (terminal), not inside the Soma TUI.

### Starting a Session

| Command | Description |
|---------|-------------|
| `soma` | **Fresh session** — runs the full boot sequence (identity, protocols, muscles, git context). By default does NOT load a preload (new projects have `preload.autoInject: false`). Use `soma inhale` to load your preload explicitly. |
| `soma inhale` | **Fresh session + preload** — starts a new session and loads the most recent preload. The recommended daily workflow: `/exhale` → review/update preload → `soma inhale`. |
| `soma inhale --list` | **Show available preloads** — lists all preloads with age and staleness. Stale (>48h) preloads are flagged with ⚠. Use to see what the agent will load. |
| `soma inhale <name>` | **Load a specific preload** — partial name match (e.g. `soma inhale s01-xxxxxx`). Useful when you want a specific session's context, not the latest. Composes with `--model` and other session flags. |
| `soma preload` 🚧 | **List preload lanes** — one numbered row per preload, newest sealed first: age, arc, lane, what it supersedes. With two live lanes, this is how you choose instead of guessing which one `soma inhale` will take. |
| `soma --package <a,b>` | **Mount only these domain packages** for the session — the rest of your declared packages (their doorway, protocols, muscles, body files, tools) stay out. Repeatable; composes with `soma inhale`. A preload can say the same thing with `focus: [a, b]` in its frontmatter. See [Domain packages → Focusing a session](/docs/domain-packages#focusing-a-session-on-some-of-them). |
| `soma preload <#\|name>` 🚧 | **Start a session on that preload** — by row number or partial name; extra flags (`--model …`) pass through to `soma inhale`. |
| `soma -c` | **Continue session** - reopens the last session with full conversation history preserved. No new boot sequence - you're back in the same context. |
| `soma -r` | **Resume picker** - choose from previous sessions to restore. |
| `soma attach` 🚧 | **Reconnect to a session that is still running** — lists every live session and the command to reach each one. See below. |
| `soma start` 🚧 | **Restart a session that has stopped** — the other half of `soma attach`. Choose which, instead of taking whatever wrote last. |
| `soma attach --kill <#\|id>` 🚧 | **Stop a running session.** `--kill all` stops every one except yours. |

### Picking a preload lane

When two pieces of work are live at once, each `/exhale` leaves its own preload — and a bare
`soma inhale` takes the one its own ranking prefers, which may not be the lane you meant. `soma preload`
shows the lanes and lets you choose:

```console
$ soma preload

  σ  Preload lanes  (10 preload(s) · 3 fresh <48h · newest sealed first)

  1  s01-xxxxxx  lane A  ← newest sealed
     my-app/auth-refactor — step 3 · sealed Sep  5 16:05 · supersedes s01-yyyyyy
     soma preload 1
```

Reading a row: **`1`** row number · **`s01-xxxxxx`** the lane's short name · **`lane A`** its
declared lane · **`← newest sealed`** the most recently sealed file. A bare `soma inhale` ranks by
when each preload was written and which work it continues, so it can load a different row;
`soma preload <#>` always loads exactly the row you name. The second line is the arc it briefs,
when it was last sealed, and which earlier preload it retired. The third line is the command that boots exactly that lane — `--model …` passes through.
A row marked `SUPERSEDED` is a retired lane; don't boot it.

### Reconnecting to a Running Session

> 🚧 **Coming soon** — `soma attach` lands in the next release.

`soma -c` and `soma -r` reopen a session that has *stopped*. `soma attach` is for one that is
still **running** right now — an agent working in another terminal, a background child, a session
you left in a tmux tab this morning.

```console
$ soma attach

  σ  Running soma sessions  (3 live)

  1  s01-xxxxxx  ~/code/api                        ← you are here
     16 turns · up 2m · tmux soma-child-xxxxxx:1.1
     soma attach s01-xxxxxx

  2  s01-yyyyyy  ~/code/dashboard
     276 turns · up 1h48m · tmux soma-succ-dashboard:1.1
     soma attach s01-yyyyyy

  3  s01-zzzzzz  ~/code/api
     116 turns · up 10h56m · pid 2339 · not in tmux
     no terminal to attach to

  by row: soma attach 1   ·  more: soma attach --help
```

Every row carries the command that reaches it, so reconnecting is a copy and a paste. Each row also
names **what the session is** and **what it is running** — see *Who is who* below.

| Command | What it does |
|---------|-------------|
| `soma attach` | List running sessions, newest first, each with the command to reconnect |
| `soma attach <#>` | Reconnect by row number |
| `soma attach <s01-xxxxxx>` | Reconnect by session id |
| `soma attach <tmux-name>` | Reconnect by tmux session name |
| `soma attach --kill <#\|id>` | Stop that session |
| `soma attach --kill all` | Stop every running session except the one you are in |
| `soma attach --help` | Usage plus the related commands |

#### `soma start` — the stopped half

`soma attach` reaches sessions that are **running**. `soma start` lists the ones that have
**stopped**, in the same rows, and reopens one with its full history:

```console
$ soma start

  σ  Stopped soma sessions  (12 of 89 · last 48h · 1853 here)

  1  s01-xxxxxx  ↳reviewer of 0b9d47
     0.3 MB · last wrote Sep  2 17:02 · claude-fable-5
     soma start s01-xxxxxx

  2  s01-yyyyyy  dashboard W1-W4
     3.7 MB · last wrote Sep  2 14:57 · claude-opus-5
     soma start s01-yyyyyy

  …78 more — SOMA_START_LIMIT=90 soma start for all
  also soma attach — 7 session(s) still RUNNING
  widen: soma start --hours 168 · all projects: --all
```

It is `soma -c`, except **you** choose which. Scoped to the current project and the last 48 hours by
default (`--hours <n>`, `--all` for every project), and it always prints its own denominator so a
short list never reads as the whole set.

**The two lists partition your sessions:** every session is in exactly one of them, so each footer
points at the other.

| Command | What it does |
|---------|-------------|
| `soma start` | List stopped sessions in this project |
| `soma start <#\|s01-xxxxxx>` | Reopen it with full history |
| `soma start --hours <n>` | Widen the time window (default 48) |
| `soma start --all` | Every project, not just this one |

#### Who is who — child, successor, orchestrator

A row marked `↳` was spawned by something else:

```
  1  s01-xxxxxx  ↳product-architect of 5f2e8b  ~/code/api
  2  s01-yyyyyy                                ~/code/api
```

Row 1 is a **delegated child** of row 2; row 2 is unmarked, so it is an **orchestrator** — a session
you drive. A successor created by a rotation reads `↳succ of <id>`. Each row also shows the model
the session was last on, so you can tell two otherwise identical sessions apart without opening
either.

This is why `soma -c` can now tell your own session from the children it spawned.

> A session records what it is **at boot**. Sessions started before this feature show no marker —
> they read as orchestrators, which is how they behaved anyway.

#### Stopping a session

```bash
soma attach --kill 3            # by row
soma attach --kill s01-xxxxxx   # by id
soma attach --kill all          # all but the one you are in
```

**Killing is not deleting.** The transcript is untouched and the session moves to the `soma start`
list, so you can reopen it with its full history. Soma asks the session to stop first, so it saves
and deregisters itself; it escalates only if the session refuses, and confirms rather than assuming.
It will not kill the session you are typing in, and `--kill all` asks before acting.

> ⚠ Not to be confused with `/kill <name>` **inside** the TUI, which drops a muscle or protocol to
> cold. Different surface, different verb.

A terminal pane that was started *with* a session closes when it stops. A pane where you typed
`soma` yourself keeps its shell — stopping a session never closes the terminal you were working in.

#### It works from inside tmux

Plain `tmux attach` refuses when you are already inside tmux — which a Warp, WezTerm or iTerm tab
often is, so the obvious command fails exactly where you need it. `soma attach` picks the right
move for where you are standing:

```
  where are you?
  │
  ├─ a plain shell ..... tmux attach
  ├─ the SAME tmux ..... tmux switch-client   ← plain attach
  └─ ANOTHER tmux ...... TMUX= tmux attach        refuses here
```

Detach again with your tmux prefix then `d` (default <kbd>Ctrl</kbd>+<kbd>b</kbd> `d`).

#### Liveness is measured, not guessed

A terminal pane keeps printing a session id in its title and scrollback long after the agent
inside it exited, so anything that reads pane text can send you to a dead pane. `soma attach`
instead reads each session's **heartbeat** — a file the running process refreshes every few
seconds — and confirms the process id is alive, then finds the pane by walking that process's
ancestry. A stopped session never appears in the list.

#### When you ask for something that isn't there

The command answers with the one that *is* right:

| You typed | You get |
|-----------|---------|
| an id that is no longer running | `soma inhale <id>` (fresh session, its memory) or `soma --fork <id>` |
| a session running outside tmux | told plainly — there is no terminal to attach to |
| a tmux name that doesn't exist | the live session names, as copyable commands |

> **`soma` vs `soma inhale` vs `soma preload` vs `soma -c`:**
>
> - `soma` = fresh start. No preload loaded (default `autoInject: false`). Good for quick sessions and new work.
> - `soma inhale` = fresh start with a preload **soma picks** (its ranking, not necessarily the newest file). Fine when there is one lane.
> - `soma preload` → `soma preload <#>` = list the preloads, then fresh start with **the one you pick**. Best when several lanes are live — you choose the work, not the ranking.
> - `soma inhale <name>` = the same as `soma preload <#>`, by (partial) filename.
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
| `soma update` | Update the installed Soma runtime in `~/.soma/agent/`. Pulls the latest `meetsoma/core`, runs `npm install --omit=dev` if dependencies changed (e.g. a new Pi runtime version). |
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
