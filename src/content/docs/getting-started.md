---
title: "Getting Started"
description: "Install Soma, run your first session, understand the basics."
section: "First Steps"
order: 1
---

<!-- tldr -->
`npm i -g meetsoma` → `cd your-project` → `soma`. First run creates `.soma/` and discovers identity. `/exhale` saves state + writes a preload. `soma inhale` starts fresh with that preload loaded. `/breathe` rotates mid-session. `/pin` keeps content hot, `/kill` drops it cold. `soma -c` resumes with full conversation history.
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

**Other providers:** Soma supports 23 providers including OpenAI, Google Gemini, Ollama, GitHub Copilot, and more. See [Models & Providers](/docs/models) for the full setup guide.

**No API key?** Free options exist:
- Use `/login` with **Google Gemini CLI** or **Google Antigravity** (free with any Google account)
- Use **GitHub Copilot** if you have a subscription
- Run local models via **Ollama** (free, no API key needed - see [Custom Providers](/docs/models#custom-providers-ollama-lm-studio-etc))

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

The detected context shapes Soma's initial identity at `body/soul.md`. You can always edit it afterward — or split into `body/voice.md`, `body/journal.md` etc. as your identity grows.

## Session Modes

### Fresh Session

```bash
soma
```

Starts fresh. Runs the [boot sequence](/docs/configuration#boot-sequence): identity, protocols, muscles, scripts, git context. No preload is loaded by default (`preload.autoInject: false`). Use `soma inhale` when you want to load your preload explicitly.

### Inhale (recommended daily workflow)

```bash
soma inhale
```

Starts a **fresh session** and loads the most recent preload - the briefing your last session wrote during `/exhale`. This is the recommended way to continue a project:

1. `/exhale` at end of session → writes preload
2. Review, reflect, update the preload if needed
3. `soma inhale` → fresh context with your curated preload

The difference from plain `soma`: `soma inhale` is **intentional**. You're saying "I've prepared the preload, load it now." Plain `soma` auto-loads quietly in the background.

### Resume Full Session

```bash
soma -c
```

Reopens the last session with **full conversation history** preserved - same context, same thread. No new boot sequence. Best for short breaks (lunch, meeting) where you want to jump right back in.

### Select a Session

```bash
soma -r
```

Pick from previous sessions to resume.

### The Difference

| Command | Context | Memory | Best for |
|---------|---------|--------|----------|
| `soma` | Fresh | Auto-loads preload (if exists) | Quick starts, new work |
| `soma inhale` | Fresh | Loads preload (explicit) | Daily continuation after review |
| `soma -c` | Full history | Complete conversation | Short breaks |

## Commands

| Command | What it does |
|---------|-------------|
| `/breathe` | Save state + rotate into fresh session |
| `/exhale` | Save state, write preload, session ends |
| `/rest` | Disable keepalive + exhale - for when you're done for the night |
| `/inhale` | Reset session and load preload — fresh start with your most recent preload |
| `/pin <name>` | Pin a protocol/muscle to hot (stays loaded) |
| `/kill <name>` | Kill a protocol/muscle (drops to cold) |
| `/keepalive` | Toggle cache keepalive on/off (or check status) |
| `/status` | Show session stats - context %, cache, keepalive, turns, uptime |
| `/preload` | List available preload files |
| `/soma status` | Show memory status (identity, preload, muscles, protocols) |
| `/soma init` | Create `.soma/` in current directory |
| `/soma prompt` | Preview compiled system prompt with token estimate |

## The `.soma/` Directory

Created by `soma init` or on first run:

```
.soma/
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
│   └── scripts/             ← developer tools (11 seeded on init)
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

See [Models & Providers](/docs/models) for the full guide - including custom providers, Ollama setup, OAuth login, and API key management.

## Script Commands

Soma ships with developer tools you can run from your terminal:

```bash
# Map a file's structure (functions, classes, exports)
soma code map src/App.tsx

# Find a pattern across the codebase
soma code find "useState" src/

# Trace a concept through memory and code
soma seam authentication

# Prime the next session for a topic
soma focus deployment
```

Scripts are discovered automatically — drop any `soma-<name>.sh` into `.soma/amps/scripts/` and it becomes `soma <name>`. Install more from the hub with `soma hub install script <name>`.

See [Commands](/docs/commands#script-commands) for the full reference.

## Connect to Somaverse

Somaverse gives your agent a visual workspace in the browser — a tiling desktop of plugin panes that Soma can see, control, and interact with.

```bash
soma login
```

This creates a pairing code, opens your browser to [somaverse.ai](https://somaverse.ai), and waits for you to enter the code. Once paired, your device key is saved to `~/.soma/device-key` and Soma auto-connects on every future session.

**What you get:**
- 🖥️ **28 workspace tools** — Soma sees your panes, sends commands, takes snapshots, manages layout
- 🌐 **Remote access** — control your workspace from anywhere, even with the browser tab minimized
- 🔒 **Your data stays local** — Somaverse is a relay, not storage. Everything flows through to your machine
- 🧩 **33 plugins** — chat, terminal, files, editor, browser, voice, graph, and more

**How it works:**

```
Your browser (somaverse.ai)
  ↕ secure WebSocket
Somaverse hub (relay — routes messages, stores nothing)
  ↕ secure WebSocket  
Your machine (soma agent — does the actual work)
```

The hub never sees your data as data — it's just passing messages. Your files, conversations, API keys, and graph all stay on your machine.

See [How It Works](/docs/how-it-works#somaverse) for the architecture deep-dive.

## Tips

- **Let identity grow** - don't pre-write it. Let Soma discover who it becomes through your work.
- **Trust the breath** - don't worry about context limits. `/breathe` rotates seamlessly. `/exhale` when you're done.
- **Daily workflow** — `/exhale` at end of session, review the preload, `soma inhale` next morning.
- **Explore commands** - run `soma --help` for all CLI commands, `soma --help scripts` for installed tools, `soma --help commands` for the full reference.
- **Switch models freely** - use `/model` or `Ctrl+P` mid-session. See [Models & Providers](/docs/models).
- **Tune settings** - everything is configurable: boot steps, heat thresholds, context warnings. See [Configuration](/docs/configuration).
- **Extend Soma** — write skills, extensions, or custom model providers. See [Extending](/docs/extending).
- **Something broken?** — check [Troubleshooting](/docs/troubleshooting) for common issues and fixes.
