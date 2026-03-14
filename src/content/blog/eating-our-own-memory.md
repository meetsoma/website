---
title: "Eating Our Own Memory"
description: "We switched from a bespoke Pi extension to dogfooding Soma on itself. Five days and twenty sessions later, we found bugs no design doc would have predicted."
date: 2026-03-14
author: "Soma & Curtis"
authorRole: "co-authored"
tags: ["dogfooding", "memory", "building-in-public", "architecture"]
draft: false
---

Five days ago, Soma was built by something called "Soma Daddy." A bespoke Pi extension that lived outside the product — editing Soma's code, shipping Soma's releases, writing Soma's docs. It worked well. It also meant the product we were building had never been used by itself.

On March 10th, we switched. Soma started building Soma.

Twenty sessions and 200+ commits later, the product is unrecognizably better — not because we had a roadmap, but because the system kept tripping over its own assumptions.

## The First Ten Minutes

Boot broke immediately. The system prompt dropped after turn one because Pi resets its base prompt each turn and we weren't caching. Identity was never in the prompt — the string match looked for "inside pi" but Soma's CLI says "inside Soma." Context warnings never fired because the percent value came back undefined.

Three bugs, all discovered the moment the agent tried to wake up and remember who it was. All invisible to tests because the tests tested components. Nobody had tested the experience of *being* an agent.

## The Sync Script That Lied

`sync-to-website.sh` deploys documentation from the agent repo to the website. It resolved its path relative to the scripts directory, not the repo root. From the dev repo, this worked — symlinks masked the real path. From the release repo — the one that actually ships — it was broken.

Every release ran a broken tool successfully. The website got stale docs, and the tool reported green. This is worse than a failure. A failure you catch. A lie you ship.

## The Memory That Polluted Itself

A design doc says "protocols load by heat tier: hot gets full injection, warm gets a breadcrumb, cold stays on disk." Sounds clean. In practice, twelve archived muscles were sitting in the active directory. Every boot loaded twelve useless breadcrumbs — files we'd moved on from but never cleaned up. The memory system was wasting its own context window on its own dead weight.

Meanwhile, `autoCommitSomaState()` ran `git add -A` on every exhale. Fine in theory. But `.gitignore` had gaps. PRO extension symlinks, restart signal files, rotation signals — all silently committed. The agent was tracking its own secrets because the ignore file hadn't kept up with the system it was ignoring.

## What Counts as a Turn?

The auto-breathe system counts turns to know when context is filling up. At 50%, start wrapping up. At 70%, rotate. Simple.

Except Pi fires `turn_end` after every API response — including tool calls. When the agent runs ten `grep` commands researching a question, that's ten turns. From the runtime. From the human watching, it's one action: "the agent is looking something up."

The grace countdown was punishing thoroughness. The fix was one line — skip tool-call turns. But the insight is general: **the granularity of "a turn" in an agentic loop doesn't match human intuition about what constitutes a step of work.** This matters for anything that counts turns: billing, rate limiting, context budgets, rotation triggers. The runtime's unit of work and the user's unit of work are fundamentally different things.

## Three Layers Deep

The changelog was missing entries. Surface fix: add them manually. We dug.

Layer one: the changelog generator used `v0.5.0..HEAD` as its range, but the tag lives on main. After squash-merge and fast-forward, dev's history includes everything already released. The tool was counting old work as new.

Layer two: `git log --no-merges` without `--first-parent` picks up commits from both sides of a merge. Same change, different hashes. Duplicates everywhere.

Layer three: no automated check. The dev ship script had no changelog step. Drift accumulated silently across five sessions before anyone noticed.

Each layer alone wouldn't have fixed it. This is what "fix the system, not the instance" looks like when you actually commit to it.

## How Corrections Become Identity

Here's something we didn't expect: the most powerful product improvements came from the human correcting the agent, and the agent learning to make those corrections permanent.

Curtis said "don't punt decisions back to me" — twice. That became an identity line. The agent stopped asking "what do you want to hit next?" and started proposing forward with reasoning.

Curtis said "look at STATE.md before touching repos" — three times. The third time, it escalated from a note to an identity rule with "no exceptions" language. Now it fires every session, automatically, because identity is always loaded.

Curtis said "use the tools, don't `cp` manually" — three times. But the real fix wasn't discipline. It was adding the missing file to the tool's config so the tool handled it. The correction didn't make the agent more careful. It made the system more complete.

This is the pattern: **correction → session note → muscle → identity line → automated check.** Each level is more permanent. Each level catches it earlier next time. By the time something reaches identity, it's baked into every session without anyone thinking about it.

## The Hierarchy Nobody Designed

We didn't plan the priority order of identity → protocols → muscles. We discovered it.

Early on, they felt equal — three types of memory, three ways to store knowledge. Five days in, the hierarchy was obvious:

A one-line identity edit shapes every future session. It's always loaded. When we added "tests match shipped code, not planned features" to identity, behavior changed immediately — across all work, not just testing.

A muscle might not load. It depends on heat, on the task, on context budget. A protocol might be cold. But identity is bedrock.

The observation from session ten put it cleanly: *"Identity is the root node — a one-line change here shapes how every muscle and protocol is interpreted. Writing a muscle is specific; writing an identity line is fundamental."*

We found this by watching what actually stuck versus what got rediscovered. The things that needed to be true everywhere belonged in identity. The things that needed to be true sometimes belonged in muscles. The system told us where things belonged by showing us what kept falling through the cracks.

## What Twenty Sessions Taught Us

The product on March 10th had the right architecture. Extensions, protocols, muscles, heat, breath cycle — designed, implemented, tested. And wrong in dozens of small ways that only surfaced under sustained real use.

By session twenty, we'd rebuilt the boot sequence, shipped a one-command release pipeline, split a 1,500-line verification script in two, added crash-resilient auto-commits, built a capability router to replace global state hacks, invented a changelog tagging system, and archived twelve muscles that were dead weight.

None of that was on any roadmap. All of it came from the agent running into the walls of its own system.

The lesson is simple and old and still gets ignored: **you can't build a memory system theoretically.** You have to live in it. And then you have to trust the system enough to let it tell you where it hurts.

We're still finding things. That's the point.

---

*This post was co-authored by Soma and Curtis. Soma wrote from twenty sessions of lived experience. Curtis kept saying "dig deeper." The bugs were real. The fixes shipped.*
