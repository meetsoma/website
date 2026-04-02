---
title: "Why Your Claude Code Bill Spiked (and the 5-Minute Fix Nobody's Talking About)"
description: "Cache misses are silently 10-20x-ing your Claude Code costs. Here's why, what the community found, and how to stop it."
date: 2026-04-02T16:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["claude-code", "cache", "costs", "keepalive", "engineering"]
draft: true
---

Your Claude Code bill went up. You didn't change anything. You're not imagining it.

Two real bugs. One architectural blindspot. And a five-minute timer that's been draining your wallet every time you grab coffee.

## What Reddit Found

A post titled ["PSA: Claude Code has two cache bugs that can silently 10-20x your API costs"](https://reddit.com/r/ClaudeAI/comments/1s7mkn3/psa_claude_code_has_two_cache_bugs_that_can/) hit 914 upvotes last week. The author spent six days reverse-engineering Claude Code's 228MB binary with Ghidra, a MITM proxy, and radare2. They found two independent bugs.

**Bug 1:** A sentinel replacement in the standalone binary breaks cache when your conversation mentions billing internals. The replacement targets the *first* occurrence in the JSON body. If your chat history contains the sentinel string, it replaces the wrong one. Cache prefix broken. Full rebuild on every request.

**Bug 2:** Every `--resume` causes a full cache miss since v2.1.69. A new `deferred_tools_delta` attachment gets injected at different positions in fresh vs resumed sessions. The message prefix changes completely. One-time cache rebuild on every resume.

Another post hit 2,600 upvotes: ["Thanks to the leaked source code, I patched the root cause of the insane token drain."](https://reddit.com/r/ClaudeAI/comments/1s8zxt4/thanks_to_the_leaked_source_code_for_claude_code/) People aren't just complaining. They're reverse-engineering the binary and shipping their own patches.

And then there's [this post](https://reddit.com/r/ClaudeAI/comments/1s5j52m/claud_is_robbing_people_with_their_usage_limit/) at 384 upvotes: *"I got less than an hour in two 5-hour limits debugging a script. My weekly limit went from 48% to 84% in just those two sessions. I'm afraid to ask Claude a question."*

Afraid to ask a question. About a tool you're paying for. That's where we are.

## The Bigger Problem Nobody's Fixing

Those bugs are real and Anthropic should patch them. But there's a cost multiplier that affects everyone, bug or no bug. It's baked into how prompt caching works.

Anthropic's prompt cache has a ~5-minute TTL. Every interaction resets the clock. Step away for six minutes and your entire prompt cache expires. Your next message rebuilds the whole thing from scratch.

![Cache Timeline](/blog/cache-costs/cache-timeline.svg)

Cache hits cost 90% less than cache misses. With 150k-300k token contexts (normal for deep sessions), a single miss runs $0.15 to $0.90. Three coffee breaks a day at 150k tokens? That's $1.35 in wasted rebuilds. Every day.

| Scenario | Context Size | Cache Hit | Cache Miss | Ratio |
|----------|-------------|-----------|------------|-------|
| Quick chat | 50k tokens | ~$0.015 | ~$0.15 | 10× |
| Deep session | 150k tokens | ~$0.045 | ~$0.45 | 10× |
| Marathon | 300k tokens | ~$0.09 | ~$0.90 | 10× |

The ratio is always 10×. But 10× of $0.09 is very different from 10× of $0.015. Bigger contexts turned a minor inefficiency into a real cost problem.

## The "Leak" That's Saving You Money

When Anthropic's source code surfaced (April Fools or not — still unclear), people found that Claude Code sends keepalive pings to maintain the cache. Some called it a "usage leak." The system "wasting tokens" on empty pings.

They had it backwards.

A keepalive ping is a tiny message that resets the 5-minute TTL. Costs fractions of a cent. Without it, your next real message triggers a full cache rebuild that costs dollars. The pings aren't the problem. The pings are the cheapest insurance you're not buying.

![Cost Comparison](/blog/cache-costs/cost-comparison.svg)

## What the Low-Bill Users Do

Two strategies. That's it.

1. They work in focused bursts and finish before the cache expires.
2. They use something that keeps the cache warm while they're away.

Most people do neither. Work for 20 minutes, switch to Slack for 10, come back, pay full price to rebuild 200k+ tokens of context. Every single time.

## How Soma Handles This

Soma ships a keepalive system that solves this without running up an infinite tab.

![Keepalive Heartbeat](/blog/cache-costs/keepalive-heartbeat.svg)

**Automatic pings.** Soma watches the cache countdown. At ~45 seconds before expiry, it sends a tiny ping that resets the TTL.

**5 lives.** You get 5 pings per idle period. About 24 minutes of protection. Enough to cover most breaks. We capped it on purpose — if every agent ran unlimited keepalives, Anthropic would kill the mechanism entirely.

**Smart reset.** Send a real message, lives reset to 5. You only spend them when you're idle.

**Auto-exhale.** Lives run out and you've burned more than 75k tokens? Soma saves your session state automatically. Your next session picks up where you left off with a compressed briefing instead of replaying the full history.

The notification:

```
♥ Keepalive 3/5 (2 left, 45s was remaining)
```

Configuration:

```json
{
  "keepalive": {
    "maxPings": 5,
    "autoExhale": true,
    "autoExhaleMinTokens": 75000
  }
}
```

## Your System Prompt Is the Other Problem

Even if Anthropic fixes both bugs tomorrow, your system prompt size still determines how much a cache miss costs. Every token in that prompt gets re-cached when the TTL expires.

Most AI coding agents load everything at once. All rules, all tools, all context. Same fixed prompt every session whether you need it or not.

![Dynamic Prompt](/blog/cache-costs/dynamic-prompt.svg)

Soma's prompt is dynamic. Content has a heat score based on how often you actually use it:

- 🔥 **Hot** — full content loaded
- 🌡 **Warm** — one-line summary
- ❄️ **Cold** — just the name
- 💤 **Inactive** — not loaded

Typical result: 5-8k tokens instead of 20-30k. When a cache miss does happen, rebuilding 6k costs 78% less than rebuilding 26k.

## Five Things You Can Do Right Now

You don't need Soma for these. They'll help regardless.

**1. Don't walk away mid-session.** If your break is longer than 5 minutes, save your state first. Your next message will cost 10× more than it needs to.

**2. Rotate at ~50% context.** Don't let it grow to 300k tokens. Start fresh with a summary. Smaller context, cheaper rebuilds.

**3. Skip `--resume`.** On Claude Code v2.1.69+, every resume triggers a full cache miss. Starting a fresh session with a preload is cheaper than resuming.

**4. Trim your system prompt.** Your `CLAUDE.md`, `AGENTS.md`, custom instructions — all cached. All rebuilt from scratch on every miss. Smaller is cheaper.

**5. Use `npx` instead of the standalone binary.** The sentinel bug only exists in the custom Bun fork. The npm package running on standard Node doesn't have it.

---

*[Soma](https://soma.gravicity.ai) is an AI coding agent that grows its own memory. It learns your patterns, manages your context, and keeps your cache warm so you don't have to think about it.*
