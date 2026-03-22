---
title: "Getting Started"
description: "Install Soma, run your first session, understand the basics."
section: "First Steps"
order: 1
---


<!-- tldr -->
`npm i -g meetsoma` → `cd your-project` → `soma`. First run creates `.soma/` and discovers identity. Use `soma -c` to continue with last session's context. `/breathe` saves + continues, `/exhale` saves + stops, `/pin` keeps protocols hot, `/kill` drops them cold.
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

The detected context shapes Soma's initial identity and the protocols it recommends installing. You can always edit `identity.md` afterward.

## Session Modes

### Fresh Session

```bash
soma
```

Starts fresh. Runs the [boot sequence](/docs/configuration#boot-sequence): identity, protocols, muscles, scripts, git context. No replay of previous session context.

### Resume Session

```bash
soma --continue
# or
soma -c
```

Resumes the last session. Runs all boot steps including preload (what happened, what's next).

### Select a Session

```bash
soma --resume
# or
soma -r
```

Pick from previous sessions to resume.

## Commands

| Command | What it does |
|---------|-------------|
| `/breathe` | Save state + rotate into fresh session |
| `/exhale` | Save state, write preload, session ends |
| `/rest` | Disable keepalive + exhale — for when you're done for the night |
| `/inhale` | Start fresh — shows preload status, suggests `soma -c` |
| `/pin <name>` | Pin a protocol/muscle to hot (stays loaded) |
| `/kill <name>` | Kill a protocol/muscle (drops to cold) |
| `/keepalive` | Toggle cache keepalive on/off (or check status) |
| `/status` | Show session stats — context %, cache, keepalive, turns, uptime |
| `/preload` | List available preload files |
| `/hub install <type> <name>` | Install a protocol, muscle, script, or automation from the hub |
| `/hub find <keywords>` | Search the community hub |
| `/hub list --remote` | Browse all available hub content |
| `/soma status` | Show memory status (identity, preload, muscles, protocols) |
| `/soma init` | Create `.soma/` in current directory |
| `/soma prompt` | Preview compiled system prompt with token estimate |
| `/soma <command>` | Run a drop-in command (scripts in `.soma/amps/scripts/commands/`) |

## The `.soma/` Directory

Created by `soma init` or on first run:

```
.soma/
├── identity.md              ← who Soma becomes (discovered through use)
├── settings.json            ← configurable thresholds (optional)
├── state.json               ← heat state (auto-managed)
│
├── amps/                    ← the AMPS content system
│   ├── automations/         ← triggered actions (heat-tracked)
│   ├── muscles/             ← learned patterns (heat-tracked)
│   ├── protocols/           ← behavioral rules (heat-tracked)
│   │   ├── breath-cycle.md  ← ships by default (16 protocols included)
│   │   └── _template.md     ← format reference for new protocols
│   └── scripts/             ← developer tools (9 scripts seeded on init)
│       ├── soma-code.sh     ← codebase navigator
│       ├── soma-seam.sh     ← memory tracing
│       └── ...              ← see /docs/scripts for full list
│
├── memory/                  ← temporal state
│   ├── preloads/            ← session continuations
│   └── sessions/            ← per-session work logs
│
├── projects/                ← per-project specs, plans, notes
│
└── skills/                  ← knowledge sets (Pi-native SKILL.md format)
```

### What's Private vs Public

If you're using Soma in a public repo:

- **Ships with repo:** `.soma/amps/protocols/`, `.soma/amps/scripts/`, `.soma/skills/`
- **Gitignored (private):** `.soma/identity.md`, `.soma/memory/`, `.soma/amps/muscles/`, `.soma/amps/automations/`

Templates ship. Instances don't.

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
- **Trust the breath** — don't worry about context limits. Soma flushes and continues automatically.
- **Read muscles** — check `.soma/amps/muscles/` to see what patterns Soma has learned.
- **Switch models freely** — use `/model` or `Ctrl+P` mid-session. See [Models & Providers](/docs/models).
- **Tune settings** — everything is configurable: boot steps, heat thresholds, context warnings. See [Configuration](/docs/configuration).
