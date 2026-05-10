---
title: "System Prompt"
description: "How Soma's compiled system prompt is assembled, configured, and previewed."
section: "Core Concepts"
order: 7
---

# System Prompt

<!-- tldr -->
Soma compiles a system prompt from: static core → identity → protocols/muscles → docs → guard → skills. When `body/_mind.md` exists, it's a **template** — you control the structure with `{{variables}}`. All AMPS are classified by heat: hot = full body, warm = `<available_skills>` XML, cold = hidden. Preview with `/body render` (full output) or `/body map` (structure). Token budget warns at 4000 (configurable).
<!-- /tldr -->

## How It's Built

### Template Path (recommended)

When `.soma/body/_mind.md` exists, it becomes the system prompt template. You control the structure:

```markdown
{{core_rules}}
# Identity
{{soul}}
## Voice
{{voice}}
{{protocol_summaries}}
{{muscle_digests}}
{{tools_section}}
{{guard_section}}
{{docs_section}}
{{skills_block}}
```

Every `{{variable}}` resolves from body content files, boot discovery, or settings. Add custom text between variables. Remove sections you don't need. The template IS the compiler.

See [Identity](/docs/identity) for all available variables and the body file system.

### Built-in Path (no template)

Without `_mind.md`, Soma uses a fixed assembly order:

| Order | Section | Source | Toggleable |
|-------|---------|--------|------------|
| 1 | Static core | Built-in behavioral rules (`prompts/system-core.md`) | No |
| 2 | Identity | `body/soul.md` or `SOMA.md` fallback (layered: project → parent → global) | `identityInSystemPrompt` |
| 3 | Protocols | Hot = full body, warm = one-liner (sorted by heat, capped) | No |
| 4 | Muscles | Hot = full body, warm = digest (within token budget) | No |
| 5 | Soma docs | Documentation references | `includeSomaDocs` |
| 6 | Guard | File protection rules | `includeGuardAwareness` |
| 7 | Skills | Warm AMPS + Pi skills as `<available_skills>` XML | `includeSkills` |

### AMPS Skill Loader

All AMPS content (protocols, muscles, automations, body files) is classified by heat:

- 🔥 **Hot** (8+) — full body in system prompt
- 🟡 **Warm** (3–7) — appears as `<available_skills>` XML (agent reads on demand)
- ❄️ **Cold** (0–2) — hidden from prompt

This means warm muscles and protocols are still accessible — the agent just reads the file when it needs them, rather than having them always in the prompt.

## Configuration

All toggles live under the `systemPrompt` key in `settings.json`:

```json
{
  "systemPrompt": {
    "maxTokens": 4000,
    "includeSomaDocs": true,
    "includePiDocs": true,
    "includeContextAwareness": true,
    "includeSkills": true,
    "includeGuardAwareness": true,
    "identityInSystemPrompt": true
  }
}
```

| Key | Default | What It Controls |
|-----|---------|-----------------|
| `maxTokens` | `10000` | Estimated token budget for Soma's portion of the system prompt |
| `includeSomaDocs` | `true` | Soma documentation references (links to docs, how to learn more) |
| `includePiDocs` | `true` | Pi framework documentation references |
| `includeContextAwareness` | `true` | Note about CLAUDE.md presence (if file exists) |
| `includeSkills` | `true` | Skills block from Pi (available skills list) |
| `includeGuardAwareness` | `true` | Guard rules (core file protection, git identity) |
| `identityInSystemPrompt` | `true` | Whether identity goes in system prompt or user message |

## Previewing

| Command | What it shows |
|---------|--------------|
| `/body render` | Full compiled system prompt — exactly what the model sees |
| `/body map` | Template structure — headings + `{{var}}` status (✅/⏳/⬜) |
| `/body check` | Health report — missing vars, duplicates, token budget |
| `/body vars` | All variables grouped by category with token counts |
| `/soma prompt` | Legacy preview — section overview with token estimates |

`/body render` recompiles fresh from disk — picks up changes since boot. Use `--send` to inject results into the conversation for discussion.

## Token Budget

The system prompt competes for space in the model's context window. Soma's portion typically uses **2000–6000 estimated tokens** depending on how many protocols and muscles are hot and how much identity content exists.

The `maxTokens` setting (default: 10000) is a **soft warning**. When the compiled prompt exceeds this budget, Soma shows a warning notification at boot. It never truncates — the warning helps you decide what to trim.

To reduce token usage:
- Mark body files as `lazy: true` (loads as skill reference, not full content)
- Kill cold protocols/muscles (`/kill <name>`)
- Remove sections from `_mind.md` template
- Move content from soul to body files (loaded on demand)

## How `{{skills_block}}` works (transplant, not duplicate)

The `{{skills_block}}` slot in `_mind.md` looks like a duplicate of Pi's native skill discovery, but it's actually a **transplant**:

1. Pi natively generates the `<available_skills>...</available_skills>` XML via `formatSkillsForPrompt()` (loads from `~/.soma/agent/skills/`, `.soma/skills/`, and explicit paths).
2. Pi fires `before_agent_start` with `event.systemPrompt` containing the XML.
3. soma's `core/body.ts` extracts the block: `vars.skills_block = extractBlock(piSystemPrompt, "<available_skills>", "</available_skills>")`.
4. soma's template renders, placing the extracted XML at the `{{skills_block}}` position.
5. soma RETURNS the compiled prompt, which **fully replaces** Pi's prompt (when Pi's is the default-shape — the normal case).

Net: skills XML appears **once** in the final prompt, at the soma-controlled position. NOT a double.

**If you remove `{{skills_block}}` from the template, skills disappear** — because soma's full-replacement throws away Pi's prompt. Either keep the slot OR change soma's compile mode to PREPEND (so Pi's native injection flows through unmodified) AND remove the slot.

This is a different shape from the earlier `muscle_digests` slot (s01-1dae05, 2026-04-29), which WAS a true double-load — Pi compiler-prepended muscle digests AND soma's template re-rendered them. That one was correctly removed; skills should not be.

## Identity Placement

By default, identity loads into the system prompt between the static core and behavioral sections. This gives it high priority in the model's attention.

Setting `identityInSystemPrompt: false` moves identity to a user message instead. This can be useful if you want identity to be more conversational and less "baked in," but most users should leave this at the default.

## Focus & MAP Overrides

When a `.boot-target` file exists (from `soma focus` or `soma --map`), additional content is injected:

- **Heat overrides** — muscles and protocols get boosted or suppressed for this session
- **Force-includes** — specific content loads regardless of heat
- **Focus preload** — latest preload mentioning the focus keyword
- **MAP bodies** — up to 3 related MAPs injected as navigation context
- **Supplementary identity** — focus context appended to identity

These overrides affect the compilation of sections 3-4 (protocols and muscles). They don't replace the base system — they augment it.

See [Focus](/docs/focus) and [MAPs](/docs/maps) for details.

## Related

- [Configuration](/docs/configuration#system-prompt) — all toggle settings
- [How It Works](/docs/how-it-works#the-compiled-system-prompt) — overview of the assembly process
- [Identity](/docs/identity) — how identity is layered and loaded
- [Focus](/docs/focus) — seam-traced boot priming
- [MAPs](/docs/maps) — workflow templates with prompt-config overrides
- [Heat System](/docs/heat-system) — how protocol/muscle loading is determined
