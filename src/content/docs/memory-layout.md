---
title: "Memory Layout"
description: "Project vs user level storage, git strategy, data flow."
section: "Core Concepts"
order: 4
---

# Memory Layout

<!-- tldr -->
Core structure: `.soma/` has five parts — `amps/` (Automations, Muscles, Protocols, Scripts), `memory/` (sessions, preloads), `body/` (structured identity — soul, voice, templates), `skills/` (installable capabilities), and root files (settings.json, state.json). AMPS is the content system — what Soma learns and how it behaves. Memory is temporal state. Body files become template variables (`soul.md` → `{{soul}}`). User-level `~/.soma/agent/` holds global settings and runtime.
<!-- /tldr -->

Soma uses two levels of storage: **project-level** (`.soma/` in your repo) and **user-level** (`~/.soma/agent/`).

## Project-Level: `.soma/`

Lives in your project root.

```
.soma/
├── body/soul.md             ← who Soma is (identity, values, posture)
├── body/                    ← structured identity (soul, voice, templates)
├── settings.json            ← configurable thresholds (optional)
├── state.json               ← heat state for AMPS content (auto-managed)
│
├── amps/                    ← the AMPS content system
│   ├── automations/         ← triggered actions (heat-tracked)
│   │   └── maps/            ← MAPs — workflow templates (usage-tracked)
│   ├── muscles/             ← learned patterns (heat-tracked)
│   ├── protocols/           ← behavioral rules (heat-tracked)
│   └── scripts/             ← developer tools (usage-tracked via state.json)
│
├── memory/                  ← temporal state
│   ├── preloads/            ← session continuations
│   └── sessions/            ← per-session work logs
│
├── inbox/                   ← inter-agent messages (see Inbox docs)
├── knowledge/               ← scraped docs (from soma scrape)
├── docs/                    ← ideas, plans, knowledge
│
├── .boot-target             ← focus/MAP targeting signal (consumed on boot)
└── skills/                  ← knowledge sets (Pi-native SKILL.md format)
```

Extensions (`.soma/extensions/`) are optional — advanced TypeScript runtime hooks that grow with the user.

### AMPS — The Content System

**A**utomations, **M**uscles, **P**rotocols, **S**cripts — four layers that give Soma learned behavior. All live under `amps/`, all are heat-tracked (except scripts), all discovered at boot. See [How It Works](/docs/how-it-works) for the boot sequence.

Discovery is recursive — you can organize content into subdirectories:

```
amps/muscles/
├── my-muscle.md           ← discovered
├── ui/
│   └── glass-theme.md     ← discovered (subdirectory)
└── _archive/
    └── old-muscle.md      ← NOT discovered (underscore prefix)
```

Directories starting with `_` or `.` are skipped. Max depth: 2 levels.

| Layer | What | Format | Heat-tracked |
|-------|------|--------|-------------|
| Automations | Triggered actions — "do this sequence" | Markdown | ✅ |
| Muscles | Learned patterns — "how I've done this before" | Markdown | ✅ |
| Protocols | Behavioral rules — "how to be" | Markdown | ✅ |
| Scripts | Developer tools — reusable bash commands | Shell | Listed at boot |

### Marker Files

Soma identifies a valid `.soma/` directory by looking for at least one of:
- `body/soul.md` (or legacy `SOMA.md`)
- `amps/` directory
- `memory/` directory
- `settings.json`

### Git Strategy

| Path | Git Status | Reason |
|------|-----------|--------|
| `skills/` | Tracked | Project-specific skills, shareable |
| `amps/protocols/` | Tracked | Behavioral rules, shareable across team |
| `amps/scripts/` | Tracked | Developer tools, shareable |
| `body/` | **Gitignored** | Personal — Soma's identity is unique to each user |
| `amps/muscles/` | **Gitignored** | Personal learned patterns |
| `amps/automations/` | **Gitignored** | Personal triggers |
| `memory/` | **Gitignored** | Session-specific, personal |
| `state.json` | **Gitignored** | Personal heat state |

**Auto-checkpoint:** `.soma/` commits itself — `settings.checkpoints.soma.autoCommit` (on by default) checkpoints tracked content in the background. **You don't `git add` / `git commit` inside `.soma/` manually**; Soma handles it. Your *project* repos (the code you ship) still need normal commits. Put new content where it fits the project's existing structure (`amps/`, `skills/`, `memory/`, and whatever organizing folders the project has grown — `plans/`, `cycles/`, `releases/`, `docs/` …); add a new top-level folder only when a genuinely new *kind* of thing has no home — staying in step with the project's conventions rather than imposing a fresh layout.

## User-Level: `~/.soma/agent/`

Global settings and runtime. Shared across all projects.

```
~/.soma/agent/
├── settings.json            ← compaction, startup, changelog prefs
├── core/                    ← symlink → agent/core/ (runtime modules)
├── extensions/              ← globally installed extensions
│   ├── soma-boot.ts         ← identity + preload + protocols + muscles
│   ├── soma-header.ts       ← branded σῶμα header
│   └── soma-statusline.ts   ← footer with context/cost/git
├── skills/                  ← globally installed skills
└── sessions/                ← Pi session JSONL files
```

## How Memory Flows

```
Fresh session (soma):
  ~/.soma/agent/extensions/ load
  → walk up CWD for .soma/ (project → parent → global chain)
  → run boot steps (configurable in settings.json):
    1. identity — load body/soul.md (layered, falls back to SOMA.md)
    2. preload — skip (fresh session)
    3. protocols — load by heat (hot=full, warm=breadcrumb, cold=name)
    4. muscles — load by heat within token budget
    5. automations — load by heat
    6. scripts — list available .soma/amps/scripts/
    7. git-context — inject recent commits + changed files
  → inject all into system prompt

Continue session (soma -c):
  → same as above, plus:
  → step 2 loads most recent preload from .soma/memory/preloads/

Breathe (/breathe or auto at configurable threshold):
  → agent writes preload to .soma/memory/preloads/preload-next-<date>-<id>.md
  → save protocol + muscle heat state (with decay for unused)
  → agent commits work
  → rotates into fresh session

Exhale (/exhale):
  → same save as breathe, but session ends
```

## Session Logs

Session log files are named `YYYY-MM-DD-sNN-HASH.md` — the date, a sequential session number (`s01`, `s02`), and a 6-character hex hash for uniqueness. Example: `2026-03-28-s01-a3f2c1.md`. Each session gets its own file. The hash prevents collisions when multiple terminals run simultaneously.

## Session-Scoped Preloads

Preload files are named `preload-next-YYYY-MM-DD-sNN-HASH.md` — the date plus the full session ID. Example: `preload-next-2026-03-28-s01-a3f2c1.md`. Each exhale writes a unique file. On resume, Soma picks the most recent preload by modification time.

This means you can have multiple preloads from different sessions. The unique filename prevents overwrites. Soma searches: `memory/preloads/` (configured) → `.soma/` root (legacy) → `memory/` (legacy).

## Inheritance Model

Soma uses a three-level inheritance chain. On boot, it walks up the filesystem from the current directory, collecting `.soma/` directories:

```
/home/user/work/monorepo/app/.soma/     ← project (primary)
/home/user/work/monorepo/.soma/          ← parent (inherited)
/home/user/.soma/                        ← global (baseline)
```

### How Inheritance Works

Each level can contribute identity, AMPS content, and settings. The `inherit` flag in `settings.json` controls what flows through:

```json
{
  "inherit": {
    "identity": true,
    "protocols": true,
    "muscles": true,
    "tools": true,
    "automations": true
  }
}
```

When `inherit` is enabled (the default), content merges across levels:

| Content | Merge behavior |
|---------|---------------|
| **Identity** (`soul.md`, `voice.md`) | Layered — project content appears first, parent and global append with headers. Project identity dominates. |
| **Protocols** | Union — all discovered protocols from all levels, deduplicated by filename. Project overrides parent overrides global. |
| **Muscles** | Union — same as protocols. Project-level muscles take priority on name collision. |
| **Scripts** | Discovery chain — `soma <name>` checks bundled → project → global. First match wins. |
| **Settings** | Project settings override parent, which override global. Individual fields merge (not whole-file replacement). |

### Identity Layering

When multiple levels define identity files, they're composed into the system prompt:

```
# Soul (project: app)
I am a React frontend specialist...

# Soul (parent: monorepo)
This is a TypeScript monorepo using pnpm workspaces...

# Soul (global)
I am Soma, an AI agent that learns who you are...
```

The project identity comes first and carries the most weight. Parent and global provide context without overriding the project's personality.

### AMPS Content Flow

Protocols, muscles, automations, and scripts flow through the chain:

```
Global (~/.soma/amps/)          → baseline behaviors
  └─ Parent (.soma/amps/)        → workspace-wide patterns
      └─ Project (.soma/amps/)   → project-specific patterns (highest priority)
```

Heat state (`state.json`) is always project-local — it doesn't inherit. A muscle can be hot in one project and cold in another.

### Disabling Inheritance

Set `inherit: false` (or individual flags) in your project's `settings.json` to isolate it:

```json
{
  "inherit": {
    "identity": false,
    "protocols": true,
    "muscles": false
  }
}
```

This project would use shared protocols but have its own identity and muscles, ignoring parent/global.

See [Configuration](/docs/configuration#inheritance) for all inherit options.

## Multiple Projects

Each project gets its own `.soma/`. When you `cd` between projects and run `soma`, it loads the identity and memory for *that* project. Different projects, different Somas.

```
~/project-a/.soma/body/soul.md  ← "I'm a frontend specialist"
~/project-b/.soma/body/soul.md  ← "I'm a systems engineer"
```

Same `soma` CLI, different memories.
