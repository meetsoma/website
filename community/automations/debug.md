---
type: automation
name: debug
status: active
description: "Systematic bug hunting — contain, scope, locate, fix, verify. Avoids common agent traps: guessing, naive text analysis, chasing false leads."
author: meetsoma
version: 1.1.0
license: MIT
tier: official
tags: [debug, error, bug, broken, failed, crash, workflow]
triggers: [debug, error, bug, broken, failed, crash, undefined, not defined, load failure]
estimated-turns: 3-10
requires: [reproducible error or error message]
produces: [identified root cause, fix, test verification]
created: 2026-03-16
updated: 2026-04-02
---

# Debug

## TL;DR

Contain → scope → locate → fix → verify. Start from `git diff`, not the whole file. Classify the error pattern (undefined, null access, module not found, type error) to pick the right action. Minimal fix only — no refactoring during debug. Run ALL tests, not just the related one. Log what wasted time so you don't repeat it.

Systematic approach to finding and fixing bugs. Optimized to avoid common agent traps: guessing, naive text analysis, and chasing false leads.

## Phase 1: Contain (1 turn)

1. **Capture the exact error** — copy the full error message, screenshot, or stack trace. Don't paraphrase.
2. **Identify blast radius** — what's broken? Just this feature, or cascading?
3. **Check for side effects** — stale servers, cached builds, leftover processes. Kill anything that shouldn't be running.

## Phase 2: Scope the Change (1-2 turns)

4. **What changed last?** — `git log --oneline -5`. The bug is almost always in the most recent change. Start there.
5. **Diff the suspect commit** — `git diff <before>..<after> -- <file>`. Extract only new lines (`grep "^+"`). This is the search space.
6. **Does the old version work?** — If you can test `git stash` or `git checkout <before>`, do it. Confirms whether the recent change is the cause.

> **Rule: Diff first, analyze second.** The #1 agent time-waster is analyzing the entire file when only 50 lines changed. Scope the search space before reading code.

## Phase 3: Locate (1-3 turns)

7. **Read the new lines for obvious issues** — stray characters, missing imports, broken syntax, wrong variable names.
8. **If not obvious, classify the error type:**

| Error Pattern | Most Likely Cause | Action |
|--------------|-------------------|--------|
| `X is not defined` | Missing import, removed variable still referenced | Diff new lines + grep for bare references |
| `Cannot read property of undefined` | Null object access, wrong name | Check call sites and data flow |
| `Module not found` | Bad import path, missing re-export | Check import resolution |
| `Type error` | Wrong argument types after refactor | Check function signatures at call sites |
| `Command not found` | Registration failed upstream | Check if the registering module loaded |

9. **Don't do naive text analysis on large files.** Counting parens, braces, or searching for single-letter variables across 2000+ lines is unreliable — strings, comments, and template literals create false positives. Work from the diff, not the file.

## Phase 4: Fix (1 turn)

10. **Make the minimal fix.** Don't refactor while debugging. Fix the bug, nothing more.
11. **Verify the fix addresses the exact error.** Re-read the original error message and confirm your change eliminates that specific failure.

## Phase 5: Verify (1-2 turns)

12. **Run all test suites** — not just the one that seems related. Bugs cascade.
13. **Commit and push** — get the fix out immediately.
14. **Log** — write what the error was, root cause, what you tried, what worked, what wasted time. The "what wasted time" part prevents repeating it.

## Anti-Patterns

| Trap | Why It Wastes Time | Do This Instead |
|------|-------------------|-----------------|
| Counting parens/braces in a large file | Strings and comments contain them | Diff the change only |
| Guessing from the error message alone | Error messages are symptoms, not causes | Find what changed recently |
| Analyzing the whole file when a 50-line diff exists | 2000 lines of noise | `git diff` scopes the search |
| Fixing + refactoring in the same commit | Muddies the fix, risks new breaks | Fix only. Refactor next. |
| Assuming something is broken without checking | Claims about state waste hours | Verify through code, not memory |

## Checklist

Before closing the debug session:

- [ ] Error is reproducible (or was before fix)
- [ ] Root cause identified and documented
- [ ] Fix is minimal — no unrelated changes
- [ ] All test suites pass
- [ ] Committed and pushed
- [ ] Session log has: error, cause, fix, wasted-time notes

## See Also

- `/hub install automation debug` — install this workflow
- `refactor` automation — safe code restructuring
- `visual-gap-analysis` automation — flow diagramming + E2E
