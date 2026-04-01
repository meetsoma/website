---
title: "Getting Started"
description: "Install Soma, run your first session, understand the basics."
section: "First Steps"
order: 1
---

<!-- tldr -->
`npm i -g meetsoma` → `cd your-project` → `soma`. First run creates `.soma/` and discovers identity. Use `soma inhale` to continue with a preload from last session, or `soma -c` to resume with full history. `/exhale` saves state + writes a preload, `/breathe` rotates into a fresh session, `/pin` keeps content hot, `/kill` drops it cold.
<!-- /tldr -->

## Install

```bash
npm install -g meetsoma
```

## Set Up a Provider

Soma needs an AI provider to work. The fastest option:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Add this to your shell profile (`~/.zshrc` or `~/.bashrc`) to persist it.

**Other providers:** Soma supports 17+ providers including OpenAI, Google Gemini, Ollama, GitHub Copilot, and more. See [Models & Providers](/docs/models) for the full setup guide.

**No API key?** Free options exist:
- Use `/login` with **Google Gemini CLI** or **Google Antigravity** (free with any Google account)
- Use **GitHub Copilot** if you have a subscription
- Run local models via **Ollama** (free, no API key needed — see [Custom Providers](/docs/models#custom-providers-ollama-lm-studio-etc))

## First Run

```bash
cd your-project
soma
```

On first run, Soma will ask to create a `.soma/` directory. Say yes.

**Smart init** detects your project automatically and tailors the setup:

| What's Detected | How | Effect |
|----------------|-----|--------|
| **Parent `.soma/`** | Walks up filesystem | Inherits identity, protocols, muscles, tools |
| **`CLAUDE.md`** | Checks project root | Notes existing project instructions (no conflict) |
| **Package manager** | Looks for lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`) | Sets preference in identity |
| **Language/framework** | Scans for `tsconfig.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, etc. | Tailors identity and suggests relevant protocols |
| **Monorepo signals** | Detects `pnpm-workspace.yaml`, multiple `package.json`, etc. | Suggests parent-child setup |

The detected context shapes Soma's initial identity and the protocols it recommends installing. You can always edit `SOMA.md` afterward.

## Session Modes

### Fresh Session

```bash
soma
```

Starts fresh. Runs the [boot sequence](/docs/configuration#boot-sequence): identity, protocols, muscles, scripts, git context. No preload, no prior context — blank slate.

### Continue Where You Left Off

```bash
soma inhale
```

Starts a **fresh session** and automatically loads the most recent preload — the briefing your last session wrote during `/exhale`. This is the recommended way to continue a project day-to-day: fresh context window, but the agent knows what happened, what's next, and what files to read.

> **When to use:** Morning start, picking up after a break, any time you want continuity without the weight of full conversation history.

### Resume Full Session

```bash
soma -c
```

Reopens the last session with **full conversation history** preserved — same context, same thread. No new boot sequence. Best for short breaks (lunch, meeting) where you want to jump right back in.

### Select a Session

```bash
soma -r
```

Pick from previous sessions to resume.

### The Difference

| Command | Context | Memory | Best for |
|---------|---------|--------|----------|
| `soma` | Fresh | None | New work, exploring |
| `soma inhale` | Fresh | Preload from last `/exhale` | Daily continuation |
| `soma -c` | Full history | Complete conversation | Short breaks |

## Commands

| Command | What it does |
|---------|-------------|
| `/breathe` | Save state + rotate into fresh session |
| `/exhale` | Save state, write preload, session ends |
| `/rest` | Disable keepalive + exhale — for when you're done for the night |
| `/inhale` | Check preload status — shows if preload exists, warns if stale |
| `/pin <name>` | Pin a protocol/muscle to hot (stays loaded) |
| `/kill <name>` | Kill a protocol/muscle (drops to cold) |
| `/keepalive` | Toggle cache keepalive on/off (or check status) |
| `/status` | Show session stats — context %, cache, keepalive, turns, uptime |
| `/preload` | List available preload files |
| `/soma status` | Show memory status (identity, preload, muscles, protocols) |
| `/soma init` | Create `.soma/` in current directory |
| `/soma prompt` | Preview compiled system prompt with token estimate |

## The `.soma/` Directory

Created by `soma init` or on first run:

```
.soma/
├── SOMA.md                  ← who Soma becomes (discovered through use)
├── settings.json            ← configurable thresholds
├── state.json               ← heat state (auto-managed, gitignored)
├── STATE.md                 ← project architecture snapshot
│
├── body/                    ← structured identity templates
│   ├── soul.md              ← who Soma is in this project
│   ├── voice.md             ← how Soma communicates
│   ├── _mind.md             ← system prompt template
│   └── _memory.md           ← preload template
│
├── amps/                    ← the AMPS content system
│   ├── automations/         ← triggered actions
│   ├── muscles/             ← learned patterns
│   ├── protocols/           ← behavioral rules (17 ship by default)
│   └── scripts/             ← developer tools (6 seeded on init)
│       ├── soma-code.sh     ← codebase navigator
│       ├── soma-seam.sh     ← concept tracing
│       ├── soma-focus.sh    ← session priming
│       └── commands/        ← drop-in /soma commands
│
├── memory/                  ← temporal state
│   ├── preloads/            ← session continuations
│   └── sessions/            ← per-session work logs
│
└── skills/                  ← knowledge sets (SKILL.md format)
```

Run `soma --help scripts` to see what's installed with descriptions.

### What's Private vs Public

If you're using Soma in a public repo:

- **Ships with repo:** `.soma/amps/protocols/`, `.soma/amps/scripts/`, `.soma/skills/`, `.soma/body/`
- **Gitignored (private):** `.soma/state.json`, `.soma/memory/`, `.soma/debug/`, `.soma/secrets/`

Identity and templates ship. Session data doesn't.

## Switching Models

Press **Ctrl+P** during a session to cycle models, or use `/model` to pick from a searchable list.

From the command line:

```bash
soma --model gpt-4o              # start with a specific model
soma --model sonnet:high         # with thinking level
soma --models sonnet,haiku,gpt-4o  # limit cycling to these
soma --list-models               # see all available
```

See [Models & Providers](/docs/models) for the full guide — including custom providers, Ollama setup, OAuth login, and API key management.

## Tips

- **Let identity grow** — don't pre-write it. Let Soma discover who it becomes through your work.
- **Trust the breath** — don't worry about context limits. `/breathe` rotates seamlessly. `/exhale` when you're done.
- **Daily workflow** — `/exhale` at end of day, `soma inhale` next morning. That's it.
- **Explore commands** — run `soma --help` for all CLI commands, `soma --help scripts` for installed tools, `soma --help commands` for the full reference.
- **Switch models freely** — use `/model` or `Ctrl+P` mid-session. See [Models & Providers](/docs/models).
- **Tune settings** — everything is configurable: boot steps, heat thresholds, context warnings. See [Configuration](/docs/configuration).
