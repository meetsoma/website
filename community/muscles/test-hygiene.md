---
type: muscle
status: active
topic: [testing, ci, code-quality, maintenance]
keywords: [test, stale, dead-code, cleanup, validation, ci, suite, coverage]
heat: 0
loads: 0
author: Soma Team
license: MIT
version: 1.0.0
created: 2026-03-09
updated: 2026-03-09
---

# Test Hygiene — Muscle

<!-- digest:start -->
> **Test Hygiene** — validate tests aren't stale after any code removal, rename, or restructure.
> Run all suites. Grep for orphaned references. Watch the count. A test that passes on error text is worse than a test that fails.
<!-- digest:end -->

## When to Trigger

- After removing or renaming a script, module, or export
- After restructuring directories (moves, merges, splits)
- After flattening or squashing commits
- After any cleanup commit
- Before any release or publish
- When CI passes but failures were recently suppressed or skipped

## Checks

1. **Run all suites** — don't assume unrelated suites are safe
2. **Grep for removed names** — `grep -rn "removed_thing" tests/` catches orphaned references
3. **False positives** — a test that passes on error output (e.g., `[[ -n "$error_text" ]]`) is worse than a failure. Match expected format, not just non-empty
4. **Skip vs fail** — if a dependency is optional (CI, missing binary), skip gracefully with a clear message. Never silently pass
5. **Dead sections** — remove test sections for deleted features entirely. Don't leave them behind commented-out or wrapped in impossible conditions

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Test references deleted code | Always fails, gets ignored | Remove the test section |
| `[[ -n "$output" ]]` on error text | Passes when it shouldn't | Match expected format |
| Commented-out test blocks | Clutters, never re-enabled | Delete or rewrite |
| "Skip in CI" hiding real failures | Bug persists undetected | Only skip what's genuinely unavailable |
| Test count changes unremarked | Coverage silently drops | Note count changes in commit messages |
| Bulk "cleanup" deleting operational code | Working tools lost | Distinguish artifacts from tooling first |

## Process

```bash
# After any code change, before commit:

# 1. Run all test suites (adapt to your project)
for f in tests/*.sh; do bash "$f"; done

# 2. Check for orphaned references to removed code
grep -rn "REMOVED_THING" tests/

# 3. Verify pass count hasn't silently dropped
# Keep a note of your baseline count in STATE.md or similar
```
