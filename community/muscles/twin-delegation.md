---
name: twin-delegation
type: muscle
status: active
description: "Spawn and coordinate twin Soma sessions via cmux. Write preloads, open panes, send commands, poll for completion. The coordinator pattern — no framework, just preloads and a shared filesystem."
heat-default: cold
tags: [multi-agent, delegation, twins, cmux, coordination]
applies-to: [development, writing, research]
scope: bundled
tier: core
created: 2026-04-03
updated: 2026-04-04
version: 1.0.0
author: meetsoma
license: MIT
---

# Twin Delegation

## TL;DR
Spawn twin Soma sessions for parallel work. Write a preload (engineer their context), open a terminal pane via `soma-cmux.sh`, launch `soma inhale <preload-name>`, send instructions, poll for completion. You are the coordinator — delegate what a fresh context would do better than your loaded one.

## When to Spawn a Twin

Delegate when:
- **Your context is full** but the task needs fresh attention (writing, research)
- **The task is self-contained** — the twin can work from a preload without your conversation history
- **Parallel work is possible** — two tasks with no dependencies between them
- **A different persona helps** — writing voice, code review, adversarial testing

Don't delegate when:
- The task needs your loaded context (deep debugging, mid-refactor decisions)
- It's faster to just do it yourself (< 5 minutes of work)
- The twin would need to re-read everything you already read

## The Pattern

### 1. Write the preload

The preload IS the twin's entire context. Engineer it like a briefing for someone taking your shift. Include:
- **Resume Point** — what they're doing, not what you did
- **Orient From** — exact file paths to read first
- **What exists** — don't make them discover what you already know
- **What NOT to do** — save them your mistakes
- **Completion signal** — how to tell you they're done

```markdown
# .soma/memory/preloads/preload-<task>-<date>.md
---
type: preload
created: {{DATE}}
for: <purpose>-twin
---

## Resume Point
You're the <role> twin. Your job: <one sentence>.

## Orient From
1. Read first: <exact file path>
2. Match voice: <exact file path>

## Your Task
<specific, actionable, complete>

## When Done
Type exactly: DONE — <what you did>
```

### 2. Open a terminal pane

```bash
# See current layout
bash soma-cmux.sh status

# Open new terminal in an existing pane
bash soma-cmux.sh new-term pane:2
# Returns: surface:N

# Or split to create a new pane
bash soma-cmux.sh split right
```

### 3. Launch the twin

```bash
# Send the inhale command to the new surface
bash soma-cmux.sh run surface:N "cd ~/path/to/project && soma inhale preload-<task>-<date>"
```

### 4. Monitor and steer

```bash
# Check on them
bash soma-cmux.sh capture surface:N 15

# Short feedback — single line only
bash soma-cmux.sh run surface:N "Adjust X, the path should be Y"

# Multi-line instructions — cmux splits newlines into separate messages!
# NEVER send multi-line text via cmux send. Write to a file instead:
write /tmp/twin-task.md   # your instructions
bash soma-cmux.sh run surface:N "Read /tmp/twin-task.md and follow those instructions"
```

**Critical:** `cmux send` splits on newlines. Each line becomes a separate queued user message. The twin sees 6 "Steering:" fragments instead of one coherent instruction. Always: one-liner commands, or file + read.

### 5. Completion

Either:
- **Poll**: `bash soma-cmux.sh capture surface:N 10` and look for the DONE signal
- **Trust**: check the filesystem for the output files they were asked to create
- **Timer**: `sleep 60 && bash soma-cmux.sh capture surface:N 15`

### 6. Release

```bash
bash soma-cmux.sh run surface:N "Good work. Exhale and close. /exhale"
```

## Coordination Principles

**You are the coordinator.** You hold the big picture. Twins hold the focus. Don't delegate the thinking — delegate the doing.

**The preload is the contract.** Everything the twin needs must be in the preload. They can't see your conversation. They don't know what you tried. They start from the preload and the filesystem — nothing else.

**Shared filesystem = shared state.** Twins read and write the same `.soma/` and `repos/`. No worktree isolation needed for read-heavy tasks. For parallel writes to different files, it just works. For parallel writes to the same file — serialize, or split the task.

**Engineer their context, don't dump yours.** A preload that says "continue the blog post" wastes the twin's time re-reading everything. A preload that says "write section 3, here's the angle, here's the voice, here's the data" gives them a running start.

**Cost awareness.** Each twin is a full Soma session. Opus-4.6, 5-minute keepalive, full boot. A twin that finishes in 6 minutes at $0.29 is worth it. A twin that wanders for 20 minutes at $2.00 because the preload was vague is your fault, not theirs.

## What Makes a Good Delegation

| Good | Bad |
|------|-----|
| "Write the OG image SVG. Dimensions: 1200x630. Style: match the first post at this path." | "Make an image for the blog." |
| "Update these 7 READMEs. Here's the AMPS list per template." | "Fix the docs." |
| "Draft 3000 words. Angle: X. Voice: match this file. Hooks: these 4." | "Write a blog post about the leak." |
| "When done, type DONE and push to community hub." | (no completion signal) |

## Quick Reference

```bash
# Full workflow in 5 commands:

# 1. Write preload (use your editor/write tool)

# 2. Open pane + launch
bash soma-cmux.sh new-term pane:2           # → surface:N
bash soma-cmux.sh run surface:N "cd ~/project && soma inhale preload-name"

# 3. Send mid-flight feedback
bash soma-cmux.sh run surface:N "Adjust X, add Y"

# 4. Check status
bash soma-cmux.sh capture surface:N 15

# 5. Release
bash soma-cmux.sh run surface:N "/exhale"
```

---
