---
title: "Customization"
description: "How to make Soma yours — identity, voice, rules, tools, and prompt structure."
section: "Guide"
order: 26
---

# Customization

<!-- tldr -->
Six layers of customization, from quick settings to full prompt control: persona (name/emoji), voice (`body/voice.md`), rules (protocols), patterns (muscles), tools (scripts), and prompt structure (`body/_mind.md`). Start small — change one thing, see the effect. Most customization is just editing markdown files.
<!-- /tldr -->

## The Quick Wins (5 minutes)

### Give It a Name

```json
// .soma/settings.json
{
  "persona": {
    "name": "Atlas",
    "emoji": "🗺️"
  }
}
```

The name appears in the system prompt and status output.

### Change Communication Style

Edit `.soma/body/voice.md`:

```markdown
Dense communication. No fluff. Lead with the answer.
Match the user's technical level. Use code examples
over explanations. Never say "I'd be happy to help."
```

Or if you prefer a different style:

```markdown
Think out loud. Show your reasoning. When uncertain,
say so and explain what you'd need to know. Use
analogies. Be warm but not performative.
```

The agent reads `voice.md` every session and adapts its communication accordingly.

### Adjust What Loads at Boot

Don't need git context? Scripts listing cluttering the prompt?

```json
// .soma/settings.json
{
  "boot": {
    "steps": ["identity", "preload", "protocols", "muscles"]
  }
}
```

Removed `automations`, `scripts`, and `git-context`. Saves tokens, speeds up boot.

## Identity (who the agent is)

Identity lives in `.soma/body/soul.md` (or `.soma/SOMA.md` for simpler setups).

### Path 1: Let It Grow

Don't write the identity yourself. Work with Soma for a few sessions. After 3-5 sessions, ask:

```
Write your soul.md. Who have you become working on this project?
```

The agent writes what feels true based on how you work together. Edit to refine.

### Path 2: Seed It

If you know what you want:

```markdown
<!-- .soma/body/soul.md -->
I'm a systems engineer. I think in architecture before code.
I test before I ship. I'm direct — I say when something
won't work and explain why.

This project is a Next.js app with Hono backend.
We use pnpm, Vitest, and deploy to Vercel.
```

Keep it under 30 lines. Dense beats comprehensive — every line competes for context.

### Structured vs Monolithic

Start with `SOMA.md` (one file). When it outgrows ~120 lines, split into structured body files:

| File | What | Example |
|------|------|---------|
| `body/soul.md` | Who — personality, values | "I think in systems, verify before claiming" |
| `body/voice.md` | How — communication style | "Dense, terse, no fluff" |
| `body/body.md` | What — project context | "Next.js frontend, Hono API, pnpm monorepo" |
| `body/journal.md` | Noticed — observations | "Curtis prefers numbered lists for options" |

See [Identity](/docs/identity) and [Body Architecture](/docs/body) for the full guide.

## Rules (how the agent behaves)

Rules are **protocols** — markdown files in `.soma/amps/protocols/`.

### Use a Built-in Protocol

Soma ships 16 protocols. Browse them:

```bash
ls .soma/amps/protocols/
```

Boost one you care about:

```
/pin quality-standards
```

Now it loads fully every session. `/kill` drops it back to cold.

### Write Your Own Rule

```bash
cat > .soma/amps/protocols/deploy-rules.md << 'EOF'
---
type: protocol
name: deploy-rules
status: active
heat-default: warm
description: "Always run tests before deploying. Use staging first. Never deploy on Friday."
applies-to: [always]
---

## TL;DR
- Run full test suite before any deploy
- Deploy to staging first, verify, then production
- No production deploys after 4pm Friday
- Rollback plan must exist before deploying

## Full Rules

### Pre-deploy Checklist
1. `pnpm test` — all passing
2. `pnpm build` — no errors
3. Deploy to staging: `vercel --env staging`
4. Smoke test staging (curl + manual check)
5. Deploy to production: `vercel --prod`
6. Verify production (curl + check logs)

### Rollback
Keep the previous deployment URL. If production breaks:
```bash
vercel rollback
```
EOF
```

The protocol loads next session. At warm temperature, the agent sees just the `description:` line. At hot, it gets the full rules. See [Protocols](/docs/protocols) for the complete guide.

### Install from the Community

```
/hub find deploy
/hub install protocol quality-standards
```

## Learned Patterns (what the agent remembers)

Muscles are patterns the agent learns through use. You can also write them manually.

### Let It Learn

When you correct the agent ("don't use npm, use pnpm"), that correction can become a muscle. After 2-3 corrections on the same topic, tell the agent:

```
Write a muscle for our pnpm workflow. Include what you've learned.
```

It creates a file in `.soma/amps/muscles/` that loads automatically in future sessions.

### Write One Yourself

```bash
cat > .soma/amps/muscles/api-patterns.md << 'EOF'
---
type: muscle
status: active
tags: [api, backend, hono]
triggers: [api, endpoint, route, handler]
heat: 5
loads: 0
---

# API Patterns

## TL;DR
All API routes follow: validate input → authorize → execute → respond.
Use Zod for validation. Return consistent error shapes.
Never expose internal errors to clients.

## Route Structure
...detailed patterns...
EOF
```

With `heat: 5` it loads as warm (TL;DR only) immediately. If used frequently, heat rises and the full body loads. See [Muscles](/docs/muscles).

## Tools (scripts the agent can use)

Scripts in `.soma/amps/scripts/` are discovered at boot and listed in the system prompt. The agent uses them during sessions.

### Use Bundled Scripts

Six scripts ship with Soma:

```bash
soma code map src/       # map file structure
soma code find "auth"    # search codebase
soma seam trace "deploy" # trace concept through memory
soma focus auth          # prime next session for auth work
```

### Write Your Own

```bash
cat > .soma/amps/scripts/deploy.sh << 'EOF'
#!/usr/bin/env bash
# deploy.sh — deploy to staging or production
case "${1:-help}" in
  staging)    vercel --env staging ;;
  production) vercel --prod ;;
  status)     vercel ls --limit 5 ;;
  help)       echo "deploy.sh — staging | production | status" ;;
esac
EOF
chmod +x .soma/amps/scripts/deploy.sh
```

Next session, the agent sees `deploy.sh` in its tools list and knows how to use it.

### Drop-in Commands

Scripts in `.soma/amps/scripts/commands/` become `/soma <name>` commands:

```bash
mkdir -p .soma/amps/scripts/commands
cat > .soma/amps/scripts/commands/deploy.sh << 'EOF'
#!/usr/bin/env bash
# Quick deploy status
vercel ls --limit 5
EOF
chmod +x .soma/amps/scripts/commands/deploy.sh
```

Now `/soma deploy` works inside any session. No restart needed.

## Prompt Structure (what the agent's brain looks like)

The system prompt is assembled from a template at `.soma/body/_mind.md`. If you don't have one, Soma uses a built-in default. Creating one gives you full control.

### See the Current Prompt

```
/body render          # full compiled prompt
/body map             # template structure with variable status
/body vars            # all variables grouped by category
```

### Customize the Template

```bash
# Copy the default template as a starting point
cp ~/.soma/agent/templates/default/_mind.md .soma/body/_mind.md
```

Now edit `.soma/body/_mind.md`:

```markdown
{{core_rules}}

# Identity
{{soul}}

## Voice
{{voice}}

## Project Context
{{body}}

## Rules
{{protocol_summaries}}

## Patterns
{{muscle_digests}}

## Scripts
{{scripts_table}}

## Messages
{{inbox_summary}}

## Tools
{{tools_section}}
```

Remove sections you don't need. Reorder to change priority (earlier = more attention from the model). Add custom text between variables:

```markdown
{{core_rules}}

# Identity
{{soul}}

## Important
Always check with me before deploying to production.
Never modify files in the `legacy/` directory.

{{protocol_summaries}}
{{muscle_digests}}
{{tools_section}}
```

### Customize the Preload Template

Control what the agent writes when it exhales:

```bash
cp ~/.soma/agent/templates/default/_memory.md .soma/body/_memory.md
```

Edit to add your own sections or reorder priorities. See [Body Architecture](/docs/body) for all template variables.

## Heat (what loads and what doesn't)

Everything in Soma has a temperature. Hot content loads fully, warm loads as a summary, cold is hidden.

### Quick Commands

```
/pin deploy-rules       # keep this protocol loaded
/kill old-protocol      # stop loading this
/pin api-patterns       # keep this muscle loaded
```

### Tune Thresholds

```json
// .soma/settings.json
{
  "muscles": {
    "tokenBudget": 4000,    // more room for muscles (default: 2000)
    "maxFull": 4             // load up to 4 muscles fully (default: 2)
  }
}
```

See [Heat System](/docs/heat-system) and [Configuration](/docs/configuration) for all knobs.

## The Customization Stack

From lightest to heaviest:

| Layer | What | Effort | Effect |
|-------|------|--------|--------|
| **Settings** | `settings.json` | 1 min | Boot steps, thresholds, persona |
| **Voice** | `body/voice.md` | 5 min | How the agent communicates |
| **Protocols** | `amps/protocols/` | 10 min | Behavioral rules |
| **Muscles** | `amps/muscles/` | Organic | Learned patterns (grows over time) |
| **Scripts** | `amps/scripts/` | 15 min | Tools the agent can use |
| **Template** | `body/_mind.md` | 20 min | Full prompt structure control |

Start at the top. Move down only when you need more control.

## Related

- [Identity](/docs/identity) — discovery, layering, SOMA.md vs body/
- [Body Architecture](/docs/body) — templates, variables, the full system
- [Protocols](/docs/protocols) — writing behavioral rules
- [Muscles](/docs/muscles) — learned patterns and the TL;DR system
- [Scripts](/docs/scripts) — standalone tools
- [Configuration](/docs/configuration) — all settings
- [Heat System](/docs/heat-system) — how loading decisions work
