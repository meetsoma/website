---
title: "How It Works"
description: "Breath cycle, identity, muscles, protocols, context management."
section: "Core Concepts"
order: 2
---


<!-- tldr -->
Sessions are breaths: inhale (configurable boot steps: identity, preload, protocols, muscles, scripts, git-context) → work → breathe or exhale (save state, decay heat, write preload). Git context loads recent commits/diffs automatically. Heat system loads hot content fully, warm as breadcrumbs, cold stays dormant. Context warnings and preload staleness are configurable. All thresholds in `settings.json`.
<!-- /tldr -->

## The Core Idea

Soma is an AI coding agent that **remembers**. Unlike tools that start fresh every session, Soma carries identity, context, and learned patterns across sessions.

σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.

## The Breath Cycle

Sessions are breaths. Each session **inhales** what was learned before, and **exhales** what it learned this time.

```
Session 1 (inhale) → work → exhale (preload + session log)
                                    ↓
Session 2 (inhale) ← picks up preload → work → exhale
                                                      ↓
Session 3 (inhale) ← ...and so on
```

### Inhale (Session Start)

When Soma boots, it runs a configurable sequence of **boot steps**:

| Step | What Loads | Default |
|------|-----------|---------|
| `identity` | Layered identity (project → parent → global) | ✅ On |
| `preload` | Last session’s state (auto-injected by default) | ✅ On |
| `protocols` | Behavioral rules, sorted by heat tier | ✅ On |
| `muscles` | Learned patterns, within token budget | ✅ On |
| `automations` | MAPs and workflow templates, heat-tracked | ✅ On |
| `scripts` | Available `.soma/amps/scripts/` with descriptions | ✅ On |
| `git-context` | Recent commits and changed files from git | ✅ On |

The boot sequence is configurable in `settings.json` — remove steps you don't want, reorder to change priority. See [Configuration](/docs/configuration#boot-sequence).

Fresh sessions (`soma`) load everything including the most recent preload (auto-injected by default). Resumed sessions (`soma -c`) restore full conversation history instead.

#### Git Context

On every boot, Soma checks recent git history and injects a summary of what changed. This gives the agent immediate awareness of the project state without relying on the preload alone.

By default, it shows the last 24 hours of commits and a file-change summary (`--stat`). Configurable:

```json
{
  "boot": {
    "gitContext": {
      "since": "last-session",
      "diffMode": "full",
      "maxCommits": 20
    }
  }
}
```

Set `"enabled": false` to disable. See [Configuration](/docs/configuration#git-context).

### Exhale

When context fills up, Soma automatically breathes — saving state and continuing into a fresh session. You can also trigger this manually:

- **`/breathe`** — save state + rotate (seamless rotation)
- **`/exhale`** — save state + stop
- **`/rest`** — disable keepalive + exhale (for when you're done for the night)

Either way, Soma:
1. Writes a session-scoped **preload** (`preload-next-<date>-<id>.md` in `memory/preloads/`)
2. Saves protocol and muscle heat state
3. Commits all work

## Identity

Soma doesn't come pre-configured. It **discovers** who it is through working with you.

On first run, Soma creates `.soma/SOMA.md` — a starting point. Over sessions, the agent refines its identity based on your workspace and interactions.

When identity outgrows a single file, the **body architecture** kicks in — structured files in `.soma/body/` where `soul.md` holds who the agent is, `voice.md` holds how it communicates, `body.md` holds the project context, and templates (`_mind.md`, `_memory.md`) control how the system prompt and preloads are assembled.

See [Identity](/docs/identity) for the full guide on SOMA.md, body/, templates, and variables.

## Muscles

Patterns observed across sessions become **muscles** — reusable knowledge files that load automatically when relevant.

Examples:
- A muscle for your project's deployment process
- A muscle for your preferred code style
- A muscle for how to handle a specific API

Muscles live in `.soma/amps/muscles/` and grow organically. Like protocols, they're loaded by **heat** — frequently-used muscles get full content in the prompt, less-used ones get a TL;DR summary, and cold ones stay available but unloaded. See [Muscles](/docs/muscles) for the full guide on writing muscles and the TL;DR system.

## Protocols

Protocols are behavioral rules that guide Soma's actions: how to format files, how to attribute git commits, when to exhale. They live in `.soma/amps/protocols/` as markdown files with frontmatter.

### Heat System

Every protocol has a temperature:
- 🔥 **Hot** (8+) — full body loaded into system prompt
- 🟡 **Warm** (3–7) — breadcrumb reminder only (one sentence)
- ❄️ **Cold** (0–2) — name listed, content not loaded

Heat rises when protocols get used (+1 per action, +2 per explicit reference) and decays by 1 each session if unused. You can also `/pin` a protocol to keep it hot or `/kill` it to drop to cold. All thresholds are configurable in [Configuration](/docs/configuration#protocols-heat-thresholds).

See [Heat System](/docs/heat-system) for the complete guide.

##***REMOVED*** Scoping

Protocols declare which projects they apply to via an `applies-to` field. For example, `git-identity` only loads in projects with a `.git/` directory. Meta-protocols like `breath-cycle` use `applies-to: [always]`.

Available signals: `always`, `git`, `typescript`, `javascript`, `python`, `rust`, `go`, `frontend`, `docs`, `multi-repo`.

See [Protocols](/docs/protocols) for how to write your own.

## Cache Keepalive

Soma automatically keeps the model's prompt cache warm between turns. When you're reading docs, thinking, or reviewing code, the cache stays hot — so the next response is fast and cheap.

The keepalive sends a lightweight ping every ~4.5 minutes (configurable via the 300-second cache TTL). The statusline shows `◷` when keepalive is active.

**Commands:**
- **`/keepalive on`** — enable keepalive (default: on)
- **`/keepalive off`** — disable keepalive
- **`/keepalive status`** — show cache state and ping count
- **`/rest`** — disables keepalive + exhales in one motion (for end of session)

## Context Management

Soma monitors context usage and provides escalating warnings. All thresholds are configurable in [Configuration](/docs/configuration#context-warnings):

| Threshold | Default | Action |
|-----------|---------|--------|
| `notifyAt` | 50% | Info notification |
| `urgentAt` | 80% | "Wrap up" warning injected into prompt |
| `autoExhaleAt` | 85% | **Auto-flush** — writes preload, commits, continues |

For longer sessions, push thresholds up. For aggressive context management, pull them down.

### Auto-Breathe

For proactive sessions, enable **auto-breathe** (`/auto-breathe on` or `settings.json`). Instead of waiting for the 85% emergency:

1. **Wrap-up** at `triggerAt` (default 50%) — finish current task, update session log
2. **Rotate** at `rotateAt` (default 70%) — write preload, countdown starts
3. **Grace period** — countdown of `graceTurns` turns (default 2). If you send a message, the countdown **pauses** and the agent addresses your concern. Then the countdown restarts. You're never cut off mid-thought.
4. **Rotation** — when the countdown reaches 0, session rotates seamlessly

Rotation uses the **capability router** (`soma-route.ts`) when a slash command has run in the session — this calls `newSession()` directly for a seamless transition. If no command has run, the CLI handles rotation via process restart (transparent to the user).

The 85% safety net always stays active as a backstop. Context thresholds are percentages of the model's context window — they scale automatically from 200K to 1M+ context models. See [Configuration](/docs/configuration#auto-breathe) for thresholds.

## MAPs — Workflow Templates

MAPs (My Automation Protocol Scripts) are the navigation layer. A MAP describes a repeatable process — which muscles to read, which scripts to run, which protocols to follow.

```bash
soma --map release-cycle    # boot with a specific MAP loaded
```

MAPs live in `.soma/amps/automations/maps/`. They can declare a `prompt-config` section that overrides heat scores, force-includes content, and adds supplementary identity for that session. Usage is tracked automatically (`runs:` and `last-run:` update on each load).

See [MAPs](/docs/maps) for the full guide.

## Hub — Community Content

The Soma Hub is a community repository of protocols, muscles, scripts, and templates. Content is hosted on GitHub (`meetsoma/community`) and accessible through the `/hub` command.

### Architecture

```
meetsoma/community (GitHub)
├── protocols/          ← community protocols
├── muscles/            ← community muscles
├── scripts/            ← community scripts (folder per script)
├── templates/          ← starter bundles
└── hub-index.json      ← auto-generated index (CI rebuilds on merge)

Your .soma/
├── amps/protocols/     ← installed protocols land here
├── amps/muscles/       ← installed muscles land here
└── amps/scripts/       ← installed scripts land here (chmod +x)
```

### Commands

| Command | What it does |
|---------|-------------|
| `/hub install <type> <name>` | Install content from the hub (`-g` global, `-p` project) |
| `/hub find <keywords>` | Search by name, description, tags |
| `/hub list --remote` | Browse all available content |
| `/hub fork <type> <name>` | Install + add `forked-from` lineage for customization |
| `/hub share <type> <name>` | Share your content — privacy scan, README generation, PR via `gh` |

Install defaults to global (`~/.soma/`) so content is available across projects. Use `-p` for project-specific content. Templates resolve their dependencies automatically — installing a template pulls all its referenced protocols and muscles.

### Dynamic Detail Pages

The hub website (`soma.gravicity.ai/hub`) renders detail pages dynamically — new community content appears immediately without a website rebuild. The index page fetches `hub-index.json` on mount; detail pages fetch README content from GitHub raw at runtime.

### Drop-in Commands

Scripts in `.soma/amps/scripts/commands/` become `/soma <name>` commands — no restart needed. This is the lightest-weight extensibility: one file, one function, immediately usable.

```bash
.soma/amps/scripts/commands/find.sh   → /soma find <keywords>
.soma/amps/scripts/commands/heat.sh   → /soma heat
```

See [Commands](/docs/commands#drop-in-commands) for the full guide.

## Focus — Seam-Traced Boot

Focus priming lets you prepare the agent for a topic **before** the session starts:

```bash
soma focus runtime    # trace "runtime" through memory, boost relevant content
soma                     # boot primed for runtime work
```

The focus system scores muscles by matching the keyword against their tags, keywords, triggers, and digest content. High-scoring items get force-included. Related MAPs and the latest relevant preload are also loaded.

See [Focus](/docs/focus) for the full guide.

## Parent-Child Workspaces

Soma supports **parent-child inheritance** for monorepos and multi-project workspaces. A child `.soma/` inherits from its parent chain automatically.

```
~/work/.soma/                    ← parent (workspace-wide)
├── SOMA.md                      ← "We use pnpm, conventional commits"
├── settings.json
└── amps/
    └── protocols/
        └── git-identity.md      ← shared git rules

~/work/my-app/.soma/             ← child (project-specific)
├── SOMA.md                      ← "I'm a React frontend"
└── amps/
    └── protocols/
        └── testing.md           ← project-specific testing rules
```

On boot, Soma walks up the filesystem to find parent `.soma/` directories and layers their content:

- **Identity** — child is primary, parent adds context below
- **Protocols** — parent protocols discovered alongside child's (heat still applies)
- **Muscles** — parent muscles available within token budget
- **Tools/Scripts** — parent scripts surfaced to child

All inheritance is controlled by the `inherit` setting — each dimension defaults to `true`. Set to `false` for standalone projects that shouldn't inherit. See [Configuration](/docs/configuration#inheritance).

**Solo body mode:** When only a parent `.soma/` exists (no child), Soma uses it directly. No need to create a child `.soma/` for every sub-project if the parent covers everything.

## CLAUDE.md Awareness

If a `CLAUDE.md` file exists in the project root, Soma notes its presence in the system prompt. The file is not transplanted into the system prompt — the host agent (Pi/Claude Code) handles CLAUDE.md natively. Soma simply acknowledges it exists so there's no conflict between the two systems.

## The Compiled System Prompt

Soma assembles a system prompt from multiple sources. If `body/_mind.md` exists, it's used as a **template** — you control the structure:

```markdown
{{core_rules}}
# Identity
{{soul}}
{{voice}}
{{protocol_summaries}}
{{muscle_digests}}
{{tools_section}}
{{skills_block}}
```

Without a template, Soma uses a built-in order:

1. **Static core** — base behavioral rules (`prompts/system-core.md`)
2. **Identity** — layered identity (project → parent → global)
3. **Behavioral** — protocols (hot = full, warm = one-liner), muscles (hot/warm within budget)
4. **Documentation** — Soma docs, Pi docs (toggleable)
5. **Guard awareness** — file protection rules (if enabled)
6. **Skills** — warm AMPS + Pi skills as `<available_skills>` XML

The **skill loader** classifies all AMPS content by heat:
- 🔥 Hot → full body in system prompt
- 🟡 Warm → `<available_skills>` XML (agent reads on demand)
- ❄️ Cold → hidden

Use `/body render` to see the full compiled prompt. Use `/body map` to see the template structure. See [Configuration](/docs/configuration#system-prompt).
