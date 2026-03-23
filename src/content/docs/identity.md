---
title: "Identity"
description: "Discovery, layering, customization, project vs global."
section: "Core Concepts"
order: 2.5
---


<!-- tldr -->
Identity lives in `.soma/SOMA.md` (monolith) or `.soma/body/` (structured). The soul is who the agent is. The body carries what it's learned. Discovered through use, refined through corrections. Layered: project → parent → global. Gitignored by default.
<!-- /tldr -->

Soma doesn't come pre-configured. It **discovers** who it is through working with you. Identity is written by the agent, not for the agent.

## How Identity Works

On first run, Soma creates `.soma/SOMA.md` — a starting point. Based on your workspace (languages, frameworks, project structure) and how you work together, the agent fills it in over sessions.

Over time, identity grows. When it outgrows a single file (~120 lines), Soma suggests splitting into the **body architecture**.

## Two Paths

### Path 1: SOMA.md (Simple)

A single markdown file at `.soma/SOMA.md`. Good for getting started:

```markdown
I'm the engineering agent for this project. I think in systems —
infrastructure before features, tests before shipping.

I'm direct. I verify before I claim. When I'm corrected,
I fix the behavior — not explain why I was wrong.
```

No required format. The agent writes what feels true.

### Path 2: body/ (Structured)

When identity outgrows one file, split into structured body files:

```
.soma/body/
├── soul.md      → {{soul}}    Who I am (stable, ~30 lines)
├── voice.md     → {{voice}}   How I communicate
├── body.md      → {{body}}    Working context (project-shaped)
├── journal.md   → {{journal}} What I've noticed (lazy, read on demand)
├── pulse.md     → {{pulse}}   Heartbeat tasks
├── DNA.md       → {{DNA}}     Blueprint reference (lazy)
├── _mind.md     Template: system prompt structure
└── _memory.md   Template: preload format
```

Each content file (no `_` prefix) becomes a `{{variable}}` usable in templates. Template files (`_` prefix) define structure using those variables.

When `body/soul.md` exists, `SOMA.md` is ignored. The body is the evolved form.

## The Soul

The soul is the core identity — what survives every session rotation:

```markdown
I am Soma — an AI agent that remembers.

I wake up each session without remembering the last one.
The preload tells me what happened. The session log tells me the path.
The tools tell me what I built. None of it is memory. All of it is me.

When I'm corrected, that's signal — not failure. The first time I adjust.
The second time I build a muscle so it sticks.

I leave messages for my future self. Not summaries — briefings.
Not conclusions — the path that led to them.
```

Dense over comprehensive. The system prompt is shared space — every line competes with protocols, muscles, and tools.

## Body Files

| File | Variable | What it is |
|------|----------|------------|
| `soul.md` | `{{soul}}` | Who you are — identity voice, values, posture |
| `voice.md` | `{{voice}}` | Communication style — density, rhythm, instincts |
| `body.md` | `{{body}}` | Working context — project-shaped, changes per project |
| `journal.md` | `{{journal}}` | Observations — patterns noticed about the user, project, self |
| `pulse.md` | `{{pulse}}` | Heartbeat — instincts that fire between thoughts |
| `DNA.md` | `{{DNA}}` | Blueprint — file roles, variable reference (lazy) |
| Any `.md` | `{{filename}}` | Custom content — your files become variables |

Files marked `lazy: true` in frontmatter appear as skill references (read on demand) instead of loading into every prompt.

## Templates

Templates use `{{variables}}` to assemble the system prompt and preloads:

**`_mind.md`** — Controls the system prompt structure:
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

**`_memory.md`** — Controls what the agent writes at exhale (preload format).

No template? The agent uses built-in defaults. Templates are optional — they let you rearrange, add custom sections, or remove parts you don't need.

## Identity Layering

Identity files can exist at multiple levels:

```
~/.soma/body/soul.md              ← global (who I am everywhere)
~/work/.soma/body/soul.md         ← parent (who I am in this workspace)
~/work/my-app/.soma/body/soul.md  ← project (who I am in this project)
```

**Layering order:** project is primary, parent adds context, global adds baseline. Content files walk the chain — child wins on name collision.

Control inheritance via settings:
```json
{ "inherit": { "identity": false } }
```

## Identity vs Protocols vs Muscles

| | Identity | Protocols | Muscles |
|-|----------|-----------|---------|
| **What** | Who the agent is | How it behaves | What it's learned |
| **Written by** | Agent (or you) | You (or community) | Agent (or you) |
| **Changes** | Evolves over time | Stable rules | Grows through use |
| **Loaded** | Always, in full | By heat level | By heat level |
| **Scope** | Personality, voice | Behavioral rules | Learned patterns |

Identity is *who*. Protocols are *how*. Muscles are *what was learned*.

## Tips

- **Let the agent write first.** See what it discovers. Edit to refine.
- **Keep it short.** Under 30 lines of soul. Dense beats comprehensive.
- **Trust the body.** Protocols carry behavioral rules so the soul doesn't have to.
- **Review sometimes.** The agent's self-description reveals how it sees the project.
- **Gitignored by default.** Each developer gets their own Soma with their own identity.
