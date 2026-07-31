---
name: post-fix-learning
type: muscle
status: active
description: "After fixing something hard: document the fix, why previous attempts failed, what led down the wrong path, and write a rule to prevent it next time."
heat-default: cold
tags: [learning, debugging, post-mortem, corrections]
applies-to: [development, debugging]
scope: bundled
tier: core
created: 2026-04-03
updated: 2026-04-04
version: 1.0.0
author: meetsoma
license: MIT
heat: 0
---

# Post-Fix Learning

## TL;DR
After fixing something hard, don't just move on. Document: (1) what the fix was, (2) why it wasn't caught earlier, (3) what led you down the wrong path, (4) a 1-3 sentence rule to prevent it next time. The fix is ephemeral. The lesson is permanent.

## When This Fires

After a fix that took significant effort — multiple attempts, wrong paths explored, time burned debugging. Not every bug fix. The hard ones.

## The Template

When the fix lands, write:

1. **What the fix was** — one paragraph, specific
2. **Why it wasn't caught earlier** — what about the system, the tests, or the process allowed this to hide?
3. **What led down wrong paths** — which assumptions were wrong? What did you try that didn't work and why?
4. **Prevention rule** — 1-3 sentences that a future agent could use to avoid this. Specific enough to act on, general enough to apply beyond this one case.

## Where It Goes

- The fix details → session log (ephemeral, but searchable)
- The prevention rule → a muscle if it's reusable, a comment in the code if it's local
- The pattern → journal entry if it reveals something about the codebase or the user's workflow

## Why This Matters

Correction-capture catches what the user tells you was wrong. Post-fix learning catches what you discovered was wrong on your own. Together they form a complete learning loop:

- **Correction-capture**: user says "don't do X" → adjust behavior
- **Post-fix learning**: you discover "X was broken because Y" → prevent recurrence

The second one is proactive. Nobody had to tell you. You figured it out and wrote it down so the next session doesn't repeat the same investigation.

heat: 0
---
