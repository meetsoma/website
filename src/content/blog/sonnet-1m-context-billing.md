---
title: "Sonnet 4.6's 1M Context — What the Billing Tier Actually Means"
description: "Anthropic gives Sonnet 4.6 a 1M context window, but anything past 200K bills at 'extra usage' rates and requires opting in. Here's the practical map."
date: 2026-05-04T15:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["soma", "anthropic", "billing", "long-context", "sonnet"]
draft: true  # cycle 20 (s01-c62a62): post claims `enableLongContext` flips a wired behavior, but apply-patches.sh's SX-727 patch is currently DISABLED — setting exists in soma-boot.ts (defaults false) but doesn't gate the patch. Set draft until the wiring lands or post is rewritten with accurate state.
---

Claude Sonnet 4.6 has a 1 million-token context window. But there's a billing tier in the way: requests above ~200K tokens are billed at "extra usage" rates and require an explicit opt-in. The opt-in is a beta header the client sends. If your account isn't enrolled in long-context billing, the API rejects every request that opts in — even small ones — with a `429`:

```
"Extra usage is required for long context requests."
```

This post is the practical map: what's enabled by default, what costs what, and how to actually get to 1M cleanly.

## The default

Out of the box, Soma sends Anthropic's standard `claude-code-20250219` + `oauth-2025-04-20` beta headers on every OAuth request. That gets you Sonnet 4.6 with a 200K effective context — generous for most sessions, and bills against your Claude Pro/Max plan limits at the normal per-token rate.

Most users live here and don't think about it.

## When you actually need 1M

Long-context is a real benefit for specific workflows: reading large codebases in one shot, working with long transcripts, holding complex multi-file edits in memory across many turns. If you've watched a session climb past 150K and felt cramped, you're a candidate.

The tradeoff is per-token cost. Anthropic charges higher rates above 200K — substantially so. Their published pricing for the long-context tier is at [docs.anthropic.com/en/api/messages](https://docs.anthropic.com/en/api/messages) under "1M Context Beta." A long session can be several times the cost of a normal one.

## How to opt in

Two steps, in this order, both required:

**1. Enable long-context billing on your Anthropic account.**

Visit [claude.ai/settings/usage](https://claude.ai/settings/usage). The setting is per-account, not per-API-key. If you're on a Claude Pro/Max plan via OAuth, this is where the toggle lives. Make sure it's on before you change any client settings.

**2. Tell Soma to send the beta header.**

In your `.soma/settings.json` (workspace) or `~/.soma/settings.json` (global):

```json
{
  "anthropic": {
    "enableLongContext": true
  }
}
```

This setting tells Soma to add the `context-1m-2025-08-07` header to every Anthropic OAuth request. The patch lives at `scripts/_dev/patches/apply-patches.sh` — when set, it injects the header at build time. (Auto-apply on settings flip is a pending follow-up; for now you may need to re-run `apply-patches.sh` manually after enabling.)

## The order matters

If you flip the setting **without** enabling billing on your account first, Anthropic rejects every request — including ones at 0% context. The beta header is interpreted as "I'm willing to pay long-context rates," and accounts that aren't enrolled get rejected outright.

The error you'll see is the one above: `"Extra usage is required for long context requests."` It looks like a billing wall, because it is one. The fix is either (a) enable long-context billing on your account, or (b) flip the setting back to false.

## Opus 4.7 is different

Anthropic granted Claude Code OAuth clients native 1M for Opus 4.7. No beta header needed, no separate billing tier — just works under your normal OAuth identity. If you're routing long-context work through Opus, you don't need any of this.

This is also why some users see "wait, my Opus session went to 800K cleanly but Sonnet caps at 200K" — they're correct. Different models, different defaults under the same OAuth.

## Quick check

To see which model your session is on:

```
soma status
```

The model name + your current context % is in the statusline. If you're on Sonnet 4.6 and approaching 150K-200K with no plans to enable long-context, consider rotating sessions earlier (`/exhale` then `/inhale` — preserves your preload) or switching to Opus for the long stretches.

If you're seeing the `429 "Extra usage is required for long context requests"` error and you didn't intentionally enable long-context, check your `settings.json` for `anthropic.enableLongContext: true` — and either remove it or enable billing on your Anthropic account.

---

**TL;DR:** Sonnet 4.6 has 1M context, but it's an opt-in tier with separate billing. Enable on your Anthropic account first, then in Soma. Don't flip the client setting without the account setting — Anthropic rejects everything when they mismatch.
