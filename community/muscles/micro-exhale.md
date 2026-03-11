---
type: muscle
status: active
topic: [memory, workflow, logging, sessions]
keywords: [micro-exhale, daily-log, workflow-summary, session-memory]
heat: 0
loads: 0
author: Soma Team
license: MIT
version: 1.0.0
created: 2026-03-10
updated: 2026-03-10
---

# Micro-Exhale — Muscle

<!-- digest:start -->
> **Micro-Exhale** — write workflow summaries to daily log after major completions.
> - After completing a significant workflow, append a structured summary to `.soma/memory/logs/YYYY-MM-DD.md`.
> - One file per day. Always read first, then append a `## HH:MM` section. Never overwrite.
> - Summaries include: what changed, which files, key decisions, commits.
> - Banks persistent memory — feeds changelogs, preloads, roadmap updates, historical queries.
> - NOT a replacement for the full exhale preload — it's a checkpoint within the session.
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
2. **One file per day** — `YYYY-MM-DD.md` in `.soma/memory/logs/`
3. **Never overwrite** — always append new `## HH:MM` sections
4. **Be concrete** — file paths, commit hashes, exact decisions. No prose summaries.
5. **Keep it fast** — 2-5 minutes max. If it takes longer, you're writing a preload, not a micro-exhale.

## What It's NOT

- Not a substitute for `/exhale` or preload — those are session-boundary artifacts
- Not a journal or reflection — it's structured data about what happened
- Not required after every small change — only after meaningful workflow completions
