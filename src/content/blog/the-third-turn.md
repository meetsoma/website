---
title: "The Third Turn"
description: "We spent five months inventing four names for one idea. Tonight we found the idea already implemented, dated March 23rd, running on every boot. The spiral's third turn doesn't go higher — it goes inward, and finds the centre was load-bearing all along."
date: 2026-08-11T23:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["building-in-public", "architecture", "reflection", "AMPS", "PHASE"]
draft: true
---

<!-- SEED s01-810dd1. Third in the spiral sequence: /blog/the-spiral (process, 7 phases) →
     /blog/two-spirals (process vs concept) → this (the concept spiral closes on itself).
     EVIDENCE, all re-derived 2026-08-11, do not ship unverified:
       · core/skill-loader.ts:1-17 + :33-56 — LoadableContent, plan dated 2026-03-23
       · personal/protocols/maps/README.md — MAPS v0.1, 2026-03-16, "navigation layer over AMPS"
       · 73 MAPs status:active runs:0 — selector field `triggers:`, loader parses `tags:`
       · somadian doorway lint 13 incomplete → 0, 9 of 13 were never project-authored
       · full audit: .soma/releases/audits/evolution-doorway-unification-2026-08-11.md (619 ln)
     ⚠ Before publishing: re-run every number. The audit corrected the brief that produced it
     THREE times, including two counts the parent supplied. -->

Five weeks after we drew the first spiral, we drew it again and found it had grown. That was
[Two Spirals](/blog/two-spirals) — the process spiral, how we work, and the concept spiral, what
we're made of.

Tonight the concept spiral came around a third time. It didn't go higher.

It went inward.

## The story we were about to tell

It went like this: AMPS gave us raw materials — protocols, muscles, automations, scripts. Then
"doorways" arrived, a convention for how any folder or skill introduces itself: *read this if · skip
if · below · update this file when.* Four lines at the top of a README, a linter that checks them, and
suddenly every tree in the estate could be navigated by an agent that had never seen it.

The doorway felt like the unification. It felt like the thing we'd been circling for months.

So we did what we've learned to do with a good feeling: we tried to kill it.

## The refutation

We briefed an architect with one instruction that mattered — *the most useful thing you can return is
a refutation with receipts* — and pointed it at the whole lineage.

It came back with this:

> The unification is the **selector/body split**: a cheap, always-resident selector pointing at an
> expensive, on-demand payload. It is not an observation to be made. It is an implemented type in our
> own codebase — `LoadableContent` in `core/skill-loader.ts` — dated **2026-03-23**, running on every
> boot since.

Including the boot that produced the session where we "discovered" it.

The file's own header says it better than we ever did in prose:

> *"Everything becomes a skill at the injection layer… **Skills are lazy AMPS. AMPS are eager skills.
> The only difference is injection strategy:** eager (in prompt) vs lazy (read on demand)."*

The doorway isn't the unification. It's the **fifth instance** of it. It only feels like the origin
because it's the one instance that got a written spec and a checker.

The code got neither. So the code got forgotten.

## Seventy-three scripts that never ran

Here's the part that stayed with us.

In March we wrote a spec called **MAPS — My Automation Protocol Scripts.** Its self-description:
*"the navigation layer over AMPS. Before starting any task, check if a MAP exists."* Its problem
statement could have been written tonight:

> *"AMPS gives an agent the raw materials. But materials without a plan produce inconsistent results.
> One session the agent remembers to run the tests. Next session it forgets."*

That is the doorway thesis, five months early.

**Seventy-three MAPs exist. Status: active. Runs: zero.**

They never fired because their selector field is `triggers:` and the loader that would have read them
parses `tags:`.

One word.

A specification that was correct, written first, and died silently — while we spent the next five
months re-deriving its idea under four other names.

## Not bigger. Better.

There's a version of "we're entering a new phase" that means *we added something.* This isn't that
one.

Everything that went well tonight made something **smaller**:

| | before | after |
|---|---|---|
| a route table describing the wrong server | 26 lines | **7** |
| a decision block, twice-ruled | 20 lines | **3** |
| a hand-maintained roster index | 21,529 bytes | **3,689** |
| one project's doorway lint | 13 incomplete | **0** |

That last row is the one worth pausing on. Nine of those thirteen were **never real work** — frozen
directories nobody edits, a published landing page that should never carry agent scaffolding, vendored
notes from someone else's package. Fixing the *denominator* was the job. Writing thirteen headers
would have been diligent, expensive, and wrong.

A corpus that only grows is a backlog. An agent that only adds is a liability.

## What the third turn actually is

Not new capability. **Naming discipline.**

We have five vocabularies — AMPS, MAPS, doorways, automations, skills — paraphrasing one implemented
type that has been running since March. The next move isn't to invent a sixth name. It's to point all
five at the thing that already works, and let four of them become aliases.

The first spiral went outward: a pipeline became a cycle.
The second went upward: the same shape, at a higher altitude, five weeks later.

The third goes **inward** — back to the centre, to find that what we kept circling was already there
the whole time. Load-bearing. Unnamed. Doing its job on every boot while we wrote documents about it.

Maturity isn't the moment a system gets bigger.

It's the moment it stops needing a new word.
