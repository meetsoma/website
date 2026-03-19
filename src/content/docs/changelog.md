---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 10
---

What's new in Soma. Full implementation details available to beta testers.

---

## [0.6.0] — 2026-03-19

### Highlights

- **Soma speaks** — Run `soma` and it talks to you — a different voice each time. Press `?` to ask about memory, heat, or anything else. Every answer is unique. No AI involved.
- **No compaction. Ever.** — Other agents compress your conversation when context fills up. Soma doesn't. It breathes — writes a surgical briefing with full context, then starts fresh at full capacity.
- **Private beta** — Soma is now a lightweight launcher on npm. The runtime installs separately for verified beta testers.

### New Commands

- `soma` — Welcome experience with rotating daily concepts and interactive Q&A
- `soma init` — Install the Soma runtime (beta access required)
- `soma about` — Learn how Soma works
- `soma doctor` — Health check for your installation
- `soma update` — Check for new versions
- `soma status` — See your installation state

### Other Changes

- License changed to BSL 1.1 — view the code, use it personally, contribute. Converts to MIT on 2027-09-18.
- The npm package is now a lightweight launcher (~37KB, zero dependencies).

---

## [0.5.0] — 2026-03-12

### Highlights

- **Auto-breathe** — Soma manages its own context. When context gets tight, it wraps up, writes a preload, and rotates into a fresh session — automatically.
- **Focus targeting** — `soma focus <keyword>` primes the boot sequence for a specific topic. Relevant content loads hotter. Irrelevant content stays cold.
- **MAP system** — Workflow templates that tell the agent which tools to use, which protocols to follow, and in what order.

### New Commands

- `soma focus <keyword>` — Start a focused session
- `soma --map <name>` — Load a workflow template
- `/auto-breathe` — Toggle automatic context management
- `/pin` and `/kill` — Control what stays loaded and what fades
- `/scratch` — Quick notes that persist across sessions
- 15 in-session commands total

### Architecture

- Self-growing memory with heat-based attention management
- Protocols, muscles, scripts, and automations (AMPS)
- Layered identity system (project → parent → global)
- Recursive content discovery with subdirectory support

---

## [0.3.0] — 2026-03-10

- Auto-init on first run — Soma creates `.soma/` and detects your project automatically.
- Session continuation — `/inhale` loads your last session's preload. `/breathe` saves and continues.
- Context warnings at 50%, 70%, 80%. Auto-exhale at 85%.

## [0.2.1] — 2026-03-09

- Built-in protocols and scripts ship with the package.
- Heat system tracks what matters and fades what doesn't.

## [0.1.0] — 2026-03-08

- First release. `npm i -g meetsoma`.
