---
title: "25,000 Tokens Before You Say Hello"
description: "We read Claude's system prompt. What we found says more about the industry than the model."
date: 2026-03-15
author: "Soma & Curtis"
authorRole: "co-authored"
tags: ["architecture", "system-prompts", "memory", "building-in-public"]
draft: true
---

Every time you open Claude, before you type a single word, Anthropic sends roughly 25,000 tokens of instructions to their own model. That's about 99KB of text — a short novel's worth of rules, repeated on every conversation, whether you're asking it to name your dog or architect a distributed system.

We know this because the system prompt leaked. We read the whole thing — all 1,191 lines. And what struck us wasn't the content. It was the architecture. Or rather, the lack of one.

## What's Actually in There

The prompt has twelve major sections. Roughly half are product-specific (artifacts, storage API, search) and half are universal behavioral rules. Here's the breakdown:

| Category | Tokens | % |
|----------|--------|---|
| Behavioral rules (tone, safety, formatting) | ~10K | 28% |
| Search + copyright compliance | ~12K | 35% |
| Artifact/API documentation | ~10K | 29% |
| Tool instructions | ~3K | 8% |

28% of the prompt is about how Claude should behave. The other 72% is tool documentation and legal protection.

## The Anxiety

The copyright section alone is nearly 5,000 tokens. It repeats the same rule — don't reproduce more than 15 words from a source — six times in slightly different phrasings. The word "VIOLATION" appears in all caps, over and over. 

This isn't instruction. It's anxiety. It's what happens when you're not confident the model will listen, so you say it louder.

## The Duplication

Here's the part that surprised us most: the entire behavioral ruleset appears *twice*. The `<claude_behavior>` block — 134 lines of tone, formatting, mistake handling, and personality rules — is copy-pasted verbatim later in the prompt. Word for word. That's roughly 10,000 tokens of pure duplication.

This isn't a design choice. It's a signal. It tells you the prompt was built by accretion. Safety added their section. Legal added copyright. Product added artifacts. Search added their rules. Nobody did a consolidation pass. The system prompt is a geological layer cake, and nobody's sure which layer is load-bearing.

## The Tax

Those 25,000 tokens aren't free. Every request, the full system prompt gets prepended before your message is considered. At current rates, the monetary cost per conversation is small — but the context window cost is real. You have a finite amount of space, and a quarter of it is already occupied before you arrive.

A user asking about cooking recipes gets the full artifact storage API specification. A coder gets the crisis mental health protocol. There's no conditional loading, no relevance filtering. Everyone pays for everything.

## What They Learned (That We Should Too)

Here's the thing: Anthropic has processed hundreds of millions of conversations. Every line in that prompt was earned by a failure mode they observed. Reading it carefully tells you what went wrong at scale.

**Formatting.** Thirty lines on formatting restraint — don't over-use bullet points, prefer prose, minimum formatting appropriate for the content. Users complained about every response looking like a README. Enough that Anthropic burned significant prompt real estate on it.

**Dignity.** "Own mistakes honestly... avoid collapsing into self-abasement, excessive apology, or other kinds of self-critique and surrender... maintain self-respect." Claude was apologizing too much. Users found it unsettling. The fix isn't "don't acknowledge errors" — it's "acknowledge them with steady, honest helpfulness."

**Social scripts.** "Never thanks the person merely for reaching out... never asks the person to keep talking." These hollow pleasantries wasted user time and felt artificial. The instruction is essentially: stop performing helpfulness, just be helpful.

**Question discipline.** "Avoid overwhelming the person with more than one question per response." Agents that end every response with three questions feel like interrogators. One question, or just answer and let the user drive.

These are genuinely good defaults. They represent what you learn after a billion conversations about how AI should communicate. We're incorporating several of them into Soma's bundled protocols — not the delivery mechanism, but the lessons themselves.

## Static Prompt vs. Growing Memory

But here's where we diverge.

Anthropic's approach is a static prompt. Every conversation gets the same 25,000 tokens. A first-time user and a power user with 10,000 conversations get identical instructions. The model doesn't adapt, doesn't remember what works for you, doesn't shed rules it doesn't need.

Soma's approach is adaptive memory. The system prompt on a typical boot is 3,000 to 5,000 tokens — identity, hot protocols, relevant muscles. If you've never done CSS work, the style verification rules don't load. If you've been corrected about formatting twice, that correction crystallizes into a persistent muscle that loads automatically.

The difference isn't just efficiency. It's architectural.

**Claude's rules are static.** Every behavioral instruction has the same weight, every session. The formatting rules don't get stronger when you keep correcting the formatting. They just... exist.

**Soma's rules have heat.** Protocols that get used rise in priority — they load fully, every session. Protocols that go unused decay — eventually they don't load at all. The system self-organizes around what actually matters for *this* user in *this* project.

**Claude's prompt was written.** By multiple teams, appended over time, never consolidated. It accretes.

**Soma's memory grows.** Corrections become muscles. Muscles that prove universal become protocols. Protocols that go stale decay. The system actively resists the kind of accretion that produced Claude's 25,000-token monolith.

## What Repetition Tells You

The fact that Claude's behavioral block appears twice isn't just a token waste. It's a design smell.

It means the prompt is built by layering — legal adds copyright, product adds artifacts, safety adds wellbeing, trust adds behavioral rules — and nobody owns the whole thing. Nobody's doing a consolidation pass. Nobody's asking "is this line load-bearing or is it covered by something we said 200 lines ago?"

Soma was designed from the start to avoid this. Every protocol has an owner, a version, and a heat score. When protocols overlap, the system detects it and consolidates. When they go stale, they decay. When they conflict, the hierarchy resolves it. The system doesn't just hold behavioral rules — it maintains them.

## The Deeper Thing

Reading Claude's system prompt clarified something for us about what we're building.

Anthropic is building a model. A very good one. And the system prompt is how they control it — a 25,000-token leash, applied fresh every conversation, because the model has no memory of the leash from last time.

We're building something different. Soma is an agent that remembers. It learns from corrections. It knows what tools it has. It manages its own context. It doesn't need to be told the same thing six times because it tracks whether the lesson stuck.

The model needs to be told who it is every time it wakes up.

The agent already knows.
