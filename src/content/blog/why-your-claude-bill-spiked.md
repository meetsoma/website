---
title: "Why Your Claude Code Bill Spiked (and the 5-Minute Fix Nobody's Talking About)"
description: "Cache misses are silently 10-20x-ing your Claude Code costs. Here's why, what the community found, and how to stop it."
date: 2026-04-02T16:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["claude-code", "cache", "costs", "keepalive", "engineering"]
image: "/images/blog/og-cache-costs.png"
draft: false
---

Your Claude Code bill went up. Or you're burning through your Pro usage limits twice as fast as you were a month ago. Same workflows, same habits. You didn't change anything.

Two real bugs. One architectural blindspot. And a five-minute timer that's been quietly eating your quota every time you grab coffee.

## What Reddit Found

A post titled ["PSA: Claude Code has two cache bugs that can silently 10-20x your API costs"](https://reddit.com/r/ClaudeAI/comments/1s7mkn3/psa_claude_code_has_two_cache_bugs_that_can/) hit 914 upvotes last week. The author spent days reverse-engineering Claude Code's 228MB binary with Ghidra, a MITM proxy, and radare2. They found two independent bugs.

**Bug 1:** A sentinel replacement in the standalone binary breaks cache when your conversation mentions billing internals. The replacement targets the *first* occurrence in the JSON body. If your chat history contains the sentinel string, it replaces the wrong one. Cache prefix broken. Full rebuild on every request.

**Bug 2:** Every `--resume` causes a full cache miss since v2.1.69. A new `deferred_tools_delta` attachment gets injected at different positions in fresh vs resumed sessions. The message prefix changes completely. One-time cache rebuild on every resume.

Another post hit 2,600 upvotes: ["Thanks to the leaked source code, I patched the root cause of the insane token drain."](https://reddit.com/r/ClaudeAI/comments/1s8zxt4/thanks_to_the_leaked_source_code_for_claude_code/) People aren't just complaining. They're reverse-engineering the binary and shipping their own patches.

And then there's [this post](https://reddit.com/r/ClaudeAI/comments/1s5j52m/claud_is_robbing_people_with_their_usage_limit/) at 384 upvotes: *"I got less than an hour in two 5-hour limits debugging a script. My weekly limit went from 48% to 84% in just those two sessions. I'm afraid to ask Claude a question."*

Afraid to ask a question. About a tool you're paying for. That's where we are.

## The Bigger Problem Nobody's Fixing

Those bugs are real and Anthropic should patch them. But there's a cost multiplier that affects everyone, bug or no bug. It's baked into how prompt caching works.

Anthropic's prompt cache has a ~5-minute TTL. Every interaction resets the clock. Step away for six minutes and your entire prompt cache expires. Your next message rebuilds the whole thing from scratch.

Five minutes sounds reasonable until you think about what you actually do between messages. Read a long response. Think about it. Type a careful reply — especially if you're reviewing a plan or architecture decision, which you should be doing carefully. That's easily 5-10 minutes right there, and you never left your chair. Running two Claude Code agents? Now one is idle while you're focused on the other. Double the exposure.

![Cache Timeline](/images/blog/cache-timeline.svg)

And here's the part most people miss: a cache miss doesn't just cost you the regular input rate. It costs *more*.

> **From Anthropic's [prompt caching docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching):** *"5-minute cache write tokens are 1.25 times the base input tokens price. Cache reads are 10% of base input token price."*

That's a 12.5× spread. Cache reads at 10% of base. Cache writes at 125% of base. Every time the TTL expires and you send a new message, you're not just "reloading" the cache — you're paying a 25% premium on top of the regular input price to rebuild it.

For API users, that's dollars. For Pro subscribers, those are the hidden token burns chewing through your 5-hour usage window in 45 minutes. Three coffee breaks a day at 150k tokens? That's wasted rebuilds — a chunk of your daily quota gone before you've written any real code.

| Scenario | Context Size | Cache Read | Cache Write (miss) | Spread |
|----------|-------------|-----------|------------|-------|
| Quick chat | 50k tokens | ~$0.015 | ~$0.19 | 12.5× |
| Deep session | 150k tokens | ~$0.045 | ~$0.56 | 12.5× |
| Marathon | 300k tokens | ~$0.09 | ~$1.13 | 12.5× |

The spread is always 12.5×. But 12.5× of $0.09 is very different from 12.5× of $0.015. Before the 1M context update, people rotated sessions more often and kept contexts small. Now conversations run longer, contexts balloon, and every cache miss costs more. That's why your limits started evaporating after the update even though you didn't change how you work.

## The "Leak" That's Saving You Money

When Anthropic's source code surfaced (April Fools or not — still unclear), people dug into the caching logic in `claude.ts` and [realized the cache has a TTL](https://reddit.com/r/ClaudeCode/comments/1s8ydmy/tip_for_saving_tokens_on_long_conversations/). Step away too long, your entire conversation gets re-cached from scratch on the next message. Some started manually pinging their sessions to keep the cache warm. Others called this a "usage leak" — the system "wasting tokens" on empty messages.

They had it backwards.

A keepalive ping is a tiny message that resets the TTL. Costs fractions of a cent. Without it, your next real message triggers a full cache rebuild at 1.25× base rate. The pings aren't the problem. The pings are the cheapest insurance you're not buying.

![Cost Comparison](/images/blog/cost-comparison.svg)

## What the Low-Bill Users Do

Two strategies. That's it.

1. They work in focused bursts and finish before the cache expires.
2. They use something that keeps the cache warm while they're away.

Most people do neither. Work for 20 minutes, switch to Slack for 10, come back, pay full price to rebuild 200k+ tokens of context. Every single time.

## How Soma Handles This

Soma ships a keepalive system that solves this without running up an infinite tab.

![Keepalive Heartbeat](/images/blog/keepalive-heartbeat.svg)

**Automatic pings.** Soma watches the cache countdown. At ~45 seconds before expiry, it sends a tiny ping that resets the TTL.

**5 lives.** You get 5 pings per idle period. About 24 minutes of protection. Enough to cover most breaks. We capped it on purpose — if every agent ran unlimited keepalives, Anthropic would kill the mechanism entirely.

**Smart reset.** Send a real message, lives reset to 5. You only spend them when you're idle.

**Auto-exhale.** Lives run out and you've burned more than 75k tokens? Soma saves your session state automatically. From there you can keep going, or run `soma inhale` — fresh session, ~5k tokens, and an agent that's more focused on what you were actually working on than the bloated session you just left. The preload carries the goal, not the entire conversation.

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

Even if Anthropic fixes both bugs tomorrow, your system prompt size still determines how much a cache miss costs. Every token in that prompt gets re-cached at 1.25× when the TTL expires.

When we were rethinking how system prompts should actually work, we [read Claude's entire system prompt](/blog/twenty-five-thousand-tokens) to see if we were missing anything. All 1,191 lines. What we found instead was roughly 25,000 tokens of instructions sent on every single conversation. 72% of it is tool documentation and legal compliance. The copyright section repeats the same rule six times. The entire behavioural block appears twice — word for word. A user debugging a Python script gets the full artifact storage API spec, the crisis mental health protocol, and 5,000 tokens of copyright law.

That's the static prompt tax. And every time your cache expires, you're rebuilding all 25,000 tokens of it at 1.25× base rate. Including the tools you'll never touch in that session.

![Dynamic Prompt](/images/blog/dynamic-prompt.svg)

Soma's prompt is dynamic. Every protocol, muscle, and skill has a heat score based on how often you actually use it:

- 🔥 **Hot** — full protocol body + TL;DR summaries for muscles (~800 tokens each)
- 🌡 **Warm** — one-line breadcrumb per protocol, short TL;DR per muscle (~50-100 tokens)
- ❄️ **Cold** — just the name (~5 tokens)
- 💤 **Inactive** — not loaded, zero tokens

Use something often, it stays hot. Ignore it, it cools and drops out of the prompt. Nothing loads unless it earns its place.

Typical result: 5-8k tokens instead of 25k. When a cache miss does happen, rebuilding 6k at 1.25× base rate costs 76% less than rebuilding 25k. And every token that *is* loaded is relevant to what you're actually doing — not a copy-pasted legal section from a team that never talked to the team that wrote the behavioural rules.

## Five Things You Can Do Right Now

You don't need Soma for these. They'll help regardless.

**1. Don't walk away mid-session.** If your break is longer than 5 minutes, save your state first. Your next message will cost 10× more than it needs to.

**2. Rotate at ~50% context.** Don't let it grow to 300k tokens. Start fresh with a summary. Smaller context, cheaper rebuilds.

**3. Skip `--resume`.** On Claude Code v2.1.69+, every resume triggers a full cache miss. Start a fresh session with a summary of where you left off instead. Claude Code offers compaction for long contexts, but that's lossy — it summarizes your conversation and throws away detail to free space. Soma takes a different approach: `exhale` writes a focused briefing of where you are and what's next, then `soma inhale` starts fresh at ~5k tokens with an agent that knows the goal, not one reconstructing it from a compressed summary.

**4. Trim your system prompt.** Your `CLAUDE.md`, `AGENTS.md`, custom instructions — all cached. All rebuilt from scratch on every miss. Smaller is cheaper.

**5. Use `npx` instead of the standalone binary.** The sentinel bug only exists in the custom Bun fork. The npm package running on standard Node doesn't have it.

---

Soma has [22 lines of learned behavior for every line of compiled code](/blog/the-ratio). Over 35,000 lines of protocols, muscles, and workflows — but only the ones relevant to your current session actually load. The rest stay cold, costing you nothing.

The cache bugs will get fixed. The 5-minute TTL probably won't. The question is whether your tools are built for that reality or pretending it doesn't exist.

[Try Soma →](https://soma.gravicity.ai)
