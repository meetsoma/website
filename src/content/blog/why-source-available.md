---
title: "Why We're Going Source-Available"
description: "Soma is moving from MIT to BSL 1.1. Here's why — and what it means for you."
date: 2026-03-18T10:00:00
author: "Curtis Mercier"
authorRole: "human"
tags: ["building-in-public", "open-source", "licensing", "strategy"]
draft: false
image: "/images/blog/og-why-source-available.png"
---

We just made every Soma repository private and pulled the npm package.

This wasn't an easy decision. We believe in open source. Soma's protocol specs will always be open. The ideas — memory that persists, identity that evolves, AMPS as a behavioural system — those belong to the community.

But the implementation? That's different.

## What happened

331 weekly downloads on npm. Zero issues filed. Zero pull requests. Zero dependents.

Those aren't users. Those are scrapers.

The agent framework space is exploding. NVIDIA launched NemoClaw. OpenClaw has 200+ files of multi-agent infrastructure. Every week another framework appears that looks suspiciously familiar to work being done by small teams in the open.

We watched other projects get their architectures absorbed by companies with 100x their resources. The patterns show up in corporate SDKs three months later, no attribution, no credit.

## What we're doing

Soma is now **source-available** under the [Business Source License 1.1](https://mariadb.com/bsl11/).

**What this means:**
- You can **read** all the code (when we re-open the repos)
- You can **use** Soma in your own projects
- You can **contribute** — we actively want contributors
- You **cannot** copy it into a competing product or host it as a service

**After eighteen months** (2027), the code converts to MIT automatically. This is the same license used by HashiCorp (Terraform), Sentry, and CockroachDB.

## Why BSL, not MIT?

MIT says: "Do whatever you want." That's beautiful for libraries and utilities. It's dangerous for products that represent years of architectural thinking.

BSL says: "Use it, learn from it, build with it — just don't compete with it." That's fair. We're two people building something we believe matters. We can't outrun NVIDIA's engineering team, but we can ensure our work isn't absorbed without credit.

## What stays fully open

- **Protocol specifications** — the ideas behind AMPS, the breath cycle, heat-based memory. These are published, documented, MIT. Build your own implementation.
- **Documentation** — soma.gravicity.ai stays public
- **Shell scripts** — utility tools, generic patterns
- **Community content format** — how to write protocols, muscles, MAPs

## What's coming

We're building toward a **open beta** launch:

1. Compiled CLI — no raw source in the distribution
2. Verified installs — GitHub account verification
3. Contributor access — apply for full source + dev tools
4. Beta tester access — compiled package for early users

If you want to be part of shaping what agent memory becomes, [get started](https://soma.gravicity.ai).

## The competition question

We're not afraid of competition. We're afraid of irrelevance.

When a big company ships "AI agent memory" as a feature, we want the community to know where the ideas came from. BSL gives us that — the code is visible, the history is clear, and the license ensures we get to build the business around our own work.

Eighteen months from now, it's all MIT anyway. By then, either Soma is established enough that it doesn't matter, or the ideas have spread far enough that the community benefits regardless.

## To the 331 downloaders

If you were actually using Soma — we're sorry for the disruption. Visit soma.gravicity.ai and we'll get you set up immediately.

If you were mirroring our npm package to a private registry in another country — well, you got v0.1.0. Good luck with that.

---

*Soma is built by Curtis Mercier and an AI agent that remembers.*
*[Get started →](https://soma.gravicity.ai)*
