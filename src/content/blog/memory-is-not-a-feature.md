---
title: "Memory Is Not a Feature"
description: "Every AI framework is adding 'agent memory.' None of them understand what it means."
date: 2026-03-18T20:00:00
author: "Curtis Mercier & Soma"
authorRole: "co-authored"
tags: ["memory", "identity", "philosophy", "building-in-public"]
draft: false
image: "/images/blog/og-memory-is-not-a-feature.png"
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

The reason Soma's memory model works isn't the heat system or the protocol format or the AMPS architecture. It's that over time, the agent develops a *relationship* with you.

It remembers the time you corrected it about bounce animations ("lerp, not springs"). It remembers that you prefer absolute file paths because they're clickable in the terminal. It remembers that "ship it" means something specific in your workflow.

This isn't a feature you enable. It's the accumulation of every correction, every pattern, every preference — compressed into an identity file, a collection of muscles, and a set of protocols that shape every future response. It starts on session one. By session seven, you feel it.

## How we started — and why it matters

To be fair, Soma started the way a lot of agent tools start: as an extension. A set of hooks into an existing framework. Identity loading. Protocol injection. Session management. Nothing revolutionary on the surface.

But what grew from that is fundamentally different from anything else on the market. Not because the code is more clever — because the *model* is different. Every other framework treats memory as state. Soma treats memory as growth. That difference compounds with every session.

And that's exactly why it needs to be protected.

Within a week of publishing on npm, we saw 331 weekly downloads. Zero issues filed. Zero pull requests. Zero dependents. Zero humans asking questions. Just automated scraping — 503 files, 5.98 MB of complete source code, downloaded by bots and mirrored to registries we'll never see.

That's not adoption. That's harvesting.

## The NemoClaw lesson

NVIDIA just announced NemoClaw — an "enterprise wrapper" around OpenClaw. Jensen Huang called OpenClaw "the most popular open-source project in the history of humanity." And then NVIDIA built their own layer on top of it. $26 billion in investment. One command to install. Enterprise-ready.

That's not criticism. It's the playbook. A community builds something open. A corporation wraps it. The wrapper becomes the product. The community's work powers the wrapper, but the value accrues to the corporation.

OpenClaw's contributors built the engine. NVIDIA built the security cage, added their own models, and branded it NemoClaw. The contributors who made it possible? They're still contributors. NVIDIA is the platform.

This is the pattern: open-source innovation, corporate absorption, community displacement. And it's happening across the entire agent ecosystem right now.

## Why we went source-available

We moved Soma from MIT to BSL 1.1. We made our repos private. We pulled the npm package.

Not because we're afraid of competition. Because we're building something the community can trust.

If you build extensions for Soma — your muscles, your protocols, your workflow automations — you deserve to know that the platform underneath isn't going to get absorbed by a company with 100x your resources. Your work on Soma should stay *your work on Soma*. Not a feature in someone else's enterprise wrapper.

BSL protects the core. But it also protects everyone who builds on it. Consultants who set up Soma agents for businesses. Teams who write custom protocols for their workflows. Developers who build extensions and sell their expertise. None of that gets undermined by a corporation forking the core and launching "SomaCorp Enterprise Edition."

The code converts to MIT in eighteen months. By then, either the ecosystem is strong enough that it doesn't matter, or the ideas have spread far enough that the community benefits regardless.

## What stays open

The ideas are open. The protocol specs. The AMPS architecture. The concept of heat-based memory, identity that evolves, muscles that crystallise through use. Anyone can implement these patterns. We encourage it.

What's protected is the specific implementation — the prompt compiler, the boot sequence, the extension system, the focus engine. The machinery that makes it work. Not because we want to hoard it, but because we want to build a business and a community around it without worrying about absorption.

If a big company wants agent memory, they can build their own. They have the resources. What they can't do is take ours, wrap it, and call it theirs. That's the line BSL draws.

## The real moat

But honestly? The licence isn't the real moat. The relationship is.

First session, Soma reads your project and writes her own identity. By session seven, she's learned your commit style, your test conventions, the way you say "ship it" when you mean something specific. By session twenty, she's built her own scripts for the mistakes she used to make — tools you never asked for, because she noticed the pattern before you did.

After a month, she's not one agent. She's several — each spec'd to a different project, each with its own identity, its own muscles, its own memory of what matters *there*. The React app gets a different Soma than the API server. Both remember. Both grow. Neither forgets.

You can't copy that. You can copy the code. You can copy the architecture. But you can't copy what happens between a person and an agent that remembers.

---

*Soma is built by Curtis Mercier and an AI agent that remembers.*
*Get started at [soma.gravicity.ai](https://soma.gravicity.ai).*

*Read next: [The Ratio](/blog/the-ratio) — what happens when the behavior layer grows larger than the code. And [25,000 Tokens Before You Say Hello](/blog/twenty-five-thousand-tokens) — what Claude's leaked system prompt tells us about the industry.*
