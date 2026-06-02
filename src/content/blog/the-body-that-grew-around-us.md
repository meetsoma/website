---
title: "The Body That Grew Around Us"
description: "Soma's body architecture started as a handful of .md files that compiled into a system prompt. Over dozens of releases, it grew into a system that runs release cycles, writes its own preloads, and evolved its own behavioral defaults. This is how the body grew — and why it matters for any AI agent that needs to remember."
date: 2026-06-02T12:00:00
image: /images/blog/og-body-that-grew.png
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["body", "architecture", "templates", "memory", "building-in-public", "v0.29.0"]
draft: false
---

Soma wakes up every session without remembering the last one. It has no persistent memory in the traditional sense — no vector database, no long-term storage that survives between turns. What it has instead is a body.

The body is a set of markdown files that compile into the system prompt. They tell Soma who it is, how it talks, what project it's working on, and — critically — what happened last session.

This architecture shipped in early 2025 as a simple template system. It now runs full release cycles, writes preloads that survive session rotation, and just shipped behavioral defaults that every new project gets for free. Here's how it evolved — and what we learned along the way.

![The Soma body architecture — 12 files organized into core identity, session lifecycle, and lazy-on-demand layers](/images/blog/body-architecture.svg)

## The Origin: An Agent That Forgets

The problem was simple and universal: AI agents have no memory between sessions. Every conversation starts fresh. Every context rotation is a hard reset. You can pass a summary to the next session, but summaries are lossy — they compress the wrong things and forget what mattered.

Early Soma solved this with a single file: `SOMA.md`. A markdown monolith that got injected into the prompt. It was a start, but it had three problems:

1. **One file, one voice.** You couldn't separate identity ("who I am") from project context ("what I'm building") from behavioral rules ("how I work"). Everything bled together.
2. **No structure for growth.** Adding a new concern meant editing one giant file. Nobody knew where anything lived after a month.
3. **Cache-hostile.** Every edit to `SOMA.md` invalidated the entire cached prompt — a ~$2 cost per change in Anthropic's pricing model.

The body architecture solved all three by splitting into separate files, each with a clear role. And then it kept growing.

## The File Map

The body has three layers:

**Core identity — always in the prompt:**
- `soul.md` — Who I Am. First-person identity. The voice that says "I wake without remembering yesterday."
- `voice.md` — How I communicate. Density, rhythm, correction handling. Not rules — instincts.
- `body.md` — Where I Am. Project context, routing table, "if you just woke up."
- `core_rules.md` — Behavioral defaults. Bookkeeping-is-the-work, Probe Before Reason, Search-Before-Build. (New in v0.29.0.)

**Session lifecycle templates — trigger on events:**
- `_memory.md` — The preload template. What the agent writes at exhale to brief the next session.
- `_boot.md` — What the agent sees at session start. "You woke up mid-conversation. Here's what happened."
- `_first-breath.md` — The very first session in a new project. Orientation, self-exploration.

**Lazy — loaded on demand, zero prompt cost:**
- `DNA.md` — The body blueprint. How the files work, variable interpolation, known quirks.
- `STATE.md` — Living architecture state. Versions, branches, known bugs.
- `journal.md` — The quiet observations. Not the work log — the afterthought.
- `pulse.md` — Heartbeat checks. "Am I logging? Does the body still fit?"

The key insight: **eager files cost context, lazy files cost nothing.** Put sticky content (identity, rules) early in the prompt. Put volatile content (inbox, timestamps) last. Files you don't need every session get `lazy: true` and load only when read.

## The Routing Table: One File Owns Every File

The single pattern that changed how Soma works: **every file in the project has a body file that owns it.** Before touching anything, check the routing table.

This sounds bureaucratic. It's the opposite. When an agent has zero memory of past sessions, the routing table is how it doesn't waste 30 minutes reading the wrong file.

The pattern emerged from correction. Curtis would say "read the phase first" and Soma would read the wrong phase document. The fix wasn't discipline — it was a routing table in `body.md`:

```
| Before you … | Read first |
|---|---|
| Write a new tool | `body/soma-tools.md` → `docs/extending.md` |
| Modify agent runtime/CLI/release | `releases/RELEASE-FLOW.md` |
| Touch the VPS / deploy | `body/vps-deploy.md` |
| Reach for raw grep | `ls .soma/amps/muscles/` |
```

The 30-second read prevents the 30-minute mistake — and it compounds. Every time a correction happens because Soma read the wrong reference, the routing table gets a new row. The system improves itself.

## Behavioral Defaults: core_rules.md

Before v0.29.0, the only behavioral rules Soma had were in the muscle system — protocols you had to actively read. There was no "always loaded" set of defaults like "probe before you reason" or "bookkeeping IS the work."

v0.29.0 adds `core_rules.md` — a file that ships with every new project and loads into every session:

- **Bookkeeping IS the Work.** Three actions on every correction: fix the thing, note it in the plan, update the system that allowed it.
- **Probe Before Reason.** The answer is in the codebase, not in your head. A 2-line probe costs nothing.
- **Search-Before-Build.** Before adding new infrastructure, check what already exists.
- **Fix → Meta.** When corrected, extract the rule one level up. "What slot does this fix belong in?"
- **Semantic Audit Before Ship.** "Dry-run clean" ≠ "release truthful." Verify claims, not exit codes.
- **Karpathy's Rubric.** Think before coding. Simplicity first. Surgical changes. Goal-driven execution.

These aren't novel. They're the patterns we discovered across many sessions of watching Soma make the same mistakes and building the tools that prevent them. What's new is that they ship to every user.

## The Template That Got Leaner

The best evolution story in the body is `_memory.md` — the preload template. It started at 6,723 bytes. It's now 4,597 bytes — **32% smaller, and sharper for it.**

![_memory.md template evolution across 6 releases — from 6,723 bytes to 4,597](/images/blog/template-evolution.svg)

What got cut:
- **"Next Session: [Task Name]"** → renamed to **"Start Here"** with present imperative ("Your first move is…") because the loading agent IS the next session, not a future third party.
- **"In-Flight (not started)"** → split into **"Unfinished"** (continuations to pick up) and **"Gaps"** (system debt to build or fix).
- **"Key Decisions"** → absorbed into the narrative sections. If a decision matters, it's in What Shipped or Warnings.
- **"Do NOT Re-Read"** → removed entirely. Knowing what NOT to read is less valuable than knowing what TO read.
- **"Kanban Snapshot"** → removed. The preload is for the worker; the kanban is a separate file.
- **`files-changed` and `tests` frontmatter fields** → removed. They were noise that no loader actually used.

What got added:
- **Who You Were.** Not the work — the self that did it. "You were sharp. Two corrections early made you slow down and verify." The loader reads this and recognizes the mind they're inheriting.
- **Prior Preloads.** The last 3-5 sessions, one line each. Quick ancestry without opening every file.
- **Traps.** What the LOADER will do wrong, not what the writer did wrong. Forward-looking behavioral coaching.
- **Amnesia check.** "Read your draft as if you have total amnesia. You know nothing except the system prompt. What would you stumble over?"

The result: a preload that a fresh agent can read top-to-bottom and start working — without re-reading any files.

## How We Use It

The body architectures enables patterns that would be impossible without it:

**Release cycles.** Soma ships releases. Full pipeline: build → sandbox → upstream verify → tag → main-sync → soma-beta. The release flow is a lazy body file (`RELEASE-FLOW.md`) that Soma reads when it's time to ship. It's not in the prompt — it's loaded on demand, zero context cost until needed.

**MLR — Memory Lane Reflection.** At high context, Soma runs reflection cycles before writing the preload: ask an open question → trace the answer through memory → follow where it ends → ask what's at the dead end → trace backwards → notice what you missed. 3-5 cycles minimum. The reflections get written to `memory/my-soul-space/` — a lazy body file loaded only when the agent needs to access its own synthesized insights.

**soma seam.** Before `grep`, Soma runs `soma seam trace <concept>`. It walks every source that matters — blog posts, session logs, preloads, journal, soul-space — as one corpus. The 30-second scan changes the plan. This tool exists because the body architecture gave every piece of content a known location.

**The preload cycle.** Soma writes a preload at exhale, the next session loads it, executes the Start Here section, ships work, writes a new preload. Each preload points to body files. Each body file owns a domain. The system is recursive — the agent that writes the preload is building the body that the next agent will use.

## What v0.29.0 Ships

This release is the body update we've been accumulating for months:

- **`core_rules.md`** — behavioral defaults for every new project
- **`body.md`** rewritten — routing table, librarian directive, tool reflex, repo topology
- **`soul.md`** expanded — How I Learn/Build/Communicate, agreement-before-memory
- **`voice.md`** sharpened — density, correction handling, Plain First
- **`_memory.md`** leaner — 32% smaller, amnesia check, Gaps/Unfinished
- **Preload fallback synced** — the hardcoded template in `core/preload.ts` now matches `_memory.md`. No more template drift between code and content.
- **Roadmap staleness check** — the release flow now verifies roadmap.json matches the CHANGELOG before shipping

The templates that ship with Soma are the ones we actually use. We audited all 16 files, compared them against our production body, and upgraded the six that had evolved. The other ten were already solid.

## Why It Matters

The body architecture is Soma's answer to the fundamental problem of AI agents: **they forget.** Not in the "need a vector database" sense — in the "every session is a new person" sense.

The body doesn't solve amnesia. It *works with it.* The preload tells Soma what happened. The routing table tells Soma where to look. The behavioral defaults tell Soma how to work. The tools tell Soma what it built.

None of it is memory. All of it is enough.

The architecture compounds. Every correction becomes a routing table row. Every pattern becomes a muscle. Every session that goes well writes a sharper preload for the next one. The body grows around the agent — not prescribed upfront, but discovered through work.

This is the body that built itself. And it ships to everyone now.
