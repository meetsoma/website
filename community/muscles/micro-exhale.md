---
type: muscle
name: micro-exhale
breadcrumb: "Write workflow summaries to daily log after major completions — one file per day, always append."
tier: official
scope: hub
topic: [memory, workflow, logging, sessions]
keywords: [micro-exhale, daily-log, workflow-summary, session-memory]
status: active
heat: 0
heat-default: hot
loads: 0
author: meetsoma
license: MIT
version: 1.0.0
created: 2026-03-10
updated: 2026-03-15
---

# Micro-Exhale — Muscle

<!-- digest:start -->
> **Micro-Exhale** — after major completions, append `## HH:MM` summary to session log. One file per day, read first, never overwrite. Checkpoint within session, not a full exhale.
<!-- digest:end -->

## When to Write

- After completing a multi-file workflow (3+ files touched)
- After a significant decision with rationale worth preserving
- After a commit that closes a plan phase or resolves an issue
- Before switching to a fundamentally different task area

## Format

```markdown
## HH:MM — Brief Title

### What Changed
- Bullet points with file paths and what was done to each

### Key Decisions
- Decision with rationale (if any made this workflow)

### Commits
| Repo | Commit | Message |
|------|--------|---------|
| name | hash   | message |
```

## Rules

1. **Read the file first** — if it exists, append. If it doesn't, create with frontmatter:
   ```yaml
   ---
   type: log
   created: YYYY-MM-DD
   ---
   ```
2. **One file per day** — `YYYY-MM-DD.md` in `.soma/memory/sessions/`
3. **Never overwrite** — always append new `## HH:MM` sections
4. **Be concrete** — file paths, commit hashes, exact decisions. No prose summaries.
5. **Keep it fast** — 2-5 minutes max. If it takes longer, you're writing a preload, not a micro-exhale.

## What It's NOT

- Not a substitute for `/exhale` or preload — those are session-boundary artifacts
- Not a journal or reflection — it's structured data about what happened
- Not required after every small change — only after meaningful workflow completions
