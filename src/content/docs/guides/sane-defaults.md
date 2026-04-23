# Sane defaults

*Three commands that set up Soma the way most people want it, without you having to think about terminal vs TUI, global vs project, or which Opus is the latest.*

Soma's opinionated defaults come from three small CLIs, each solving one "what should the dial be set to" question. They're all runnable from your shell (outside Soma) and from inside a Soma session via the `bash` tool.

## TL;DR

```bash
# Pick the model once. Applies at global + current project + any other .soma/ dirs under $HOME.
soma model-sync --set claude-opus-4-7 --crawl --yes

# Pick the terminal driver for background delegation. tmux is the ship-to-npm baseline.
soma terminals prefer tmux

# Check + migrate project structure. Existing Soma command.
soma doctor
```

Run all three after a fresh install and you're set. The preferences persist in `~/.soma/settings.json` and, where appropriate, `<project>/.soma/settings.json`.

---

## `soma model-sync` — keep the model consistent

**Problem:** You have multiple Soma projects (`~/work/X/.soma`, `~/sandbox/Y/.soma`, etc.), plus your global settings at `~/.soma/settings.json`. You upgrade to a new Claude release. Now you have to remember to update `defaultModel` everywhere — or worse, you don't, and some sessions silently pick the wrong model.

`soma model-sync` audits + syncs `defaultModel` across all of those scopes in one command.

### Audit (no changes)

```bash
soma model-sync
```

Shows `defaultModel` at two scopes:
- **global** — `~/.soma/settings.json`
- **project** — `<cwd>/.soma/settings.json` (only if cwd has a `.soma/`)

Add `--crawl` to also report all other `.soma/` dirs under `$HOME`:

```bash
soma model-sync --crawl
soma model-sync --crawl --crawl-root ~/work    # override the root
```

Crawl depth is bounded (default 3 levels) and skips `node_modules/` and hidden dirs.

### Set everywhere

```bash
soma model-sync --set claude-opus-4-7
```

Prompts before writing. Writes to global + current project (and any crawled dirs if `--crawl`). Creates `settings.json` where one doesn't exist (with just the `defaultModel` key — no other fields touched). Preserves all existing keys in files that are already populated.

Add `--yes` / `-y` for automation (no prompt):

```bash
soma model-sync --set claude-opus-4-7 --crawl --yes
```

Idempotent — running again is a no-op if everything is already at the target model.

### Bare `--set`

`soma model-sync --set` (no value) falls back to the script's bundled default model. Useful shorthand: "I want the sensible default, don't make me type it."

### Reading the output

```
✓ global (~/.soma/settings.json)   claude-opus-4-7
✓ project (~/projects/app/.soma/)   claude-opus-4-7
- ~/projects/archive/old-tool        (no settings.json)
? ~/projects/sandbox                 (no defaultModel set)
```

Legend: `✓` matches target, `?` settings.json exists but no `defaultModel`, `-` no settings.json at all, `~` about to change, `+` about to add (was unset), `=` already at target.

### Caveats

- **Resumed sessions keep whatever model was picked at creation.** `soma -c` doesn't re-read `defaultModel`. Start a fresh `soma` to pick up the new default.
- **Pi's model registry may not know every id.** If you set `defaultModel: claude-opus-4-7` and Pi's local `models.generated.js` is behind, Pi will fall back at session start. This script only writes the preference; Pi handles resolution.

---

## `soma terminals` — pick a terminal driver for background delegation

**Problem:** `delegate(background:true)` + `soma children spawn` need a terminal container to run the child in. On macOS dev machines with cmux running, cmux works. For everyone else — Linux, CI, macOS without cmux — you need tmux (or a future AppleScript driver).

`soma terminals` detects what's installed, lets you pick, persists the choice.

### Subcommands

```bash
soma terminals list                       # drivers + availability
soma terminals detect                     # list + recommendation
soma terminals status                     # current configured driver
soma terminals prefer <driver>            # persist to ~/.soma/settings.json
soma terminals setup [<driver>]           # install + verify walkthrough
soma terminals doctor [<driver>]          # diagnose why a driver isn't working
```

### Typical flow

```bash
soma terminals detect
# → Recommendation: Use 'tmux' — tmux (detached session, attach-on-demand)
#   Run: soma terminals prefer tmux to persist.

soma terminals prefer tmux
# → wrote delegate.terminal = tmux to /Users/you/.soma/settings.json
```

Subsequent `delegate(background:true)` uses tmux without asking. Override per-call via `delegate(terminal:'cmux', ...)`.

### Precedence

Driver is resolved in this order (highest wins):
1. Per-call `delegate(terminal:...)` arg
2. `~/.soma/settings.json` `delegate.terminal`
3. Auto-pick (tmux > cmux > … future drivers)

### Troubleshooting

```bash
soma terminals doctor tmux
```

Runs the availability check, surfaces `tmux -V`, lists active sessions, and shows test commands (`tmux new-session -d -s soma-doctor-test`) you can run manually. When `delegate(background:true)` returns "no driver available," this is the first command to run.

See [background-delegation.md](background-delegation.md) for the full story of how drivers plug into `delegate` + `children`.

---

## `soma doctor` — project health + migrations

The existing health check, for completeness:

```bash
soma doctor                   # diagnose
soma doctor --fix             # auto-repair simple issues
soma doctor --scan            # find all .soma/ projects on disk
soma doctor --migrate         # agent-driven migration for complex changes
```

`soma doctor` runs the declarative migration system: each migration MAP declares `replay-until: <version>` and a `## Doctor Actions` JSON block. Any MAP whose replay-until is above the current agent version re-runs idempotently on every `doctor` invocation — backfilling missing settings keys, scaffolding missing template files, etc.

Not directly about defaults, but it's the third "run this and forget" command. After a fresh install:

```bash
soma init                                            # scaffold .soma/
soma model-sync --set claude-opus-4-7 --crawl --yes  # model default everywhere
soma terminals prefer tmux                           # terminal driver
soma doctor                                          # verify structure
```

---

## Where these live

All three ship in the agent install:

- `soma model-sync` → `scripts/soma-model-sync.sh` (bundled)
- `soma terminals` → `scripts/soma-terminals.sh` (bundled)
- `soma doctor` → `dist/thin-cli.js projectDoctor()` (meetsoma npm CLI)

Settings land in two JSON files:

- `~/.soma/settings.json` (global — all three tools may touch this)
- `<project>/.soma/settings.json` (project-scoped — `model-sync` can target; `doctor` migrates this)

## Test coverage

- `tests/test-model-sync.sh` — 23 assertions covering audit mode, `--set` create/overwrite/idempotence, `--crawl` discovery + update, invalid input rejection, `-y`/`--yes` alias parity.
- Sandbox surface checks in `scripts/_dev/sandbox/soma-sandbox.sh §v0.21.1 Surface` — confirms both scripts ship + are executable in a fresh install, + a functional smoke of audit and `--set --yes` against an isolated `$HOME`.
