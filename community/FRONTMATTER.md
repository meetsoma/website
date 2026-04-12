# Community Hub Frontmatter Standard

All community content must pass `scripts/validate-frontmatter.sh` before merge.

Content types follow the **AMPS** model: **A**utomations · **M**uscles · **P**rotocols · **S**kills — plus Templates for bundling.

## Schemas by Type

### Protocol

```yaml
---
type: protocol
name: kebab-case-name              # matches filename
status: active                     # draft | active | stable | dormant | archived | deprecated
heat-default: warm                 # cold | warm | hot — initial system prompt tier
applies-to: [always]               # signal matching: always, git, typescript, python, etc.
description: "One-liner TL;DR..."   # QUOTED — used for warm injection + hub card
author: Curtis Mercier
license: MIT
version: 1.0.0
tier: core                         # core | official | community | pro
scope: bundled                     # bundled | hub | core (see Scope section)
tags: [workflow, memory]           # hub card tags + search
requires:                          # optional — dependencies auto-installed
  scripts: [soma-code]
created: 2026-03-10
updated: 2026-03-10
---
```

**Required sections:** `## TL;DR`, `## When to Apply`

**Agent runtime reads:** `name`, `description`, `heat-default`, `applies-to`, `scope`, `tier`
**Website hub reads:** `name`, `description`, `tier`, `tags`, `heat-default`, `author`, `version`

### Muscle

```yaml
---
type: muscle
name: kebab-case-name              # matches filename
status: active                     # draft | active | stable | dormant | archived | deprecated
heat-default: warm                 # cold | warm | hot — initial tier + website display
description: "One-liner TL;DR..."   # QUOTED — hub card description
triggers: [specific, search, terms] # agent search + activation keywords
tags: [broad, categories]          # hub card tags
heat: 0                            # numeric 0-15 — always 0 in community repo
loads: 0                           # boot load counter — always 0 in community repo
author: Your Name
license: MIT
version: 1.0.0
tier: community                    # core | official | community | pro
requires:                          # optional — dependencies auto-installed
  scripts: [soma-code]
created: 2026-03-10
updated: 2026-03-10
---
```

**Body convention:** All AMPS content uses `## TL;DR` for warm-tier loading. Keep under 10 lines.

**Note:** `triggers` replaces the older `topic` + `keywords` fields (v0.6.2+). CI accepts either format.

### Automation (MAP)

```yaml
---
type: automation
name: kebab-case-name
status: active
description: "One-liner for hub card"
triggers: [keywords, that, activate]   # agent search + activation
tags: [workflow, category]
estimated-turns: 5-15                  # helps users know time commitment
requires: [what the user needs]        # plain text prerequisites
produces: [what the workflow outputs]   # plain text outputs
author: Your Name
license: MIT
version: 1.0.0
tier: community
created: 2026-03-10
updated: 2026-03-10
---
```

Use `## Phase` or `## Step` headers for workflow stages.

**Note:** `description` replaces `breadcrumb` — CI accepts either. `triggers` replaces the older `topic` + `keywords` (v0.6.2+).

### Template

Templates use **two files**:

**`template.json`** (structured metadata — website + installer reads this):
```json
{
  "name": "architect",
  "description": "One-liner for hub card",
  "author": "meetsoma",
  "version": "1.0.0",
  "tier": "official",
  "requires": {
    "protocols": ["breath-cycle"],
    "muscles": [],
    "scripts": [],
    "skills": []
  }
}
```

**`identity.md`** (install-time placeholder — stamped with project data):
```yaml
---
type: identity
agent: soma
template: architect
project: "{{PROJECT_NAME}}"
created: "{{DATE}}"
---
```

### Script

Scripts live in folders: `scripts/{name}/{name}.sh` + `README.md`.

**Script file** uses `# ---` comment headers:
```bash
# ---
# name: soma-code
# description: Fast codebase navigator
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [navigation, search, code]
# ---
```

**README.md** uses standard YAML frontmatter for hub display.

### Skill

```yaml
---
type: skill
name: skill-name
description: "One-liner..."
tags: [topic1, topic2]
status: active
author: Author Name
license: MIT
version: 1.0.0
created: 2026-03-10
updated: 2026-03-10
---
```

Skills live in folders: `skills/{name}/SKILL.md` + supporting files.

## Field Reference

| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `type` | ✅ | `protocol`, `muscle`, `skill`, `automation`, `identity` | Always first field |
| `name` | ✅ | kebab-case | Matches filename |
| `status` | ✅ | `draft`, `active`, `stable`, `dormant`, `archived`, `deprecated` | |
| `description` | ✅* | Quoted string | Quoted one-liner for hub card + skill loader |
| `version` | ✅ | semver | |
| `author` | ✅ | Name or handle | |
| `license` | ✅ | SPDX identifier | |
| `created` | ✅ | YYYY-MM-DD | |
| `updated` | ✅ | YYYY-MM-DD | Change with every meaningful edit |
| `tier` | ✅ | `core`, `official`, `community`, `pro` | |
| `tags` | protocols | Array | Hub card tags |
| `triggers` | muscles, automations | Array | Agent search + activation (replaces `topic`/`keywords`) |
| `heat-default` | protocols + muscles | `cold`, `warm`, `hot` | Initial system prompt tier |
| `heat` | muscles only | numeric 0-15 | Must be 0 in community repo |
| `loads` | muscles only | numeric | Must be 0 in community repo |
| `applies-to` | protocols | Array of signals | `always`, `git`, `typescript`, etc. |
| `scope` | optional | `bundled`, `hub`, `core` | See Scope section below |
| `requires` | optional | Object or Array | Dependencies — see Dependencies section |
| `forked-from` | optional | Object | Lineage tracking — see Forks section |
| `contributors` | optional | Array | Attribution — see Contributors section |

## Distribution Scope (`scope`)

| Scope | Meaning | Loads into prompt? |
|-------|---------|-------------------|
| `bundled` | Ships with `meetsoma` npm package | Yes — via heat system |
| `hub` | Available on SomaHub (default) | Yes — via heat system |
| `core` | Built-in behavior documented as protocol | No — readable on demand only |

**`core` scope** is for protocols whose behavior is coded in TypeScript extensions. The protocol exists so users can understand and configure the system, but editing the `.md` file won't change how it works. Examples: `breath-cycle`, `heat-tracking`, `git-identity`.

Core protocols:
- Can't be `/pin`'d — the agent explains they're built-in
- Are listed as "Core Protocol references" alongside Soma docs
- Can be read on demand when the user asks about configuration
- Save ~2000 tokens by not loading documentation into the prompt every turn

## Dependencies (`requires`)

Any AMPS content can declare dependencies on other hub content:

```yaml
requires:
  protocols: [breath-cycle]
  muscles: [incremental-refactor]
  scripts: [soma-code]
  automations: []
```

- Only list the types you depend on (empty types can be omitted)
- `/hub install` resolves dependencies automatically — missing deps are installed alongside the content
- Templates use the same `requires` field in `template.json`

## Forks (`forked-from`)

When you create a variant of existing hub content:

```yaml
forked-from:
  slug: breath-cycle
  type: protocol
  author: Curtis Mercier
  version: 2.0.0
```

- **Your fork is yours.** Full creative control, no obligation to track upstream.
- **Lineage is permanent.** CI rejects PRs that remove `forked-from`.
- **Slugs must be unique.** Fork `breath-cycle` → name it `breath-cycle-minimal`.
- **Hub shows the family tree.** Original lists forks, forks link to original.

## Contributors (`contributors`)

When a PR to core/official content is accepted:

```yaml
contributors:
  - name: janedoe
    version: 2.1.0
    contribution: "Added Python signal matching examples"
```

The `author` field stays the same. Contributors appear on the hub page.

## Validation

```bash
# Validate all content
./scripts/validate-frontmatter.sh

# Run all CI checks locally
./scripts/validate-frontmatter.sh && ./scripts/privacy-scan.sh && \
./scripts/injection-scan.sh && ./scripts/format-check.sh
```
