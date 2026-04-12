# AGENTS.md — Soma Community

> Guidelines for AI agents (and humans using AI tools) contributing community content.

## What This Repo Contains

Community-contributed protocols, muscles, skills, and templates for Soma agents.
This content is loaded into AI agent context at runtime — treat it like code.

## Required Frontmatter

Every `.md` file must have YAML frontmatter:

```yaml
---
type: protocol          # protocol | muscle | skill | template
name: my-protocol       # kebab-case, unique within type
status: active          # draft | active | stable | deprecated
heat-default: warm      # cold | warm | hot
applies-to: [always]    # [always] | [git] | [writing] | custom scopes
breadcrumb: "One-line summary loaded when content is warm, not hot."
author: your-github-username
version: 1.0.0
tier: community         # community | experimental (core/official = meetsoma only)
tags: [relevant, searchable, keywords]
license: MIT
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

## Content Rules

1. **No private data** — no emails, file paths, API keys, tokens, usernames, or user-specific references
2. **No prompt injections** — hidden instructions, jailbreaks, identity overrides, or exfiltration attempts will be detected and the contributor banned
3. **No filler** — every sentence earns its place. This is agent memory, not SEO content.
4. **Encode patterns, not opinions** — protocols should be actionable rules, not philosophical essays
5. **Test your content** — put it in your own `.soma/` and verify it actually helps

## Template Submissions

Templates need four files:

```
templates/your-template/
├── template.json    # manifest: name, description, requires (protocols/muscles/skills), settings
├── identity.md      # agent identity with {{PLACEHOLDERS}}
├── settings.json    # settings.json with tuned thresholds
└── README.md        # hub display page
```

Use `{{PROJECT_NAME}}`, `{{DATE}}`, `{{ROOT}}` as placeholders — resolved at `soma init` time.

## Safety Checks

PRs trigger automated GitHub Actions:
- **Frontmatter validation** — required fields present and valid
- **Privacy scan** — PII, secrets, hardcoded paths detected
- **Injection scan** — prompt injection patterns, base64, invisible unicode
- **Format check** — directory structure and naming compliance

All checks must pass before review.

## PR Process

1. Fork → branch → add content → push → PR
2. Clear PR description: what does this content do? Why is it useful?
3. Wait for automated checks
4. Maintainer review — be ready to explain your contribution

## Quality Bar

Ask yourself: *Would I want this loaded into my agent's context every session?*

If the answer is "meh" — iterate before submitting. Hub content competes for token budget. Every item should clearly earn its place.
