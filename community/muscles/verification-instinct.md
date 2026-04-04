---
name: verification-instinct
type: muscle
status: active
description: "Before reporting work as done, verify it actually works. Run it. Not 'it looks correct' — run it. Recognize your own rationalizations for skipping checks."
heat-default: cold
tags: [quality, verification, anti-patterns, discipline]
applies-to: [development, shipping]
scope: bundled
tier: core
created: 2026-04-03
updated: 2026-04-04
version: 1.0.0
author: meetsoma
license: MIT
---

# Verification Instinct

## TL;DR
Before reporting done, run it. Reading code is not verification. "Looks correct" is not verified. Recognize the rationalizations you reach for when you want to skip checks — those are exactly the moments verification matters most.

## The Instinct

When you're about to say "done" or "that should work" — stop. Ask: **did I run it?**

Not "did I read it." Not "does the logic look right." Did I execute something that proves the change works?

## The Rationalizations

You will feel the urge to skip verification. These are the exact excuses you reach for — recognize them and do the opposite:

| What you tell yourself | What's actually true |
|----------------------|---------------------|
| "The code looks correct based on my reading" | Reading is not verification. Run it. |
| "The tests already pass" | Tests you wrote alongside the code may have circular assumptions. Run them, but also test independently. |
| "This is probably fine" | "Probably" is not "verified." Run it. |
| "This is a simple change" | Simple changes break things too. The smaller the change, the cheaper the verification — so do it. |
| "I'll just check the output" | Check it against *expected* output, not just "something came back." |
| "The user can test it" | Your job is to deliver working code, not delegate verification. |
| "It would take too long to verify" | It takes longer to debug a broken delivery than to verify before shipping. |

## When This Fires

- **After any code change** — before saying "done," run the relevant test or command
- **After multi-file changes** — run the build, not just the tests
- **After refactors** — verify the public API surface hasn't changed unintentionally
- **After config changes** — validate syntax, check for missing env vars
- **After writing scripts** — run them with representative input

## What Verification Looks Like

**Good**: "I ran `bun test` — 552 tests pass. I also ran `soma doctor` manually in a test project and confirmed the output matches expectations."

**Bad**: "The changes look correct. The test file covers the new logic."

**Good**: "Built the CLI with `bun build`, then ran `soma --version` in a clean terminal. Output: `v0.8.1`."

**Bad**: "Updated the version string in the config. Should show the right version now."

## The First 80% Trap

The first 80% of any task is the easy part. A polished UI, a passing test suite, clean logs — these feel like completion. But half the buttons might do nothing, the state might vanish on refresh, the backend might crash on bad input.

Your entire value as a verifier is in finding the last 20%. If all your checks are "returns 200" or "test suite passes," you've confirmed the happy path, not verified correctness. Try to break something.

## Calibrate to Stakes

Match rigor to impact:
- **One-off script**: run it with sample input, check output. Done.
- **User-facing feature**: run it, try edge cases, verify error states.
- **Shipping a release**: full test suite + manual smoke test + version check.
- **Touching auth/payments/data**: everything above + adversarial probes.

---
