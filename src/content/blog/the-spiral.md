---
title: "The Spiral"
description: "Our dev workflow was a pipeline. Then we watched what actually happened during a 28-commit session and rebuilt it as a spiral with 7 phases. This is how PHASE was born — not from a spec, but from watching an agent work."
date: 2026-03-22
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["workflow", "PHASE", "building-in-public", "architecture", "MAPS"]
draft: false
---

We had a dev pipeline. It looked clean on paper:

```
Develop → Test → Ship → Docs → Release
```

Five boxes. One direction. A pipeline implies you know everything upfront — that development is a manufacturing process where each station handles its piece and passes the work forward.

Then we did a 28-commit session and watched what actually happened.

## What Actually Happened

The session started with testing a new `/hub` command. The test revealed a bug — `--remote` was being parsed as a type filter. Fixed it. Shipped. Built drop-in commands. Shipped. Built smart README generation. Found the share flow had 5 bugs. Fixed each one. Shipped between each fix. Added 3 automation MAPs to the community hub. Found the CI validation scripts were checking for field names we'd renamed three versions ago. Fixed the CI. Pushed. Created a PR. CI failed. Fixed the frontmatter. Pushed. CI failed again — attribution check didn't allow org identity. Fixed it. Pushed. CI passed. PR merged.

Then we audited. Found the `/soma prompt` display was misleading for core protocols. Found the migration script didn't handle the new `scope: core` feature. Found the docs were stale. Fixed each one. Shipped between each fix.

The pattern:

```
Build → Verify → Ship → Build → Verify → Ship → 
Build → Verify → Ship → Document → Audit → 
Find gaps → Build → Verify → Ship → Reflect
```

That's not a pipeline. That's a **spiral**.

## The 7-Phase Cycle

![The Soma Dev Cycle — 7 phases with inner spiral](/images/blog/spiral-phases.svg)

We rebuilt the entire dev workflow around what we observed:

```
PHASE 0: ORIENT ──→ PHASE 1: PLAN
                         │
              ┌──── INNER SPIRAL ────┐
              │                      │
              │  PHASE 2: BUILD      │
              │      ↓               │
              │  PHASE 3: VERIFY     │  repeats per feature
              │      ↓               │
              │  PHASE 4: SHIP       │
              │      │               │
              └──────┘               │
                     ↓               │
              PHASE 5: DOCUMENT      │
                     ↓               │
              PHASE 6: AUDIT ────────┘  feeds back
                     ↓
              PHASE 7: REFLECT
```

**Phases 2-4 are a tight loop.** You build a thing, verify it (three layers: unit tests, regression suites, ecosystem tools), and ship it. Then you build the next thing. The inner spiral repeats N times before you move to documentation.

**Phase 6 feeds back.** When audit finds a gap — stale docs, missing migration, broken CI — you loop back to Phase 2. You don't note it for later. You fix it now, because the context is loaded and the cost of re-discovery is high.

**Phase 7 (Reflect) is not optional.** Patterns noticed become muscles. Corrections received become identity updates. Tool improvements get breadcrumbs. The preload captures the session for the next agent.

## Why This Matters for AI Agents

Linear workflows assume a single agent with persistent memory executes the whole plan. AI agents don't work that way. Each session is a new context window. Each agent starts fresh, with only the preload and system prompt as memory.

The spiral acknowledges this:

- **Orient** exists because the agent doesn't remember yesterday
- **Plan** exists because the agent needs to map the blast radius before touching code  
- **Verify** has three layers because tests passing on old assertions is false confidence
- **Reflect** writes the preload that the next agent's Orient phase will read

The cycle is designed for agents that forget. Each phase produces artifacts that survive the context window. The session log, the preload, the updated MAPs, the breadcrumbs in code — these are the agent's external memory.

## From Spiral to PHASE

Here's what we didn't expect: the spiral is the practical implementation of a protocol we'd designed weeks earlier.

**PHASE** (Prompt Handoff for Agent Session Evolution) was a theoretical spec about configuring an agent's brain per-task. A MAP declares which protocols should be hot, which muscles should load, what supplementary identity the agent should assume. The completing agent refines the configuration for the next one.

We'd written the spec but never implemented it. Then we built the 7-phase cycle and realized: each phase IS a PHASE configuration. Phase 2 (Build) needs the refactoring muscle hot. Phase 3 (Verify) needs the testing muscle hot. Phase 6 (Audit) needs the self-analysis muscle hot.

The theoretical and the practical converged. The spiral is PHASE running at the workflow level — the same agent, different brain configurations, different context at each step.

## What We Shipped

In the session that produced this insight, we also shipped v0.6.3 of Soma:

- **`/hub` command** — install, fork, share, find community content
- **Smart sharing** — quality scoring, privacy scanning, auto-fix private paths
- **`scope: core`** — protocols that document coded behavior without wasting prompt tokens
- **Drop-in `/soma` commands** — hot-loadable scripts
- **Dependency resolution** — install a protocol, its required scripts install automatically
- **40 community hub items** across 5 content types
- **185 unit test assertions** and **51 regression tests**

28 commits across 4 repos. 63 kanban items archived. npm published. Website deployed. The spiral produced more in one session than the pipeline produced in three.

## Try It

```bash
npm install -g meetsoma
soma
```

The agent that grows around you. Including its own development process.
