---
name: test-hygiene
type: muscle
status: active
description: "Validate tests aren't stale after any code removal, rename, or restructure. Run all suites, grep for orphaned references, check pass counts. Dead tests are worse than no tests."
heat: 0
heat-default: warm
triggers: [test, stale, dead-code, cleanup, validation, ci, suite, coverage, hygiene, testing, code-quality, maintenance]
scope: hub
tier: official
created: 2026-03-09
updated: 2026-04-20
version: 1.1.0
author: meetsoma
license: MIT
loads: 0
---

# Test Hygiene

## TL;DR
Validate tests aren't stale after any code removal, rename, or restructure. Run all suites, grep for orphaned references, check pass counts. Dead tests are worse than no tests — they create false confidence.

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
6. **Silent bail-out** — a test that exits early when its setup fails (`CLI_DIR=empty`, `file not found`) is worse than a failed test. CI shows green and nobody investigates. If setup can't complete, **fail loudly** — the bail is the bug signal.
7. **Smoke before assertion** — the cheapest high-value test is "run the thing with `--help` or `show`; assert exit 0." A startup-time bug (missing dep, bad import, broken source chain) is exactly what this catches. Richer assertions are higher value-per-line of test code, but smoke tests are higher value-per-hour of thought.
8. **Dynamic version expectations** — don't hardcode `v0.20.2` in a test that'll outlive v0.20.2. Read the current version from `package.json` or similar source of truth. Hardcoded versions are a ticking timebomb that turn into false failures after every release.

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Test references deleted script | Always fails, gets ignored | Remove the test section |
| `[[ -n "$output" ]]` on error text | Passes when it shouldn't | Match expected format |
| Commented-out test blocks | Clutters, never re-enabled | Delete or rewrite for current code |
| "Skip in CI" hiding real failures | Bug persists undetected | Only skip what's genuinely unavailable in CI |
| Test count changes unremarked | Coverage silently drops | Note count changes in commit messages |
| "Cleanup" deleting operational scripts | Working tools lost, tests orphaned | Distinguish artifacts from tooling before bulk delete |
| Test matches help text not actual output | Passes even when feature is broken | Assert against the COMMAND output format, not fallback text |
| Test checks removed fields | Passes on old code, fails after migration | Update tests alongside schema changes — same commit |
| **Silent bail on missing setup** (`if [[ ! -f "$CLI_DIR/X" ]]; then echo "skipping"; return; fi`) | CI green; suite ran 0/N assertions | Fail loudly when setup fails — "tests couldn't run" is a real result |
| **Hardcoded version string** in assertion | Fails after every release | Read from `package.json` / single source of truth |
| **Grep on obfuscated artifact** for symbol name | False negative after release minification/obfuscation | Check the symbol at its source/pre-obfuscation location instead (or use a behavioral test) |

## Process

```bash
# After any code change, before commit:

# 1. Run all test suites
bash tests/*.sh  # or your framework's runner

# 2. Check for orphaned references to removed code
grep -rn "REMOVED_THING" tests/

# 3. Verify pass count hasn't silently dropped
# Compare against last known count — note changes in commit message

# 4. Audit for silent bail-outs — a suite with zero real assertions run is
#    indistinguishable from a suite that passed. Look for early-return patterns
#    in test files, and consider a minimum-assertion count gate in CI.
grep -rnE 'echo .✓.*not found|return 0.*skipping|exit 0.*skipping' tests/
```

## Lessons from the wild

- **"Silent bail" decays over months.** One workspace had two test suites failing 0/1 and 0/46 for weeks because of a retired-repo path reference; no one investigated because CI just said "failed, known." When the path was fixed, the suites went from 0 assertions running to 64 passing immediately, and an UNRELATED pre-existing bug was surfaced through the newly-running assertions. **The cost of a silently-bailing suite is the bugs it was supposed to catch, silently accumulating.**
- **Smoke tests beat elaborate tests for first-wave coverage.** A 10-line "run `<thing> --help`; exit 0" smoke suite caught three real bugs the first time it ran. Adding richer assertions later is cheap; catching the class of "doesn't even start" is the bulk of the value.
