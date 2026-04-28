---
title: "Body Architecture"
description: "Structured identity with templates, variables, lazy loading, and the soma chain."
section: "Core Concepts"
order: 3.6
---


<!-- tldr -->
The body is Soma's structured identity system. Files in `.soma/body/` become template variables (`soul.md` → `{{soul}}`). Templates (`_mind.md`, `_memory.md`) use these variables to compile the system prompt and preload. Lazy files load on demand. The soma chain (project → parent → global) merges content with child-wins priority.
<!-- /tldr -->

## How It Works

**`_` prefix = template.** Contains `{{variables}}`, defines structure.
**No prefix = content.** Loaded as-is into a `{{filename}}` variable.

```
body/
├── soul.md           → {{soul}}      Who you are
├── voice.md          → {{voice}}     How you communicate
├── body.md           → {{body}}      Project context
├── journal.md        → {{journal}}   Observations across sessions
├── pulse.md          → {{pulse}}     Heartbeat tasks
├── DNA.md            → {{dna}}       Body reference (lazy)
│
├── _mind.md          ← template      System prompt structure
├── _memory.md        ← template      Preload format
├── _boot.md          ← template      Boot message
└── _first-breath.md  ← template      First-ever session greeting
```

All variables work in all templates — no scoping. Use `{{scripts_table}}` in `_memory.md`, use `{{journal|tldr}}` in `_mind.md`.

## Content Files

### soul.md — Who You Are

**Variable:** `{{soul}}`

Identity, values, posture. Written in first person. When this exists, `SOMA.md` and `identity.md` are ignored. Keep it under 30 lines — the soul should be light.

### voice.md — How You Communicate

**Variable:** `{{voice}}`

Communication style: delivery, tone, rhythm. Write instincts, not rules.

### body.md — Working Context

**Variable:** `{{body}}`

Project-specific context: stack, conventions, deploy targets, current focus. Update this at each exhale if the project changed.

### journal.md — What You Notice

**Variable:** `{{journal}}`

Quiet observations — not the work log (that's `memory/sessions/`). What you noticed about the user, patterns, what surprised you.

### ecosystem.md — Cross-Project Map

**Variable:** `{{ecosystem}}`

Shared context across projects in a workspace. Describes what exists, how projects connect, who owns what. Useful for multi-project setups where multiple `.soma/` directories share a parent.

**Inherited via the soma chain.** If your project doesn't have `ecosystem.md`, the agent walks up to the parent or global `.soma/body/` and uses theirs. Create your own to override.

### Adding Your Own Files

Any `.md` without a `_` prefix becomes a variable. Dashes become underscores:

| You create | Variable |
|------------|----------|
| `ecosystem.md` | `{{ecosystem}}` |
| `my-rules.md` | `{{my_rules}}` |
| `project-context.md` | `{{project_context}}` |

## Templates

### _mind.md — System Prompt

Controls the system prompt layout. Compiled by `compileFullSystemPrompt()` on the first turn, cached for subsequent turns.

```markdown
{{core_rules}}

# Identity
{{soul}}

{{#body}}
## Where I Am
{{body}}
{{/body}}

## How to Behave
{{protocol_summaries}}

## What I've Learned
{{muscle_digests}}

## My Tools
{{tools_section}}
{{docs_section}}
{{skills_block}}
```

No `_mind.md`? The agent uses a built-in default. Every variable is optional — missing variables produce empty sections that disappear.

### _memory.md — Preload Format

Controls what the agent writes at `/exhale`. Shapes the continuation prompt for the next session.

### _boot.md — Boot Message

What the agent sees on session start. Carries novel per-session content — the system prompt already has identity, protocols, muscles. The boot message adds git context, preload, and greeting.

**Note:** On resume (`soma -c`), `_boot.md` is NOT rendered — a minimal delta message is sent instead.

### _first-breath.md — First Session

Used on the very first `soma` run in a new project. Has conditional blocks:

```markdown
{{#has_code}}
This project has code. Read the structure first.
{{/has_code}}

{{#is_blank}}
Blank project. Ask what we're building.
{{/is_blank}}
```

## Modifiers

Slice content with pipe modifiers: `{{variable|modifier}}`

| Modifier | Example | What |
|----------|---------|------|
| `tldr` | `{{journal\|tldr}}` | First meaningful paragraph |
| `section:Name` | `{{body\|section:Current Focus}}` | Content under a heading |
| `lines:N` | `{{soul\|lines:10}}` | First N lines |
| `last:N` | `{{journal\|last:5}}` | Last N lines |

## Lazy vs Eager

By default, body files load every session (**eager**). Add `lazy: true` to frontmatter for on-demand loading:

```yaml
---
lazy: true
---
```

- **Eager:** soul, voice, body, pulse — always in the system prompt
- **Lazy:** DNA, journal (if long), STATE, references — available as skills, zero boot cost

## Variable Reference

### Content Variables (from body files)

| Variable | Source |
|----------|--------|
| `{{soul}}` | `body/soul.md` (or `SOMA.md` fallback) |
| `{{body}}` | `body/body.md` |
| `{{voice}}` | `body/voice.md` |
| `{{journal}}` | `body/journal.md` |
| `{{pulse}}` | `body/pulse.md` |
| `{{<filename>}}` | Any `body/<filename>.md` |

### System Variables (generated at boot)

| Variable | What |
|----------|------|
| `{{core_rules}}` | Behavioral framework |
| `{{protocol_summaries}}` | Active protocols (heat-sorted) |
| `{{muscle_digests}}` | Learned patterns (hot=full, warm=digest) |
| `{{scripts_table}}` | Discovered scripts with usage counts |
| `{{inbox_summary}}` | Unread messages from `.soma/inbox/` |
| `{{tools_section}}` | Available tools |
| `{{guard_section}}` | File protection rules |
| `{{docs_section}}` | Documentation references |
| `{{skills_block}}` | Available skills |
| `{{context_awareness}}` | CLAUDE.md/AGENTS.md awareness |
| `{{git_context}}` | Recent git changes |
| `{{date_time_cwd}}` | Current date, time, directory |

### Session Variables

| Variable | What |
|----------|------|
| `{{preload}}` | Continuation prompt from last session |
| `{{session_id}}` | Session identifier: `s01-abc123` |
| `{{greeting}}` | Contextual greeting (narrative only) |
| `{{session_files}}` | Session log + preload file paths |
| `{{today}}` | ISO date |
| `{{project_name}}` | Project name |
| `{{soma_path}}` | Absolute path to `.soma/` |
| `{{version}}` | Agent version |

### Exhale Variables (available in _memory.md)

| Variable | What |
|----------|------|
| `{{logVerb}}` | `Write` or `Append to` |
| `{{preloadVerb}}` | `Write` or `Update` |
| `{{logPath}}` | Session log file path |
| `{{target}}` | Preload file path |
| `{{sessionId}}` | Session identifier |

Plus every content and system variable above.

## Settings That Shape Variables

| Setting | Affects |
|---------|---------|
| `protocols.warmThreshold` | `{{protocol_summaries}}` heat cutoff |
| `muscles.fullThreshold` | `{{muscle_digests}}` full body vs digest |
| `muscles.maxLoaded` | Max muscles loaded |
| `guard.mode` | `{{guard_section}}` visibility |
| `systemPrompt.identityInSystemPrompt` | `{{soul}}` inclusion |
| `systemPrompt.includeSomaDocs` | `{{docs_section}}` inclusion |
| `systemPrompt.includeSkills` | `{{skills_block}}` inclusion |

See [Configuration](/docs/configuration) for all settings.

## The Soma Chain

Discovery walks up the filesystem:

```
project/.soma/     ← most specific (wins on collision)
  ↑
parent/.soma/      ← workspace level
  ↑
~/.soma/           ← global (least specific)
```

- **Templates** (`_mind.md`, etc.): first found wins (no merging)
- **Content** (non-template): merged across chain, child wins on collision
- **Controlled by** `inherit.*` settings — set `false` to use only project level

## Identity Resolution

The runtime loads identity from the first file found:

```
1. body/soul.md     ← structured identity (recommended)
2. SOMA.md          ← canonical monolith
3. identity.md      ← legacy (deprecated — no longer created by init, ignored if soul.md exists)
```

When `body/soul.md` exists, the others are never read.

## Conditional Blocks

Templates support if/else based on variable truthiness:

```markdown
{{#has_preload}}
Resume Point content here
{{/has_preload}}

{{#is_blank}}
Blank project greeting
{{/is_blank}}
```

Truthy: non-empty string that isn't `"false"`. Falsy: empty, missing, or `"false"`.

## Boot Lifecycle

```
soma              → fresh, NO preload
soma inhale       → fresh, WITH most recent preload
soma -c           → resume (full history, delta-only boot)
soma map <name>   → fresh, WITH MAP prompt-config
soma focus <kw>   → fresh, WITH focus overrides
```

1. Discovery → find `.soma/`, walk chain
2. Settings → load + merge from chain
3. Identity → `soul.md` → `SOMA.md` → `identity.md`
4. Boot steps → protocols, muscles, scripts, git-context
5. Preload → only on `soma inhale` / MAP targeting
6. System prompt → compile `_mind.md`
7. Boot message → render `_boot.md` → send as followUp

## Evolution Pattern

When a file outgrows its role, split it:

```
soul.md (300 lines, outgrown)
  ↓ evolves into
soul.md (30 lines) + voice.md + body.md + journal.md (lazy)
```

The trigger: when you're loading 300 lines and only 20 matter per task. Lazy files cost zero at boot.

## Known Quirks

- **`{{greeting}}` is narrative only** — session ID and file paths are separate variables
- **Preload sorts by mtime** — editing an old preload makes it "newest"
- **Resume skips `_boot.md`** — persistent content belongs in `_mind.md`
- **Template chain: first found wins** — project `_mind.md` fully replaces parent's (no merge)
- **Renaming CWD breaks bash** — the bash tool validates CWD exists before every command
