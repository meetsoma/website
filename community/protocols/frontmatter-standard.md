---
name: frontmatter-standard
type: protocol
status: active
description: "Every .md file needs frontmatter: type, status, created, updated. All AMPS get `## TL;DR` for warm-tier loading."
heat-default: cold
tags: [structure, metadata, organization]
applies-to: [always]
scope: bundled
tier: core
created: 2026-03-09
updated: 2026-08-10
version: 1.2.0
author: Curtis Mercier
license: CC BY 4.0
upstream: core
upstream-version: 1.1.0
spec-ref: curtismercier/protocols/atlas (v0.1)
---

# Frontmatter Standard Protocol

## TL;DR
Every `.md` file needs YAML frontmatter: `type`, `status`, `created`, `updated`. All AMPS content (protocols, muscles, automations) uses `## TL;DR` for warm-tier loading.

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
| `scope` | string | `internal` = workspace only, never push to public repos |
| `updated_source` | string | **Provenance of the `updated:` value.** Present only when `updated:` was NOT set editorially — e.g. `git-mtime`, derived from the file's last real commit. |

#### Why `updated_source` exists

`updated:` means *last **meaningful** update*. When a date is **backfilled** from git mtime, that is a
weaker claim — git mtime says *"the file changed"*, which is not the same as *"the work advanced"*.
A bulk indexing pass can move mtime on hundreds of files without changing what any of them mean.

**Without a provenance marker a backfilled date is indistinguishable from a maintained one**, which
manufactures false precision. With it, a reader — and a validator — can tell the difference.

⚠ **A missing `updated:` is visibly unknown; a fabricated one is not.** Never write this field with an
invented date: if there is no git ground truth (non-git trees), leave `updated:` absent and report it.

### Scope: Internal

Files with `scope: internal` must never be pushed to agent, community, or any public repo. This protects workspace-specific content (private paths, internal workflows, project-specific protocols) from leaking.

⚠ **`scope:` is a convention, not a guard — nothing in the agent enforces it for you.** If you move
content between repos with your own tooling, that check is yours to write: a file correctly marked
`scope: internal`, containing no obvious secret, pushes straight through.

🔑 **Write the check where the content LEAVES**, not where it is authored — a sync/publish step that
refuses to copy a `scope: internal` file, and hard-errors rather than warning. A pre-push hook that
matches keywords and credential shapes will not catch this: it never reads frontmatter.

⚠ **Do not phrase design intent as live protection.** "The hook *should* check for this" reads as
"does" — and a reader who believes they are covered stops checking. State only what runs.

### Valid Types (13)

`plan` · `spec` · `note` · `index` · `memory` · `muscle` · `protocol` · `decision` · `log` · `template` · `identity` · `config` · `map`

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
