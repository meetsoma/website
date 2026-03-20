---
title: "Migrating"
description: "Coming from CLAUDE.md, .cursorrules, or another agent? Here's how Soma does things differently and how to bring your existing setup."
section: "First Steps"
order: 1.9
---

If you've been using Claude Code, Cursor, GitHub Copilot, or another AI coding tool, you already have preferences — rules you've written, patterns you've learned, workflows you repeat. Soma doesn't throw those away. It gives them a better home.

## From CLAUDE.md

Claude Code loads `CLAUDE.md` from your project root. Everything in it gets injected into every conversation. All of it. Every turn.

In Soma, that one file becomes several:

| Your CLAUDE.md section | Where it goes in Soma |
|---|---|
| Project-specific rules ("use pnpm", "deploy branch is main") | `.soma/identity.md` |
| Behavioral preferences ("test before commit", "prefer composition") | `.soma/amps/protocols/` — one file per rule |
| Learned patterns ("this API uses OAuth", "use esbuild not webpack") | `.soma/amps/muscles/` — one file per pattern |
| Tool instructions ("run `npm test` after changes") | `.soma/amps/scripts/` — actual executable scripts |

**Why split it up?** Because not everything is relevant all the time. Your deploy rules don't need to load when you're writing CSS. Soma's [heat system](/docs/heat-system) tracks which rules you actually use and loads them proportionally. Used rules stay hot. Unused rules fade.

### Quick migration

1. Run `soma init` in your project
2. Open your existing `CLAUDE.md`
3. Copy project-specific lines into `.soma/identity.md`
4. For each behavioral rule, create a file in `.soma/amps/protocols/`:

```markdown
---
type: protocol
status: active
created: 2026-03-20
---

## TL;DR
Always run tests before committing. No untested code reaches the repo.

## Rule
...your full rule here...
```

5. For learned patterns, create files in `.soma/amps/muscles/`
6. Delete `CLAUDE.md` (or keep it — Soma reads it too, as a fallback)

The agent discovers everything in `.soma/` automatically. No configuration needed.

## From .cursorrules

Cursor's `.cursorrules` works the same way as `CLAUDE.md` — a single flat file loaded every conversation. The migration path is identical: split into identity + protocols + muscles.

One difference: `.cursorrules` often includes model preferences and formatting instructions. In Soma, those go in [settings.json](/docs/settings):

```json
{
  "formatting": {
    "preferProse": true,
    "maxBulletPoints": 3
  }
}
```

## From GitHub Copilot

Copilot's instructions live in `.github/copilot-instructions.md`. Same pattern — one file, loaded whole. Split into Soma's layered system the same way.

## What you gain

**Relevance.** A `.cursorrules` file with 40 rules loads all 40 every turn. Soma loads the 8 that match what you're doing right now.

**Growth.** Your flat file only changes when you edit it. Soma's protocols and muscles evolve through use — corrections become persistent patterns, repeated workflows become scripts.

**Portability.** `.soma/` is a directory, not a file. You can share individual protocols with your team, publish muscles to the [community hub](https://soma.gravicity.ai/ecosystem), and install other people's workflows with `soma install`.

**Focus.** Type `soma focus auth` and only authentication-related rules, patterns, and tools load. Your CSS preferences stay cold. [Learn more about focus →](/docs/focus)

## What you keep

Soma reads `CLAUDE.md` and `AGENTS.md` if they exist in your project. They're treated as supplementary context — loaded alongside your `.soma/` content, not instead of it. You don't have to delete anything to start using Soma.

The migration is additive. Start with `soma init`, move one rule at a time, and let the heat system figure out what matters.
