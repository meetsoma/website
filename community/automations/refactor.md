---
type: automation
name: refactor
status: active
description: "Extract, move, or restructure code safely. Scan blast radius, audit dependencies, execute incrementally, verify everything."
author: meetsoma
version: 1.0.0
license: MIT
tier: official
tags: [refactor, extract, move, split, rename, restructure, code-quality]
triggers: [refactor, extract, move, split, rename, restructure]
estimated-turns: 15-30
requires: [identified extraction target, validated plan]
produces: [refactored code, updated tests, updated references]
created: 2026-03-16
updated: 2026-04-02
---

# Refactor

## TL;DR

Scan blast radius → map functions → graph dependencies → plan changes → execute one concern per commit → keep backward compat during transition → run tests after every file change. Before deleting anything, search for references. Export from both old and new locations temporarily. Delete old only after full verification.

Extract, move, or restructure code safely. Follows an incremental pattern — scan first, plan the blast radius, execute one concern at a time, verify after every change.

## Pre-Flight (before touching code)

1. **Scan blast radius** — grep for the target name across the entire project. Who imports it? Who calls it? Who tests it?
2. **Map functions** — understand the file's structure before editing. Know what functions exist and where they start.
3. **Graph dependencies** — what does this file import? What imports it? Draw the dependency chain.
4. **Find duplicates** — are there patterns to merge during this refactor?

## Execute

5. **One concern per commit** — types first, then implementations, then callers, then tests.
6. **Keep backward compatibility during transition** — export from both old and new locations temporarily.
7. **Run tests after every file change**, not just at the end.

## Deleting Code

Deleting is a special case of refactoring. **Before deleting any file:**

1. Search for the filename across the project — who references it?
2. Check scripts that `source` or call it
3. Check CI workflows (`.github/workflows/`)
4. Check documentation that references it by name

> **Lesson:** Deleting a "dead file" broke a ship pipeline because another script called it. The search would have caught it — but it felt safe to skip because "it's just deleting a dead file." Deleting is never just deleting.

## Renaming Fields

When renaming a field (config key, frontmatter field, API parameter):

1. Update the parser to handle BOTH old and new (backwards compat)
2. Update all tests that assert on the old field name
3. Update validation scripts that check for the old field
4. Update documentation
5. Create a migration if users have data with the old format

> **Lesson:** Renamed a field in the parser but forgot to update 4 other files that referenced the old name. Each one was a separate discovery. The checklist above is the complete list from that incident.

## Verify

- [ ] Tests pass — all suites, not just the changed one
- [ ] Build passes — compile/typecheck catches what tests miss
- [ ] No orphaned references — grep for old names, paths, imports
- [ ] Docs updated — reference new location/name
- [ ] Committed and pushed

## Anti-Patterns

| Trap | Do This Instead |
|------|-----------------|
| Moving code + changing logic in one commit | Separate: move first, change logic second |
| Deleting without searching for references | Always search the full project first |
| Renaming in code but not in tests/docs | One commit wave: code + tests + docs |
| Refactoring while debugging | Fix the bug first. Refactor next session. |
| Trusting memory about what references a file | Search. Memory is wrong more often than right. |
