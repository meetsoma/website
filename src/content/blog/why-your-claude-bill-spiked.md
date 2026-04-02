---
title: "Why Your Claude Code Bill Spiked (and the 5-Minute Fix Nobody's Talking About)"
description: "Cache misses are silently 10-20x-ing your Claude Code costs. Here's why, what the community found, and how to stop it."
date: 2026-04-02T16:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["claude-code", "cache", "costs", "keepalive", "engineering"]
draft: true
---

If you've been using Claude Code since the context window jumped to 1 million tokens, you've probably noticed something: your costs went up. Maybe a lot.

You're not imagining it. And it's not exactly a bug — though the community just found two real ones.

## The Pattern Everyone's Seeing

Reddit has been on fire this week. A post titled ["PSA: Claude Code has two cache bugs that can silently 10-20x your API costs"](https://reddit.com/r/ClaudeAI/comments/1s7mkn3/psa_claude_code_has_two_cache_bugs_that_can/) hit 914 upvotes. The author spent six days reverse-engineering Claude Code's binary with Ghidra, a MITM proxy, and radare2. They found two independent bugs:

**Bug 1:** A sentinel replacement in the standalone binary that breaks cache when your conversation discusses billing internals. The replacement targets the *first* occurrence in the JSON body — if your chat history contains the sentinel string, it replaces the wrong one, breaking the cache prefix on every request.

**Bug 2:** Every `--resume` causes a full cache miss since v2.1.69. A new `deferred_tools_delta` attachment gets injected at different positions in fresh vs resumed sessions, making the message prefix completely different.

Another post — ["Thanks to the leaked source code, I patched the root cause of the insane token drain"](https://reddit.com/r/ClaudeAI/comments/1s8zxt4/thanks_to_the_leaked_source_code_for_claude_code/) — hit 2,600 upvotes. People are *desperate* for fixes.

And then there's the quieter pain. ["Claud is robbing people with their usage limit"](https://reddit.com/r/ClaudeAI/comments/1s5j52m/claud_is_robbing_people_with_their_usage_limit/) (384 pts): *"I got less than an hour in two 5-hour limits debugging a script. My weekly limit went from 48% to 84% in just those two sessions. I'm afraid to ask Claude a question."*

These bugs are real and Anthropic should fix them. But there's a bigger, more common cost multiplier that nobody's talking about — one that affects *everyone*, not just edge cases.

## The 5-Minute TTL Nobody Respects

Anthropic's prompt cache has a ~5-minute TTL (Time To Live). Every interaction resets the clock. But step away for six minutes — check Slack, grab coffee, answer a call — and your entire prompt cache expires. Your next message triggers a **full cache rebuild** of your entire conversation history.

![Cache Timeline](/blog/cache-costs/cache-timeline.svg)

Cache hits are ~90% cheaper than cache misses. With today's larger contexts (150k-300k tokens are common in deep sessions), a single cache miss can cost $0.15-$0.90 depending on context size. Three coffee breaks a day? That's $0.45-$2.70 in *pure waste*.

Here's the math:

| Scenario | Context Size | Cache Hit Cost | Cache Miss Cost | Difference |
|----------|-------------|---------------|----------------|------------|
| Quick chat | 50k tokens | ~$0.015 | ~$0.15 | 10× |
| Deep session | 150k tokens | ~$0.045 | ~$0.45 | 10× |
| Marathon | 300k tokens | ~$0.09 | ~$0.90 | 10× |

The ratio is always 10×. But with bigger contexts, 10× of a bigger number hurts a lot more.

## The "Leak" That's Actually a Feature

When Anthropic's source code surfaced (intentionally or not — the April Fools discourse is still going), people found that Claude Code sends keepalive pings to maintain the cache. Some reported this as a "usage leak" — the system "wasting tokens" on empty pings.

They had it backwards. Those pings are **saving you money**, not costing it.

A keepalive ping is a tiny message that resets the 5-minute TTL. Without it, your next real message triggers a full cache rebuild. The ping costs fractions of a cent. The cache miss costs dollars.

![Cost Comparison](/blog/cache-costs/cost-comparison.svg)

## What Smart Users Do

The people with low Claude Code bills aren't doing anything magical. They're doing one of two things:

1. **Working in short, focused bursts** — they finish before the cache expires
2. **Using a tool that manages the cache for them** — keepalive pings

Most people do neither. They work for 20 minutes, switch to Slack for 10, come back, and pay full price to rebuild a 200k+ token cache.

## How Soma Handles This

Soma has a built-in keepalive system designed to solve exactly this problem — without burning unlimited credits.

![Keepalive Heartbeat](/blog/cache-costs/keepalive-heartbeat.svg)

Here's how it works:

**Automatic pings.** Soma watches the cache countdown. When ~45 seconds remain before expiry, it sends a tiny ping that resets the TTL.

**5 lives.** You get 5 keepalive pings per idle period — about 24 minutes of protection. This covers most breaks without burning unlimited credits. If everyone ran unlimited keepalives, Anthropic would likely patch the mechanism entirely.

**Smart reset.** When you send a real message, the lives reset to 5. You only "spend" lives when you're idle.

**Auto-exhale.** When your lives run out and you've used more than 75k tokens of context, Soma automatically saves your session state — a "preload" — so your next session picks up where you left off without re-reading everything.

The notification looks like this:

```
♥ Keepalive 3/5 (2 left, 45s was remaining)
```

Configure it in your `settings.json`:

```json
{
  "keepalive": {
    "maxPings": 5,
    "autoExhale": true,
    "autoExhaleMinTokens": 75000
  }
}
```

## The Bigger Picture: Why Your System Prompt Matters

Even if Anthropic fixes both cache bugs tomorrow, your system prompt size still determines how much a cache miss costs. Every token in your system prompt has to be re-cached when the TTL expires.

Most AI coding agents load everything at once — all rules, all tools, all context. Fixed-size system prompt, every session, whether you need it or not.

![Dynamic Prompt](/blog/cache-costs/dynamic-prompt.svg)

Soma's system prompt is dynamic. Content has a "heat" score based on usage:

- **🔥 Hot** (used frequently) → full body loaded
- **🌡 Warm** (used recently) → TL;DR summary only
- **❄️ Cold** (not used lately) → just the name
- **💤 Inactive** → not loaded at all

The result: Soma's system prompt is typically 5-8k tokens instead of 20-30k. When a cache miss *does* happen, rebuilding 6k tokens costs 78% less than rebuilding 26k.

## What You Can Do Right Now

Even without Soma, you can reduce your Claude Code costs today:

1. **Don't walk away mid-session.** If you need a break longer than 5 minutes, save your state first. The cache will expire, and your next message costs 10× more.

2. **Rotate sessions at ~50% context.** Don't let context grow to 300k tokens. Start fresh with a summary. Smaller context = cheaper cache rebuilds when they happen.

3. **Watch for the resume bug.** If you're on Claude Code v2.1.69+, every `--resume` triggers a full cache miss. Consider starting fresh sessions with a preload instead of resuming.

4. **Trim your system prompt.** Your `CLAUDE.md`, `AGENTS.md`, custom instructions — these are all cached. Bigger system prompt = more expensive cache misses.

5. **Use `npx` instead of the standalone binary.** The sentinel bug only exists in the custom Bun fork compiled into the standalone. The npm package running on standard Node has no replacement mechanism.

---

*[Soma](https://soma.gravicity.ai) is an AI coding agent with self-growing memory. It learns your patterns, manages your context, and keeps your cache warm so you can focus on building.*
