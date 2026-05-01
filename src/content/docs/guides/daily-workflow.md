---
title: "Daily Workflow"
description: "The exhale → reflect → inhale loop - how to use Soma day to day."
section: "Guide"
order: 12
---

# Daily Workflow

<!-- tldr -->
End of session: `/exhale`. Between sessions: review the preload, reflect, update it. Next session: `soma inhale`. That's the loop. The preload is the handoff - write it like a briefing for someone who forgot everything. Power users journal and do MLR (Memory Lane Reflection) between sessions to deepen continuity.
<!-- /tldr -->

## The Loop

```
Session 1:  work → /exhale (writes preload)
                      ↓
Between:    review preload → reflect → update preload
                      ↓
Session 2:  soma inhale (loads curated preload) → work → /exhale
                      ↓
Between:    review → reflect → update
                      ↓
Session 3:  soma inhale → ...
```

Every session is a breath. Inhale context, work, exhale what you learned.

## Step 1: Exhale

When you're done working - or when context is getting full - run `/exhale`:

```
/exhale
```

Soma will:
1. Write a **preload** to `.soma/memory/preloads/preload-next-YYYY-MM-DD-sNN-HASH.md`
2. Save heat state (which protocols and muscles were used)
3. Optionally commit `.soma/` changes

The preload is the most important artifact. It's a briefing from this session to the next - what happened, what's next, what files to read, what traps to avoid.

### What Makes a Good Preload

The agent writes the preload, but you shape what goes in by how you work. Good preloads have:

- **Resume Point** - one sentence: "We were in the middle of X"
- **What's Done** - completed work this session
- **What's Next** - the immediate next step
- **Orient From** - specific file paths to read first
- **Warnings** - traps, known issues, things that broke

Bad preloads are summaries. Good preloads are briefings. The difference: a summary tells you what happened. A briefing tells you what to do.

> **Tip:** If you notice the agent writing weak preloads, edit `.soma/body/_memory.md` - that's the template that controls preload structure. Add sections, reorder priorities, include specific instructions.

## Step 2: Between Sessions (the secret weapon)

This is where power users differentiate. After the agent exhales, you have a preload file sitting in `memory/preloads/`. You can:

### Review the Preload

Open it. Read it. Does it capture what matters? Is the resume point clear? Are the file paths correct?

```bash
cat .soma/memory/preloads/preload-next-*.md | tail -1  # latest
```

### Update the Preload

Add context the agent missed. Fix incorrect statements. Add your own notes:

```markdown
## My Notes
- The approach we took for auth won't scale - reconsider before session 3
- Curtis: check the PR comments on #47 before continuing
```

The agent reads everything in the preload. Your notes become its starting context.

### Reflect (Journal + MLR)

For deeper continuity, maintain a journal at `.soma/body/journal.md`. After a session, jot observations:

```markdown
## 2026-04-04
- Agent struggled with the deploy flow - might need a muscle for it
- The test coverage correction worked - didn't repeat the mistake
- Curtis prefers terse status updates, not explanations
```

The journal loads into the system prompt (if included in `_mind.md`). Over time, it becomes a record of patterns the agent uses to understand you.

**Memory Lane Reflection (MLR)** is the deeper practice: trace a topic through session logs, notice what you missed, write the insight. It's optional but powerful - agents that reflect between sessions arrive with richer context than agents that just read the preload.

## Step 3: Inhale

When you're ready to work:

```bash
soma inhale
```

This starts a fresh session with your curated preload loaded. The agent wakes up knowing:
- What happened last session
- What's next
- What files to read
- What you added between sessions

### Three Ways to Inhale

| Method | Where | When |
|--------|-------|------|
| `soma inhale` | Shell (starts new session) | Morning start, after reviewing/updating preload |
| `soma` | Shell (starts new session) | Quick start — fresh session, no preload (unless `autoInject: true`) |
| `/inhale` | Inside TUI (resets session) | After exhale + preload update, or mid-session to load a preload |

**`soma inhale`** is the daily driver — you’re saying "I’ve prepared the context, load it."

**`/inhale`** inside the TUI **resets the session** and loads the preload. It’s the same as `soma inhale` but without leaving the TUI. Use it after `/exhale` when you’ve updated the preload and want to continue with fresh context. Also works mid-session when you started with plain `soma` and want to pull in the preload.

For quick starts where you haven’t touched the preload, plain `soma` works fine.

## Mid-Session: Breathe

When context fills up during a session, you have two options:

### Manual Rotation

```
/breathe
```

Saves state, writes a preload, and continues in a fresh session automatically. The new session loads the preload - seamless continuation.

### Auto-Breathe

Enable in settings for hands-free rotation:

```json
{
  "breathe": {
    "auto": true,
    "triggerAt": 50,
    "rotateAt": 70
  }
}
```

The agent gets a heads-up at 50% context, wraps up at 70%, and rotates automatically. You keep working - the transition is transparent.

### End of Day: Rest

```
/rest
```

Disables keepalive pings (no API costs overnight) and exhales. Use when you're done for the day.

## Example: A Full Day

**Morning:**
```bash
# Review yesterday's preload
cat .soma/memory/preloads/preload-next-2026-04-04-*.md

# Start with curated context
soma inhale
```

**Working:**
```
> Fix the auth bug from yesterday's preload
> ... (work, work, work)
> /breathe                    # context filling up, rotate
> ... (continues seamlessly)
> /breathe                    # another rotation
```

**End of day:**
```
> /rest                       # exhale + disable keepalive
```

**Evening (optional):**
```bash
# Review the preload, add notes for tomorrow
vim .soma/memory/preloads/preload-next-2026-04-04-*.md
```

## Tips

- **Don't skip exhale.** The preload is how continuity survives. No exhale = no memory.
- **Review preloads regularly.** Catch when the agent writes weak ones. Fix `_memory.md` if the template needs work.
- **Journal between sessions, not during.** The session is for working. Reflection is for between.
- **Trust the heat system.** Don't `/pin` everything. Let usage patterns decide what matters.
- **One preload per session.** Each exhale writes a unique file. Old preloads are preserved - you can always go back.

## Automation

For users who want the loop automated:

- **Auto-breathe** handles mid-session rotation
- **Auto-commit** saves `.soma/` state on exhale
- **Keepalive** keeps the cache warm between turns
- **Auto-exhale** writes a preload when keepalive lives run out (you walked away)

All configurable in [settings.json](/docs/configuration). The manual loop (`/exhale` → review → `soma inhale`) is always available as the foundation.

## Related

- [Getting Started](/docs/getting-started) - first session setup
- [Commands](/docs/commands) - full command reference
- [Configuration](/docs/configuration#auto-breathe) - auto-breathe settings
- [Sessions](/docs/sessions) - session tree, forking, compaction
- [Body Architecture](/docs/body) - customize `_memory.md` (preload template)
