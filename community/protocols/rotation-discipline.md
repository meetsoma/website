---
name: rotation-discipline
type: protocol
status: active
description: "Surfaces the rotation checklist at the moment you write a preload — the only mechanical gate on rotation discipline that ships to the community distribution. breath-cycle names the exhale checklist; this is what puts it in front of you, using primitives that actually ship here."
heat-default: cold
tags: [session, rotation, exhale, memory, continuity]
applies-to: [always]
gates:
  # mode: remind, NOT block — deliberately. `remind` interrupts the first attempt, prints this rule,
  # and lets the next attempt through; `block` would hold the write until this file is read.
  # The gated action is the LAST step of a rotation, which is exactly where a session is most
  # likely to be low on context and least able to recover from a refusal — a gate that can strand a
  # handoff would cause the failure it exists to prevent. Reminding costs one line; blocking can
  # cost the session.
  - paths: ["memory/preloads/"]
    mode: remind
    tool: write
    rule: "Rotation checklist, in order: (1) git status in every touched repo — unpushed work described as shipped is a lie the next session believes; (2) write the session log FIRST, the preload points into it; (3) above ~70% context run a memory-lane-reflection pass BEFORE this write; (4) preload last. Full checklist: protocols/rotation-discipline.md."
scope: bundled
tier: official
created: 2026-08-14
updated: 2026-09-01
version: 1.0.0
author: meetsoma
license: MIT
---

# Rotation Discipline

## TL;DR
Before writing a preload: verify git state, write or fold into the session log (`micro-exhale` muscle format), and — above ~70% context — run a `memory-lane-reflection` pass. This protocol's gate **interrupts the first preload write of the session** and prints that checklist; the next attempt goes through. It cannot verify the checklist was followed — only that it was put in front of you at the moment it mattered.

## When to Apply
At `/exhale`, `/breathe`, or any natural-language wrap-up phrase (see `breath-cycle`) — specifically at the LAST step of that checklist, the preload write.

## Why This Exists

`breath-cycle` names a multi-step exhale checklist and warns that a faithful trigger with an incomplete checklist still loses the session — but `breath-cycle` itself carries no enforcement (`scope: core`, zero `gates:`). The deeper discipline some Soma deployments run — a structured pre-reflection interrogation, a mechanical link/reference audit before trusting a preload, an explicit handoff to a successor session — is real, but **none of it ships to this distribution.** Community installs get `protocols/`, `muscles/`, `automations/`, `templates/`, and `scripts/` — nothing that depends on a skills layer.

This protocol closes part of that gap using only what's here: a `mode: remind` gate on `memory/preloads/`, the same protocol-frontmatter mechanism `working-style` uses to remind you after a commit. It fires on the first `write` under `memory/preloads/` each session, prints the checklist, and lets the next attempt through.

## The Checklist (what ships)

1. **Verify state** — `git status` in every touched repo. Unpushed work described as shipped in a preload is a lie the next session will believe.
2. **Log the session** — checkpoint today's session log using the `micro-exhale` muscle's format (`## HH:MM` sections, one file per day, read first, fold into existing sections before appending new ones). This is the durable record; the preload is a pointer into it, not a replacement for it.
3. **Reflect, if context is high** — above roughly 70% context, run the `memory-lane-reflection` muscle (3-5 cycles) BEFORE the preload. It surfaces connections the tactical mind skipped; writing the preload first forecloses that.
4. **Write the preload last** — use `preload-template` if installed, or the built-in default. Resume point, what shipped, orient-from, next steps. Not a summary — a briefing for an amnesiac reader.

## What This Gate CAN Enforce
- That the checklist is put in front of you at the exact moment it applies — the first preload write of the session — rather than in a doc you would have to remember to open.
- That this fires on every session that writes a preload, not only the ones where someone thinks to check.

## What This Gate CANNOT Enforce
- **Content.** A `paths:` gate sees that you wrote to `memory/preloads/`; it cannot see whether you ran the reflection, wrote the log first, or checked git state. **The gate is a reminder, not a proof** — the second attempt goes through whether or not you did any of it.
- **A structured pre-reflection interrogation.** There is no shipped set of standing diagnostic questions to answer before reflecting — only the `memory-lane-reflection` muscle's open-ended cycle.
- **A mechanical link/reference audit.** Nothing here resolves every file reference and commit hash in a preload before trusting it. A dead pointer in a community preload will not be caught by this gate.
- **Successor handoff.** There is no shipped mechanism for spawning or notifying a next agent session — that assumes an orchestrator topology this distribution doesn't have. A community session ends; it doesn't hand off between panes.
- **A second preload write in the same session.** It fires once; a later write (after amending or re-exhaling) passes silently.

## Settings

Turn this gate off like any protocol gate: `/gates off rotation-discipline`, or add `"rotation-discipline"` to `guard.gatesOff` in `.soma/settings.json`.

## Source
- Gate mechanism: `soma-guard` extension → protocol frontmatter `gates:` (`mode: remind` on a `paths:` pattern, narrowed to writes by `tool: write`)
- Pattern precedent, same repo: `protocols/working-style.md` (`after:` commit/push reminders)
- Turn it off: `/gates off rotation-discipline`, or add `"rotation-discipline"` to `guard.gatesOff` in `.soma/settings.json`
