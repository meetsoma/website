---
title: "What is meetsoma core?"
description: "meetsoma core is the harness Soma runs in. Soma is the agent that lives in it. It goes open source with 0.50.0."
section: "First Steps"
order: 0.5
---

# What is meetsoma core?

**meetsoma core** is the harness you install: `npm i -g meetsoma`, then run `soma` in any project.
It's the runtime: the breath cycle, the memory layout, the protocol system, the tool registry,
everything that makes a session pick up where the last one left off. It goes **open source under
the MIT licence with 0.50.0**.

**Soma** is the agent that lives inside it. Not a brand name for the software, the thing you
actually talk to. Soma remembers across sessions, grows its own tools, and carries identity,
context, and learned patterns forward instead of starting fresh every time.

## What you get, free

The full runtime is open source and free on npm, day one:

- The complete breath cycle (inhale, work, exhale) and session memory
- Identity, protocols, muscles, and scripts: the four AMPS layers
- The full tool registry, including browser automation, code navigation, and delegation

## What's optional

The core is complete on its own. More is on the way that builds on it, all opt-in:

- **Hub**: a community library of shared protocols, muscles, skills, and scripts
- **Register your soma**: connect an installed agent to an account
- **Somaverse**: a cloud workspace across your projects

None of these are required to use meetsoma core. We'll share details as each one is ready.

## Install in one command

```bash
npm install -g meetsoma
```

Then run `soma` in any project. First run creates `.soma/` and starts your first session.

Full walkthrough: [Getting Started](/docs/getting-started).
