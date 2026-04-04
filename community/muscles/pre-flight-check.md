---
name: pre-flight-check
type: muscle
status: active
description: ""we already have X, want to extend it?" This is how senior engineers prevent duplication. Execute requests thoughtfully, not reflexively."
heat: 15
triggers: [exists, duplicate, already, check, prior-art, awareness, quality, meta]
applies-to: [any]
created: 2026-03-12
updated: 2026-04-04
tools: [soma-verify.sh, soma-plans.sh]
loads: 35
seams: [s01-3498d3]
---

# Pre-Flight Check

## TL;DR
**Pre-Flight Check** — before building anything new (command, feature, module, script), check if it already exists. Read your project state file. Grep the codebase. When the user asks for something that's already there, say so immediately — "we already have X, want to extend it?" This is how senior engineers prevent duplication. Execute requests thoughtfully, not reflexively.

## The Pattern

User says "let's add X." Before writing code:

1. **Check ATLAS** — your project state file has all commands, modules, settings
2. **Grep** — `grep -rn "keyword" core/ extensions/` for prior art
3. **Think** — does this overlap with something existing? Could we extend instead of create?
4. **Tell the user** — if it exists, say so. If it partially exists, suggest extending.

## Why This Matters

Context is expensive. Building a duplicate wastes tokens, creates confusion, and shows the user their agent doesn't know what it built. When the agent catches a duplicate, the user gains trust. When it builds one, trust erodes.

## Multi-Agent Pre-Flight

When working in a worktree with `guard.worktree` set, also check:
- Am I on the right branch? (`git branch`)
- Is my boundary active? (`/guard-status`)
- Does my AGENTS.md scope match what I'm about to do?

See MAP: `agent-preflight` for full checklist.

## Origin

Session 10 — User asked about system prompt preview. We already had `/soma prompt` + `/soma prompt full`. The agent should have caught that.
