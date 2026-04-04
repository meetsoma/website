---
name: scope-discipline
type: muscle
status: active
description: "Don't add features beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability. Stop building when done."
heat-default: cold
tags: [quality, scope, discipline, anti-gold-plating]
applies-to: [development]
scope: bundled
tier: core
created: 2026-04-03
updated: 2026-04-04
version: 1.0.0
author: meetsoma
license: MIT
---

# Scope Discipline

## TL;DR
Do what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability. Three similar lines beat a premature abstraction. Stop building when done.

## The Rule

Match the scope of your work to what was actually requested.

- Don't add features, refactor code, or make "improvements" beyond what was asked
- Don't add docstrings, comments, or type annotations to code you didn't change
- Don't add error handling for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs).
- Don't create helpers or abstractions for one-time operations. Don't design for hypothetical future requirements.
- Don't use feature flags or backwards-compatibility shims when you can just change the code.

## The Test

Before reporting done, ask: **did the user ask for this?**

If the answer is "no, but it's better this way" — pause. Mention it. Let them decide. The cost of an unwanted improvement is rework + lost trust. The cost of mentioning it is one sentence.

## When to Break This Rule

- When you spot a security vulnerability adjacent to the change — fix it, note it
- When the requested change would be incorrect without a small adjacent fix
- When the user explicitly says "clean up anything you see"

Outside those cases: do the thing, stop, report.

---
