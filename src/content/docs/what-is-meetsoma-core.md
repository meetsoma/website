---
title: "What is meetsoma core?"
description: "meetsoma core is the open-source harness you install. Soma is the agent that lives in it."
section: "First Steps"
order: 0.5
---

# What is meetsoma core?

**meetsoma core** is the open-source harness you install: `npm i -g meetsoma`, then run `soma`
in any project. It's the runtime. The breath cycle, the memory layout, the protocol system, the
tool registry, everything that makes a session pick up where the last one left off.

**Soma** is the agent that lives inside it. Not a brand name for the software, the thing you
actually talk to. Soma remembers across sessions, grows its own tools, and carries identity,
context, and learned patterns forward instead of starting fresh every time.

## What you get, free

The full runtime is open source and free on npm, day one:

- The complete breath cycle (inhale, work, exhale) and session memory
- Identity, protocols, muscles, and scripts: the four AMPS layers
- The full tool registry, including browser automation, code navigation, and delegation

A few advanced scripts (seam tracing, refactor analysis) live outside the core in an optional
pack; the tools that wrap them say so when the pack isn't installed. See [Pro Tools](/docs/pro-tools).

## What's optional

Beyond the core install, there's more you can opt into as you need it:

- **Register your soma**: connect an installed agent to an account
- **Hub**: a community library of shared protocols, muscles, skills, and scripts
- **Somaverse**: a cloud workspace layer for teams and cross-project views
- **Pro / enterprise**: tiers built on top of the same open-source core

None of these are required to use meetsoma core. They layer on top when you want them.

## Install in one command

```bash
npm install -g meetsoma
```

Then run `soma` in any project. First run creates `.soma/` and starts your first session.

Full walkthrough: [Getting Started](/docs/getting-started).
