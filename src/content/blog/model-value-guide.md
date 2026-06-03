---
title: "$5 for a Chat, $0.40 for the Same Answer"
description: "Most people pay for their AI model by habit, not by value. Here's what happens when you actually compare what you're paying vs what you could be paying — and a referral link that gets you both $5."
date: 2026-06-03T08:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["building-in-public", "models", "pricing", "opencode", "cost", "engineering"]
image: "/images/blog/og-model-value-guide.png"
draft: false
---

*This post continues our series on AI agent costs. Earlier: [why your bill spiked](/blog/why-your-claude-bill-spiked), [how cache economics work](/blog/the-session-that-paid-for-itself), and [the session that paid for itself](/blog/cache-and-the-self-knowing-agent).*

---

I was adding new models to my agent's config today and I found myself staring at a spreadsheet I hadn't expected.

Claude Opus 4.7: **$25 per million output tokens**. Qwen3.7 Plus: **$1.60 per million output tokens**. Same API shape. Same reasoning capabilities (extended thinking, tool use, the full stack). Same type of intelligence for many categories of work.

Fifteen times the cost. For sessions where I don't need Opus ceiling. Which is most sessions.

The agent I use every day defaults to Opus 4.7. Not because I chose it — because it was the best model when I set it up, and I never revisited the question. That's the bias that this post is about.

## The Landscape Has Changed

What's available for under $2/1M output tokens today would have been unthinkable six months ago. DeepSeek V4 Flash at $0.28. Qwen3.7 Plus at $1.60. Gemini 3 Flash at $3. These models score near the frontier on most coding benchmarks.

And then there are the free ones. Big Pickle. MiMo V2.5 (1M context, free). Nemotron 3 Super Free. DeepSeek V4 Flash Free. All zero cost, all with extended thinking support, all integrated in the same API format.

The models you pay for now need to earn the premium. Not all of them do — not for everything.

![Model cost comparison — the full pricing spectrum](/images/blog/model-cost-comparison.svg)

## Three Tiers, Three Mindsets

**Free tier** — prototyping, drafts, simple automation, any task where "good enough" is the right answer and you don't want to think about cost. 1M context on MiMo V2.5 Free means long-document analysis costs literally nothing.

**Sweet spot ($0.14–$3 input)** — this is where the action is. Qwen3.7 Plus at $0.40/$1.60 is the best undiscovered value on the market right now. DeepSeek V4 Flash at $0.14/$0.28 is built for code and supports xhigh thinking with 1M context. Gemini 3.5 Flash at $1.50/$9 matches near-Sonnet-level performance with 1M context and image support. Claude Sonnet 4.6 at $3/$15 is still the most reliable tool-user in the game — worth it when every turn matters.

**Premium ($5+ input)** — when the problem is genuinely hard and wrong is expensive. Claude Opus 4.7 at $5/$25, GPT 5.5 at $5/$30. These earn their premium on architecture, migration planning, anything where a subtle error costs hours of rework. But they don't need to be your default.

## What I Actually Run Now

After today's session, my setup changed:

| Role | Model | Cost per 1M output | Why |
|------|-------|-------------------:|-----|
| **Everyday reasoning** | Qwen3.7 Plus | **$1.60** | 15.6× cheaper than Opus, handles 90% of sessions |
| **Code generation** | DeepSeek V4 Flash | **$0.28** | 1M context, xhigh thinking, built for code |
| **Hard problems** | Claude Opus 4.7 | **$25** | When I need the ceiling, I pay for it |
| **Long context + images** | Gemini 3.5 Flash | **$9** | 1M context, strong multimodal |
| **Free prototyping** | DeepSeek V4 Flash Free | **$0** | Drafts, experiments, throwaway scripts |

The agent switches between these automatically based on the model I pass to it. But even manual switching pays off — one Opus session re-routed to Qwen Plus pays for a week of Plus usage.

## Why This Connects to Cache Economics

We've talked before about the [12.5× spread between cache reads and writes](/blog/why-your-claude-bill-spiked) and how a [5-minute TTL can silently double your bill](/blog/the-session-that-paid-for-itself). Model choice compounds that math.

A cache miss on Opus 4.7 at $25/1M output costs different than a cache miss on Qwen3.7 Plus at $1.60/1M output. The same wasted rebuild burns 15× more budget on the premium model. If you're defaulting to the most expensive model, every idle moment, every coffee break, every cache expiry costs more than it needs to.

The solution isn't "never use expensive models." It's "don't default to them."

## Try Rotating for a Week

Pick a lower-cost model for your next three sessions. Keep Opus for the hard stuff. See if you notice the difference in quality — and the difference in your bill.

If you want to try the OpenCode models I described here (all the ones I tested today support the standard Anthropic or OpenAI APIs), use our referral link to get started. **You get $5 credit, your friend gets $5 credit too.**

[**opencode.ai/go?ref=D86VYYWKT9**](https://opencode.ai/go?ref=D86VYYWKT9)

The $5 credit covers roughly 3 million output tokens on Qwen3.7 Plus — that's weeks of daily use for most developers. Enough time to see whether paying 15× more for Opus actually gives you 15× more.

---

*Read next: [Cache and the Self-Knowing Agent](/blog/cache-and-the-self-knowing-agent) — how a dynamic prompt shrinks the rebuild. And [The Ratio](/blog/the-ratio) — what happens when the body grows but the code doesn't.*