---
name: micro-exhale
type: muscle
status: active
description: "after major completions, checkpoint the session log — read it first, FOLD into the section that already covers this thread, append a new `## HH:MM` only for genuinely new work. One file per day. Checkpoint within session, not a full exhale."
heat: 0
heat-default: hot
triggers: [micro-exhale, daily-log, workflow-summary, session-memory, memory, workflow, logging, sessions]
scope: hub
tier: official
created: 2026-03-10
updated: 2026-09-01
version: 1.0.0
author: meetsoma
license: MIT
loads: 0
---

# Micro-Exhale — Muscle

## TL;DR
**Micro-Exhale** — after major completions, checkpoint the session log: read it first, FOLD into the section that already covers this thread, append a new `## HH:MM` only for genuinely new work. One file per day. Checkpoint within session, not a full exhale.

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

1. **Read the file first** — if it doesn't exist, create with frontmatter:
   ```yaml
   ---
   type: log
   created: YYYY-MM-DD
   ---
   ```
2. **One file per day** — `YYYY-MM-DD.md` in `.soma/memory/sessions/`
3. **Fold before you append** — a log is a briefing, not a transcript. If a section already covers
   this thread, EDIT it in place; append a new `## HH:MM` only when the work is genuinely new.
   Never delete or rewrite the whole file. *Tell you got this wrong: one section per completion —
   the reader needs the current state of each thread, not the history of your appends.*
4. **Be concrete** — file paths, commit hashes, exact decisions. No prose summaries.
5. **Keep it fast** — 2-5 minutes max. If it takes longer, you're writing a preload, not a micro-exhale.

## What It's NOT

- Not a substitute for `/exhale` or preload — those are session-boundary artifacts
- Not a journal or reflection — it's structured data about what happened
- Not required after every small change — only after meaningful workflow completions
