---
title: "AMPS"
description: "The four layers that make Soma grow — Automations, Muscles, Protocols, Scripts. How they connect, how they evolve, and why they replace flat config files."
section: "Core Concepts"
order: 2.8
---

AMPS is Soma's memory architecture. Four layers of content that tell the agent how to behave, what patterns to follow, which tools to use, and in what order.

Unlike a single `CLAUDE.md` or `.cursorrules` file, AMPS content is **layered, ranked by relevance, and grows through use.** The agent doesn't load everything every time. It loads what matters right now.

## The Four Layers

### Protocols

Behavioral rules. "Test before commit." "Read before write." "Use scripts before raw grep." Each protocol is a markdown file with a [heat score](/docs/heat-system) — used protocols stay hot and load in full, unused ones fade and eventually stop loading.

[Read more about protocols →](/docs/protocols)

### Muscles

Learned patterns. Born from corrections and repeated observations. "Use `soma-code.sh map` before editing a file." "This API uses OAuth, not API keys." Muscles have triggers that determine when they're relevant — if you're working on CSS, CSS muscles activate. If you're debugging, debugging muscles activate.

[Read more about muscles →](/docs/muscles)

### Scripts

Tools the agent builds for itself. Bash scripts, mostly. What gets done twice manually becomes a script. The script survives across sessions, appears in the boot table, and becomes part of the agent's toolkit. Thirteen scripts ship with Soma. Users can build their own.

[Read more about scripts →](/docs/scripts)

### Automations (MAPs)

Workflow templates. A MAP tells the agent which muscles to load, which scripts to run, and in what order. "When debugging: reproduce, isolate, trace, fix, verify." MAPs are reusable across projects and sessions.

[Read more about MAPs →](/docs/maps)

## How They Connect

A correction from a user might start as a note in a session log. If it happens twice, it becomes a muscle. If the muscle proves universal, it might become a protocol. If the protocol involves multiple steps, those steps become a MAP. If the MAP runs a recurring command, that command becomes a script.

```
Observation → Muscle → Protocol → MAP → Script
             (learned)  (rule)   (workflow) (tool)
```

Each layer references the others. A MAP lists which muscles to load. A muscle lists which scripts to use. A protocol sets the behavioral frame that muscles and MAPs operate within. The system is interconnected — not a flat list.

## How They Grow

**Day 1:** You run `soma init`. You get 18 protocols and an empty `.soma/` directory. No muscles. No scripts. No MAPs.

**Week 1:** The agent notices patterns. You correct it a few times. Those corrections become muscles. You ask it to do the same workflow twice. It builds a script.

**Month 1:** You have protocols shaped by how you work, muscles for your specific codebase, scripts that save you hours, and MAPs for your recurring workflows. The agent loads different content depending on what you're doing today.

The compiled runtime doesn't change. The `.soma/` directory grows around it.

## vs CLAUDE.md

| | CLAUDE.md | AMPS |
|---|---|---|
| Files | 1 | 125+ |
| Loads | Everything, every turn | Relevant items by heat + focus |
| Written by | Human | Human + agent |
| Grows | Only when human edits | Every session, through use |
| Structure | Flat text | Typed layers with frontmatter |
| Inheritance | None | Project → parent → global |

## Where They Live

```
.soma/
├── amps/
│   ├── protocols/     ← behavioral rules
│   ├── muscles/       ← learned patterns
│   ├── scripts/       ← tools
│   └── automations/   ← MAPs and workflows
├── identity.md        ← who the agent is
├── memory/            ← sessions, preloads, ideas
└── settings.json      ← configuration
```

## Organising Your AMPS

As your `.soma/` grows, you'll want structure. Every AMPS layer supports the same conventions:

### Subdirectories

Put related content into subdirectories. The agent discovers them automatically (up to 2 levels deep).

```
.soma/amps/muscles/
├── css-theme-engine.md     ← general muscle
├── vanilla-js-craft.md     ← general muscle
├── ui/                     ← project-scoped subdirectory
│   ├── physics-ui.md
│   └── window-manager.md
└── server/
    └── rust-dev.md
```

This keeps your root clean while grouping related content. The agent sees all of them in its boot table.

### Special Prefixes

Two prefixes have special meaning:

| Prefix | Effect | Use for |
|--------|--------|---------|
| `_` | **Invisible to the agent.** Not loaded at boot, not listed in the boot table. | Staging, archives, reference copies |
| `.` | **Hidden.** Same as underscore. | System files |

Anything else (including `internal/`, `ui/`, `custom/`) is **visible** — the agent discovers and loads content from these subdirectories normally.

### Recommended Layout

As your AMPS content grows, consider this organisation:

```
.soma/amps/protocols/
├── *.md                ← your active protocols (agent loads these)
├── internal/           ← workspace-specific (agent loads, but don't share)
└── _archive/           ← retired protocols (invisible to agent)

.soma/amps/muscles/
├── *.md                ← your active muscles
├── ui/                 ← domain-scoped (still loaded)
├── internal/           ← workspace-specific
└── _archive/           ← retired muscles

.soma/amps/scripts/
├── *.sh                ← your active scripts
├── internal/           ← workspace-specific dev tools
└── _archive/           ← retired scripts
```

**Key insight:** `internal/` is just a naming convention — the agent still loads content from it. Use it for things you don't want to accidentally share or publish. The `_archive/` prefix actually hides content from the agent, which is what you want for retired items.

### What Happens at Scale

After a few weeks of use, a typical `.soma/amps/` directory might have 20-50 items. After months, 100+. The organisation conventions keep it manageable:

- **Root level:** Your most-used, general-purpose content. The agent loads these by [heat](/docs/heat-system) — hot items in full, warm items as summaries, cold items just listed.
- **Subdirectories:** Project-specific or domain-specific content. Keeps the root clean while the agent still discovers everything.
- **`_archive/`:** Content you've outgrown. The muscle about a framework you stopped using. The protocol from your old deploy flow. Still there if you need it, invisible to the agent.

The heat system handles relevance (what loads). The directory structure handles organisation (what lives where). Together they keep a growing `.soma/` usable without manual curation.
