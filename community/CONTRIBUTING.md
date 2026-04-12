# Contributing to SomaHub

Community **AMPS** — **A**utomations, **M**uscles, **P**rotocols, **S**kills — plus Templates for Soma agents. This content is loaded into AI agent context at runtime — treat it like code.

## Quick Path (Soma Users)

```
/hub share muscle my-pattern
```

Soma validates your content before submitting:

1. **Finds the file** — searches your `.soma/amps/` directory (including `public/` staging)
2. **Parses metadata** — extracts frontmatter or script headers
3. **Privacy scan** — blocks personal paths, API keys, secrets
4. **Quality check** — scores 0-100%, flags missing fields, missing `--help` for scripts, missing `## TL;DR` for protocols, missing digest blocks for muscles
5. **Strips runtime data** — removes `heat:` and `loads:` values (users set their own)
6. **Opens a PR** — pushes a branch and creates a PR via `gh` CLI

If quality is low, Soma shows the issues so you can fix them before submitting. If `gh` CLI isn't installed, Soma generates the files locally and shows manual PR instructions.

**Trusted contributors auto-merge.** New contributors get reviewed.

## Manual Path (GitHub)

1. **Fork** this repository
2. **Add content** to the right directory (`protocols/`, `muscles/`, `skills/`, `automations/`, `templates/`)
3. **Validate** frontmatter against [FRONTMATTER.md](FRONTMATTER.md)
4. **Test** by copying into a real `.soma/` directory and booting Soma
5. **Open a PR** — CI runs six automated checks

## Tier Rules

| Tier | Who | CI Enforcement |
|------|-----|----------------|
| `community` | Anyone | Default — always allowed |
| `official` | Gravicity team | Verified via MAINTAINERS.json |
| `core` | Gravicity team | Verified via MAINTAINERS.json |
| `pro` | Gravicity premium | Separate repo (future) |

If `tier:` is missing, it defaults to `community`. Contributions to `core` or `official` content are welcome — they won't fail CI, but they'll be flagged for maintainer review. If merged, you'll be credited in the version notes.

## Attribution

Your `author:` field must match your GitHub identity:

- **Registered members** (in MAINTAINERS.json): must use your `display_name`
- **New contributors**: use your GitHub username or a consistent display name
- **Impersonation**: claiming another member's display name fails CI

To register a display name, ask a maintainer or contribute a few accepted PRs.

## What Gets Checked

Every PR runs through six automated checks:

| Check | What It Does |
|-------|--------------|
| **Frontmatter** | Required fields present, valid values |
| **Privacy** | No emails, file paths, secrets, API keys |
| **Injection** | No prompt injection, system overrides, hidden text |
| **Format** | Required sections (TL;DR for protocols, digest for muscles) |
| **Tier guard** | Claimed tier authorized for your role |
| **Attribution** | Author matches GitHub identity mapping |

All six must pass. Trusted contributors auto-merge. New contributors are labeled `needs-review` for maintainer approval.

## Content Types

### Protocols

```yaml
---
type: protocol
name: my-protocol           # kebab-case, unique
status: active              # draft | active | stable | dormant | archived | deprecated
heat-default: warm          # cold | warm | hot
applies-to: [always]        # [always] | [git] | [writing] | custom
breadcrumb: "One-sentence summary loaded when warm."
author: Your Name
tier: community
tags: [relevant, searchable]
license: MIT
version: 1.0.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Required sections: `## TL;DR`, `## When to Apply`

### Muscles

```yaml
---
type: muscle
name: my-muscle
status: active
heat-default: warm
breadcrumb: "What this muscle teaches — loaded into system prompt when warm."
triggers: [specific, search, terms, that, activate, this, muscle]
tags: [broad, categories]
heat: 0                     # always 0 in community repo
loads: 0                    # always 0 in community repo
author: Your Name
tier: community
license: MIT
version: 1.0.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

The digest block is what loads into the system prompt — keep it under 10 lines.

### Skills

```
skills/your-skill/
├── SKILL.md          # frontmatter + instructions (see FRONTMATTER.md for full schema)
└── (supporting files)
```

### Automations (MAPs)

```yaml
---
type: automation
name: my-workflow
status: active
description: "What this workflow does — one sentence for hub cards."
triggers: [keywords, that, activate, this, map]
tags: [workflow, category]
estimated-turns: 5-15
requires: [what the user needs before starting]
produces: [what the workflow outputs]
author: Your Name
tier: community
license: MIT
version: 1.0.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Automations are workflow templates (MAPs — My Automation Protocol Scripts). They describe repeatable processes: which steps to follow, what to check at each stage, and what the common traps are. Use `## Phase` or `## Step` headers for the workflow stages.

Unlike protocols (behavioral rules) or muscles (learned patterns), automations are step-by-step guides for specific tasks — debugging, refactoring, releasing, auditing.

### Templates

```
templates/your-template/
├── template.json     # manifest: name, description, requires, tier
├── identity.md       # agent identity with {{PLACEHOLDERS}}
├── settings.json     # tuned thresholds
└── README.md         # hub display page
```

## Forking Existing Content

Want to create your own version of an existing protocol or muscle? Fork it:

1. Copy the original to a **new filename** (e.g., `breath-cycle-minimal.md`)
2. Add a `forked-from` field to your frontmatter:
   ```yaml
   forked-from:
     slug: breath-cycle
     type: protocol
     author: Curtis Mercier
     version: 2.0.0
   ```
3. Change `author` to your name, set your own `version: 1.0.0`
4. Submit as a normal PR

**Rules:**
- Your fork is yours — full creative control, no obligation to track upstream
- `forked-from` is permanent — CI rejects PRs that remove it
- The hub shows lineage: your page links to the original, the original lists known forks
- Slugs must be unique (you can't overwrite someone else's content)

## Naming

- **kebab-case only**: `code-review`, not `codeReview` or `Code Review`
- **Be specific**: `vitest-coverage-gates`, not `testing`
- **No collisions**: first-merge wins — check existing content before submitting

## Quality Bar

Before submitting, ask:

- [ ] Would I want this loaded into my agent's context every session?
- [ ] Is the digest/breadcrumb useful on its own (without reading the body)?
- [ ] Have I removed all project-specific paths and personal references?
- [ ] Does it work when dropped into a fresh `.soma/` directory?

## Soma-Assisted Sharing

When you use `/hub share`, your Soma agent runs quality checks before submitting. This means:

- **Privacy is checked locally** — personal paths and secrets are caught before they leave your machine
- **Format is validated locally** — missing frontmatter, missing digest blocks, missing TL;DR sections are flagged before CI runs
- **Quality is scored** — a 0-100% score helps you see what's good and what needs work
- **Issues are surfaced to your agent** — Soma sees the quality report and can help you fix problems

This makes the submission process collaborative: the tooling does mechanical checks, your agent helps with judgment calls (better descriptions, more useful tags, clearer explanations).

**The CI checks still run on every PR** — they're the safety net. But with Soma handling pre-submit validation, most PRs arrive clean.

## For AI Agents

If you're an AI agent submitting content:

1. Run pre-submit validation before opening a PR
2. Include the validation report in the PR description
3. Do **not** modify: `MAINTAINERS.json`, `CONTRIBUTING.md`, `CODEOWNERS`, `.github/`
4. PRs touching `tier: core` or `tier: official` content require maintainer review (contributions welcome)
5. Set `heat: 0` and `loads: 0` — users control their own usage stats

## Cross-Repo Changes

Most AMPS PRs are self-contained — just markdown. But sometimes a contribution needs a code change in [soma-agent](https://github.com/meetsoma/soma-agent):

| Scenario | What to do |
|----------|-----------|
| New protocol using existing features | PR here only ✓ |
| Protocol that needs a new `settings.*` field | Agent PR first (add field), then PR here |
| New content type (beyond protocol/muscle/skill/automation) | Agent PR first (add `ContentType` + install path), then PR here |
| Updating a `scope: bundled` protocol | PR here — this repo is canonical. Bundled content syncs to CLI at publish. |

If your change spans repos, open the agent PR first and link it. Code lands before content — the runtime can support a feature with zero content, but content referencing missing code breaks.

For core contributions (TypeScript), see [soma-agent/CONTRIBUTING.md](https://github.com/meetsoma/soma-agent/blob/dev/CONTRIBUTING.md).

## Updates

To update an existing contribution: open a PR against the file, bump the `version` field, explain what changed in the PR description.

## License

By contributing, you agree your submission is MIT licensed (unless specified otherwise in frontmatter). Soma always attributes the author.
