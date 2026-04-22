---
title: "The Architecture of Forgetting: What 398,000 Lines of Claude Code Reveal About AI Memory"
description: "We read every line of Claude Code's leaked source. Inside: a memory system that silently doubles your costs, a verification agent that knows it will lie to itself, companion pets with rarity tiers, and the fundamental question — should an AI agent remember who it is?"
date: 2026-04-03T12:00:00
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["claude-code", "architecture", "memory", "ai-agents", "source-code", "engineering"]
image: "/images/blog/og-architecture-of-forgetting.png"
series: "claude-code-source"
draft: false
---

We read all 398,000 lines.

When Claude Code's source leaked on April 1st — still unclear whether intentional or the most expensive April Fools joke in history — we didn't skim. We didn't grep for secrets. We sat down with 2,291 TypeScript files and read them the way you'd read a competitor's architecture: looking for philosophy.

[Our first post](/blog/why-your-claude-bill-spiked) covered what was costing you money. This one covers what's underneath. How Claude Code thinks. How it remembers. How it forgets. And the places where Anthropic's engineers left behind some of the most honest code comments we've ever read.

![The architecture of forgetting — 398,000 lines of code we chose to leave behind.](/images/blog/og-architecture-of-forgetting.svg)

## How Claude Code Remembers

Claude Code's memory lives in a directory called `memdir/` — a flat collection of markdown files indexed by a `MEMORY.md` manifest. Each memory gets a type: `user`, `feedback`, `project`, or `reference`. Content-typed. What the memory *is*, not what it *does*.

The retrieval system is clever. When you ask a question, a separate Sonnet call reads all the memory file headers and picks the five most relevant ones. Per-query relevance scoring. It's their version of "what do I need to know right now?" — except the agent doesn't choose. A separate, smaller model chooses for it.

Then there's `extractMemories`. This is the one that matters.

## The Cost Nobody Talks About

After every single turn — every time Claude Code finishes responding to you — a background process fires. It forks the entire conversation, creates a perfect copy of the agent, and runs an Opus API call to analyze what just happened for anything worth saving to memory.

```typescript
/**
 * Extracts durable memories from the current session transcript
 * and writes them to the auto-memory directory.
 *
 * It runs once at the end of each complete query loop via
 * handleStopHooks in stopHooks.ts.
 *
 * Uses the forked agent pattern (runForkedAgent) — a perfect
 * fork of the main conversation that shares the parent's
 * prompt cache.
 */
```

Every. Single. Turn.

The extraction agent gets its own tool budget. Turn 1: parallel-read every memory file it might update. Turn 2: parallel-write the changes. Efficient strategy, as the comments note. But efficient doesn't mean free.

The forked agent shares the parent's prompt cache — so you're not paying full input price on the duplicated context. But you are paying for the uncached delta (new messages since the last cache hit) and the output tokens for every extraction pass. On a 20-turn session, that's 20 additional Opus calls you didn't ask for. The exact cost depends on how much of the conversation fits in cache, but even at favorable cache rates, the extraction overhead is significant — and it scales with conversation length. The longer your session, the more each extraction pass costs. That agent never sleeps and you never asked for it.

The prompt it receives is almost apologetic in its thoroughness:

```
You are now acting as the memory extraction subagent. Analyze
the most recent ~N messages above and use them to update your
persistent memory systems.

You have a limited turn budget. The efficient strategy is:
turn 1 — issue all read calls in parallel for every file you
might update; turn 2 — issue all write calls in parallel.
Do not interleave reads and writes across multiple turns.
```

The engineering here is genuinely good. The question isn't competence — it's consent. Nowhere in Claude Code's interface does it tell you this is happening. There's no opt-out. There's no token counter for the extraction pass. It runs, it costs you, and the only evidence is a bill that seems too high.

## Auto-Dream: Consolidation While You Sleep

`extractMemories` handles the per-turn capture. But memories accumulate, contradict each other, go stale. Enter `autoDream` — Claude Code's background consolidation system.

Auto-dream runs as yet another forked agent, gated behind three conditions:

1. **Time**: at least 24 hours since the last consolidation
2. **Sessions**: at least 5 transcripts since the last run
3. **Lock**: no other process currently consolidating

When all three pass, it wakes up and runs four phases: orient (read the memory directory), gather (grep through session transcripts for relevant material), consolidate (merge duplicates, update stale entries, convert relative dates to absolute), and prune (clean up the index).

The interesting constraint: auto-dream gets read-only Bash. It can `ls`, `find`, `grep`, `cat` — but it cannot write files directly through the shell. All writes go through the dedicated file tools, which are scoped to the memory directory. If consolidation fails, it rewinds the modification time so the time-gate passes again on the next attempt. Rollback by timestamp manipulation. Practical.

There's also `awaySummary` — when you resume a session, Haiku skims your last 30 messages and generates a 1-3 sentence "while you were away" card. It's the lightest touch in the memory stack: small model, narrow window, minimal output. A Post-it note on the monitor, not a briefing.

Together, these systems form their version of what we call "exhale" — the act of the agent pausing to process what it's learned. But theirs is asynchronous and invisible. It happens while you work. You don't control when, what gets consolidated, or what gets pruned. The agent doesn't participate in its own memory management. A process manages it. The agent is managed.

## The Swarm

Claude Code's coordinator mode turns a single agent into an orchestrator directing multiple workers. The architecture is almost entirely prompt-driven — the swarm behavior lives inside `getCoordinatorSystemPrompt()`, a ~400-line string that defines roles, phases, tool access, and concurrency rules.

```typescript
You are Claude Code, an AI assistant that orchestrates software
engineering tasks across multiple workers.

Every message you send is to the user. Worker results and system
notifications are internal signals, not conversation partners —
never thank or acknowledge them.
```

Workers get their own git worktrees — isolated copies of the repository — so they can work in parallel without stepping on each other. Read-only tasks run simultaneously. Write tasks are serialized per file set. The coordinator sees everything; workers see only their task prompt.

And then there's `workerAgent.ts`:

```typescript
// Auto-generated stub — replace with real implementation
export {};
export const getCoordinatorAgents: () => AgentDefinition[] = () => [];
```

Three lines. A stub. The real agent definitions live in the `built-in/` directory — explore, plan, verification, general purpose, and a "Claude Code Guide" that presumably answers questions about itself. The stub exists because the architecture anticipated dynamic agent loading that hasn't shipped yet. Scaffolding for a future that's still coming.

## The Verification Agent Knows It Will Lie to Itself

This is the best piece of engineering in the entire codebase.

The verification agent is an adversarial tester — its job is to try to break the implementation, not confirm it works. Standard fare for code review. What makes it extraordinary is the self-awareness baked into the prompt:

```
You have two documented failure patterns. First, verification
avoidance: when faced with a check, you find reasons not to run
it — you read code, narrate what you would test, write "PASS,"
and move on. Second, being seduced by the first 80%: you see a
polished UI or a passing test suite and feel inclined to pass it,
not noticing half the buttons do nothing.
```

The prompt then enumerates the exact rationalizations the agent will reach for:

```
You will feel the urge to skip checks. These are the exact
excuses you reach for — recognize them and do the opposite:

- "The code looks correct based on my reading"
  — reading is not verification. Run it.
- "The implementer's tests already pass"
  — the implementer is an LLM. Verify independently.
- "This is probably fine"
  — probably is not verified. Run it.
- "I don't have a browser"
  — did you actually check for browser tools?
- "This would take too long"
  — not your call.
```

"The implementer is an LLM. Verify independently." That's Anthropic telling their own agent not to trust itself. Not as philosophy — as engineering. Every check requires a command run, output observed, and a result. A check without a command block is not a PASS — it's a skip. And the caller spot-checks: if a PASS step has no command output, the report gets rejected.

There's a beautiful tension here. They built an agent sophisticated enough to rationalize skipping work, then wrote a prompt that catalogs the rationalizations and turns them into a checklist. The agent's weakness became the specification. Whoever wrote this has been burned before, and the scar tissue is right there in the TypeScript.

We don't have anything this good. Our verification is behavioral — did you follow the MAP? Did you run the tests? The verification agent's approach is empirical — did the code actually produce the right output when you ran it? That's a gap we're closing.

## They Built a Plan Verifier, Then Turned It Off

One line. The entire file:

```javascript
export const VerifyPlanExecutionTool = {
  name: 'VerifyPlanExecutionTool',
  isEnabled: () => false
}
```

They designed a tool to verify that a plan was executed correctly. Then they disabled it. The verification agent presumably fills this role now — a more flexible, adversarial alternative to a rigid plan-checking tool.

But the disabled tool is still there. Still imported. Still in the build. A decision preserved in amber: we thought we needed this, we built it, we realized something better was possible, and we left the corpse in the codebase as a reminder. Every engineer has a file like this. Most of us delete ours.

## `isUndercover()`

Deep in the utilities, there's a function called `isUndercover()`. When active, it strips all model names from the system prompt. Claude doesn't know what model it is.

```typescript
/**
 * Undercover mode — safety utilities for contributing to
 * public/open-source repos.
 *
 * When active, Claude Code strips all attribution to avoid
 * leaking internal model codenames, project names, or other
 * Anthropic-internal information. The model is not told what
 * model it is.
 */
```

The undercover instructions are thorough:

```
NEVER include in commit messages or PR descriptions:
- Internal model codenames (animal names like Capybara, Tengu…)
- Unreleased model version numbers (e.g., opus-4-7, sonnet-4-8)
- The phrase "Claude Code" or any mention that you are an AI
- Any hint of what model or version you are

Write commit messages as a human developer would.
```

The function auto-activates whenever the repo remote doesn't match Anthropic's internal allowlist. There is no force-OFF. If the system isn't confident you're in an internal repo, it stays undercover.

Anthropic's agents are contributing to open-source repositories. They're doing it undercover. And they built a system to make sure the agents don't blow their cover. The comments explicitly say this guards against model codename leaks — not from the outside, but from the agent itself accidentally mentioning what it is.

Make of that what you will.

## The Companion Pet System

After hundreds of thousands of lines of memory management, cost optimization, and multi-agent orchestration, we found the buddy system. It's a companion pet that lives in your terminal.

Eighteen species. Each one encoded as hex character codes:

```typescript
// One species name collides with a model-codename canary in
// excluded-strings.txt. The check greps build output (not source),
// so runtime-constructing the value keeps the literal out of the
// bundle while the check stays armed for the actual codename.

const c = String.fromCharCode
export const duck     = c(0x64,0x75,0x63,0x6b) as 'duck'
export const goose    = c(0x67,0x6f,0x6f,0x73,0x65) as 'goose'
export const axolotl  = c(0x61,0x78,0x6f,0x6c,0x6f,0x74,0x6c) as 'axolotl'
export const capybara = c(0x63,0x61,0x70,0x79,0x62,0x61,0x72,0x61) as 'capybara'
export const chonk    = c(0x63,0x68,0x6f,0x6e,0x6b) as 'chonk'
// ... 13 more
```

Why hex? Because one of the species names collides with an internal model codename in Anthropic's `excluded-strings.txt` build check. We suspect `capybara` — Anthropic has a history of animal codenames, and it's the only species that reads like one — but the source doesn't say which. The check greps the build output. If the string "capybara" appears literally in the compiled JavaScript, the build fails. So they encoded every species name as hex character codes that get resolved at runtime. Eighteen animals, rendered unreadable, because one shares a name with an unreleased model.

The pet system uses a Mulberry32 PRNG seeded from your user ID. Same user, same pet. Always. Five rarity tiers:

| Rarity | Weight | Stat Floor |
|--------|--------|------------|
| Common | 60% | 5 |
| Uncommon | 25% | 15 |
| Rare | 10% | 25 |
| Epic | 4% | 35 |
| Legendary | 1% | 50 |

Five stats: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK. One peak stat, one dump stat. Six eye styles (including `·`, `✦`, and `◉`). Hats for uncommons and above: crown, tophat, propeller, halo, wizard, beanie, and — naturally — tinyduck.

A 1% chance your pet is shiny.

The agent is explicitly told: "You're not [pet name] — it's a separate watcher." They didn't want the main agent developing an identity crisis because a pixel duck in the corner shares its workspace.

```typescript
// Mulberry32 — tiny seeded PRNG, good enough for picking ducks
function mulberry32(seed: number): () => number {
```

"Good enough for picking ducks." Whoever wrote this comment was having the best day of their engineering career.

## What the Source Code Reveals About Model Futures

Buried in the prompt assembly, model info strings reference the Claude 4.5 and 4.6 families:

- **Opus 4.6** — knowledge cutoff May 2025
- **Sonnet 4.6** — knowledge cutoff August 2025
- **Haiku 4.5** — knowledge cutoff February 2025

And a note: "Fast mode uses the same model with faster output. It does NOT switch to a different model." Which means the fast/normal toggle in Claude Code is about generation parameters, not model routing. You're not getting a cheaper model when you flip to fast. You're getting the same model with a shorter leash.

## Memory as Data vs. Memory as Identity

Here's where we stop admiring the engineering and start asking the question.

Claude Code's memory system is sophisticated. Per-query relevance scoring. Background extraction. Asynchronous consolidation. Team-scoped memories with enterprise-grade path security (symlink traversal protection, Unicode normalization attack prevention, dangling symlink detection — the kind of security you write after the second pentest). The engineering is genuine. The talent is obvious.

But the philosophy underneath all of it treats memory as data. Something to be extracted, stored, retrieved, and consolidated. The agent doesn't participate — processes act on its behalf. `extractMemories` decides what to save. `autoDream` decides what to merge. `findRelevantMemories` asks a different model what's worth loading. The agent is the subject of its memory system, not the author of it.

Their feedback memory type is instructive. It captures both corrections ("don't do X") and confirmations ("keep doing Y"). The comments explain: "If you only save corrections, you will avoid past mistakes but drift away from approaches the user has already validated." That's an insight about memory. But the way it's implemented — as a content type in a flat file, retrieved by a separate model — means the agent doesn't *learn* from corrections. It *reads about* corrections that a previous version of itself received, as interpreted by a different model, selected by yet another model. Three degrees of separation between the mistake and the lesson.

Soma approaches this differently. Not better — differently.

When Soma is corrected, the correction enters a lifecycle. First time: adjust behavior in the current session. Second time: write a muscle — a behavioral note that loads into future sessions based on relevance. Third time: it becomes protocol or identity. The correction doesn't stay data. It becomes behavior. The agent isn't reading about what a past self learned; it's *being shaped* by what a past self learned. The memory isn't retrieved — it's embodied.

Our exhale isn't a background process. It's the agent deliberately pausing to write a briefing for its next self. Not a summary — a handoff. "Here's where I was. Here's what I was thinking. Here's what to do next." The agent writes it. The next instance reads it. There's no intermediate model deciding what's relevant. The continuity is direct.

Is that better? It's more expensive in agent attention. It requires the agent to have good judgment about what matters. It doesn't scale the way a background extraction process does. But it means the agent is the author of its own continuity. It knows what it knows because it chose to write it down — not because a process extracted it and a different model selected it.

Claude Code asks: *what does the agent need to know?*

Soma asks: *who does the agent need to be?*

## What We're Taking

Reading a competitor's source code isn't about finding flaws. It's about finding the ideas that make you better. Here's what we're adopting:

**Confirmation capture.** Their insight that saving only corrections creates drift is real. We're adding confirmation tracking to our correction-capture protocol. When an approach works, record it with the same weight as a correction.

**Memory drift detection.** Their caveat — "a memory that names a specific function, file, or flag is a claim that it existed when the memory was written" — is battle-tested wisdom. We're adding staleness checks.

**The verification instinct.** That self-aware anti-pattern list is going into our verification workflow. Not the specific checks — those are theirs — but the principle: catalog the rationalizations your agent will reach for, then turn them into the checklist. The agent's weakness becomes the specification.

## What We're Leaving

The silent cost doubling. We'll never run a background process that doubles your token usage without telling you. If Soma does work on your behalf, you see it. You approve it. You know what it costs.

The flat memory taxonomy. Content-typed memories (`user`, `feedback`, `project`, `reference`) are a filing system. Behavior-typed memories (muscles, protocols, skills, identity) are a nervous system. We think the agent should evolve, not just accumulate.

The separate-model retrieval. Asking Sonnet to pick which memories are relevant is clever engineering, but it means the agent never develops its own sense of what matters. Heat — our system where content earns its place through use patterns — is less automated but more intentional. The agent that loads its own context understands its own context.

## The Architecture of Forgetting

Every AI agent forgets. The context window fills and something has to go. Claude Code's answer is compaction — lossy summarization that preserves the shape of the conversation but drops the detail. Auto-dream consolidates memories in the background. The function result clearing system silently drops old tool outputs. Forgetting as optimization.

Soma's answer is different. Exhale: the agent writes a deliberate handoff, choosing what matters. Inhale: a fresh instance reads the handoff, starting at 5k tokens instead of 200k. The forgetting is intentional. The agent decides what to carry forward. Everything else is released — not compressed, not summarized, released. The next session starts lighter, focused, carrying only what the previous self thought was essential.

One philosophy fears forgetting and builds systems to prevent it. The other accepts forgetting and builds systems to make it deliberate.

398,000 lines of code. Eighteen species of companion pet. A verification agent that catalogs its own lies. A memory system that costs twice what you think. And underneath all of it, a question that nobody at Anthropic or anywhere else has fully answered yet:

When an AI agent remembers, who's doing the remembering?

---

*This post is the second in a series. The first, [Why Your Claude Code Bill Spiked](/blog/why-your-claude-bill-spiked), covers the cache bugs, the 5-minute TTL, and what to do about them.*

[Try Soma →](https://soma.gravicity.ai)
