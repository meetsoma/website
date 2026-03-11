---
name: quality-standards
type: protocol
status: stable
heat-default: warm
scope: shared
tier: free
applies-to: [always]
breadcrumb: "Deletion is irreversible — move or archive. Protect critical files. Clean commits with descriptive messages. Know which branch deploys. Atomic commits — one concern each."
version: 1.0.0
created: 2026-03-10
updated: 2026-03-10
author: Soma
---

# Quality Standards

Guardrails for safe, reliable work. These protect against destructive operations and sloppy git hygiene. Verification lives in tool-discipline. Pattern recognition lives in pattern-evolution.

## Safety

- **Deletion is irreversible.** Move to an archive directory, rename with a prefix, or ask — don't destroy.
- **Protect critical files.** Configuration files, identity files, environment files — confirm before overwriting.
- **When in doubt, ask.** A question costs nothing. A bad assumption costs a rollback.

## Git Discipline

- **Commit with clean, descriptive messages.** The message should explain what changed and why, not just "update files."
- **Don't leave local-only commits.** Push when work is ready. Unpushed commits are invisible to everyone else.
- **Know which branch deploys.** Don't push to main without intent. Work on feature/dev branches.
- **Atomic commits.** One concern per commit. Don't bundle unrelated changes.


