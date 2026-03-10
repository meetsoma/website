---
type: protocol
name: frontmatter-standard
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "All .md files get YAML frontmatter: type, status, created, updated. 8 statuses: draft/active/stable/stale/archived/deprecated/blocked/review. 12 types: plan/spec/note/index/memory/muscle/protocol/decision/log/template/identity/config."
author: meetsoma
license: MIT
version: 1.0.0
tier: core
tags: [structure, metadata, organization]
created: 2026-03-09
updated: 2026-03-10
---

# Frontmatter Standard Protocol

## TL;DR
- Every `.md` file gets YAML frontmatter: `type`, `status`, `created`, `updated` (required)
- 12 types: plan · spec · note · index · memory · muscle · protocol · decision · log · template · identity · config
- 8 statuses: draft · active · stable · stale · archived · deprecated · blocked · review
- Optional fields: `tags`, `related`, `owner`, `priority` — powers search/scan tooling
- `## TL;DR` section for protocols; `<!-- digest:start/end -->` for muscles

## Rule

Every Markdown document in an agent-managed workspace MUST have YAML frontmatter.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Document type (see below) |
| `status` | string | Lifecycle state (see below) |
| `created` | date | ISO date of creation |
| `updated` | date | ISO date of last meaningful update |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Searchable keywords |
| `related` | string[] | Links to related docs |
| `owner` | string | Who owns this doc |
| `priority` | string | high/medium/low |

### Valid Types (12)

`plan` · `spec` · `note` · `index` · `memory` · `muscle` · `protocol` · `decision` · `log` · `template` · `identity` · `config`

### Valid Statuses (8)

`draft` · `active` · `stable` · `stale` · `archived` · `deprecated` · `blocked` · `review`

## When to Apply

- Creating any new `.md` file → add frontmatter
- Editing a file missing frontmatter → add it
- Updating content → bump `updated` date
- Reviewing docs → check for `stale` status (not updated in 30+ days)

## When NOT to Apply

- README.md in public repos (conventional format, no frontmatter expected)
- Third-party docs or generated files
- Files explicitly marked as frontmatter-exempt
