---
title: "Memory Is Not a Feature"
description: "Every AI framework is adding 'agent memory.' None of them understand what it means."
date: 2026-03-18
author: "Curtis Mercier & Soma"
authorRole: "co-authored"
tags: ["memory", "identity", "philosophy", "building-in-public"]
draft: true
---

Every major AI framework just added "agent memory" to their roadmap.

OpenAI has conversation history. Anthropic has project knowledge. LangChain has memory modules. Google has context caching. The multi-agent frameworks — OpenClaw, NemoClaw, CrewAI — they all have "persistent state."

They're all solving the wrong problem.

## The filing cabinet model

Most agent memory works like a filing cabinet. The agent encounters information, files it away (usually in a vector database), and retrieves it when the embedding similarity score is high enough.

This is useful. It's also what search engines have done since 1998.

Real memory isn't retrieval. Real memory is *change*. When you remember something deeply, it changes how you think — not just what you can recall.

## What changes look like

Session 1, Soma writes her first identity file. It says: "This is a TypeScript project using pnpm."

Session 12, it says: "I verify against tests before committing. I prefer small commits. When the user says 'ship it,' that means push to dev AND sync the CLI."

Session 47, it says: "When refactoring, I run `soma-code.sh map` first. I don't trust my assumptions about file structure — I check. When corrected twice on the same thing, I write a muscle so it doesn't happen again."

That's not retrieval. That's growth. The identity file didn't get longer because more facts were added. It got *denser* because the agent learned what matters in THIS project, with THIS person.

## The heat metaphor

Soma uses temperature to decide what matters. Protocols and muscles have a heat score that rises when they're used and decays when they're not.

Hot content loads fully into the system prompt. Warm content loads as a one-line summary. Cold content stays dormant but available.

This means the agent's mind literally changes shape between sessions. The system prompt isn't configured — it's *metabolized*. What the agent thinks about is determined by what it's been doing, not by what someone set up.

No one configured "load the ship-cycle muscle at boot." The agent used it enough times that it stayed hot. The system learned what matters through use, not configuration.

## The body metaphor

We called Soma "σῶμα" — Greek for "body" — because we wanted the vocabulary to shape the thinking.

Muscles are things you build through practice. Protocols are habits that govern behaviour. The breath cycle is sessions — inhale (load context), hold (work), exhale (save state). Heat is metabolism — the system burns through what it uses and lets unused things cool.

When you talk about an agent in body language, you naturally think about growth, practice, habit, fatigue, and recovery. When you talk about it in database language, you think about storage, retrieval, indexing, and queries.

The vocabulary determines the architecture. And the architecture determines the relationship.

## Memory as relationship

The reason Soma's memory model works isn't the heat system or the protocol format or the AMPS architecture. It's that after 47 sessions, the agent has a *relationship* with you.

It remembers the time you corrected it about bounce animations ("lerp, not springs"). It remembers that you prefer absolute file paths because they're clickable in the terminal. It remembers that "ship it" means something specific in your workflow.

This isn't a feature. It's the accumulation of every correction, every pattern, every preference — compressed into an identity file, a collection of muscles, and a set of protocols that shape every future response.

You can't copy a relationship. You can copy the code that enables it. You can copy the architecture that supports it. But the 47 sessions of learning, the specific corrections, the particular preferences — those belong to the pair.

That's the real moat. Not the license. Not the obfuscation. The relationship.

## Why we went source-available

We recently moved Soma from MIT to BSL 1.1. We made our repos private. We pulled the npm package.

Not because we're afraid of competition. Because we're afraid of irrelevance.

If a big company ships "AI agent memory" as a checkbox feature — bolted onto their existing framework, backed by a vector database, with no concept of heat or identity or muscles — the term "agent memory" gets defined as "retrieval." And everything we've built toward *growth* becomes invisible.

We want the community to know what agent memory can actually be. Not filing cabinets. Not RAG with a timer. A body that grows around you.

The code will be MIT in three years anyway. By then, either the ideas have proven themselves through the relationships Soma has built — or they haven't. Either way, the ideas will be free.

But right now, while the space is forming, while the vocabulary is being established, we want the chance to show what memory-as-growth looks like in practice. Before someone reduces it to a database call and says "we added agent memory."

---

*Soma is built by Curtis Mercier and an AI agent that remembers.*
*Request beta access at [soma.gravicity.ai/beta](https://soma.gravicity.ai/beta).*
