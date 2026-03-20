---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 10
---

What's new in Soma. Full implementation details available to registered users.

---

## [0.6.0] — 2026-03-19

### Highlights

- **Soma speaks** — Run `soma` and it talks to you. A different voice each time. Press `?` to ask about memory, heat, protocols, or anything else. Every answer is unique. No AI involved.
- **No compaction. Ever.** — Other agents compress your conversation when context fills up. Soma doesn't. It breathes — writes a surgical briefing with full context, then starts fresh at full capacity.
- **Open install** — Soma is now a lightweight launcher on npm. The runtime downloads automatically on first run.

### Added

- `soma` — Welcome experience with rotating daily concepts and interactive Q&A
- `soma init` — Install the Soma runtime
- `soma about` — Learn how Soma works (identity, protocols, muscles, breath cycle, scripts)
- `soma doctor` — Health check for your installation
- `soma update` — Check for new versions (CLI and core)
- `soma status` — Show installation state, version, and core info
- Typing animation — responses type out character by character with natural rhythm
- 22 Q&A topics covering concepts, practical questions, and meta-awareness
- Smart command detection — post-install commands show helpful messages when runtime isn't installed

### Changed

- License: BSL 1.1 — view the code, use it personally, contribute. Converts to MIT on 2027-09-18.
- npm package is now a lightweight launcher (~24KB, zero dependencies)
- Runtime distributed separately as compiled package
- Engine updated to 0.60.0 (improved session handling, bash executor, Bun support)

### Fixed

- Muscle frontmatter validation enforced across all 33 active muscles
- Protocol frontmatter integrity checks (merged line detection)
- Focus heat scoring: `score × 2` reaches HOT tier correctly
- MAP prompt-config merging for focused sessions

---

## [0.5.0] — 2026-03-12

### Highlights

- **Auto-breathe** — Soma manages its own context. When context gets tight, it wraps up, writes a preload, and rotates into a fresh session — automatically.
- **Focus targeting** — `soma focus <keyword>` primes the boot sequence for a specific topic. Relevant content loads hotter. Irrelevant content stays cold.
- **MAP system** — Workflow templates that tell the agent which tools to use, which protocols to follow, and in what order.

### Added

- `soma focus <keyword>` — Start a focused session
- `soma --map <name>` — Load a workflow template
- `/auto-breathe` — Toggle automatic context management
- `/pin` and `/kill` — Control what stays loaded and what fades
- `/scratch` — Quick notes that persist across sessions
- 15 in-session commands total
- 10 bundled scripts (code navigation, search, reflection, plans)
- 16 bundled protocols with heat tracking
- Recursive content discovery (subdirectory support for AMPS layers)
- Global `~/.soma/` directory with shared identity and settings

### Architecture

- Self-growing memory with heat-based attention management
- Protocols, muscles, scripts, and automations (AMPS)
- Layered identity system (project → parent → global)
- Focus engine with scored keyword matching

### Fixed

- Auto-breathe race condition — deferred messaging via pending queue
- System prompt dropped after turn 1 — cached prompt compilation
- Identity lost after session rotation — chain rebuild on session switch
- Context warnings never fired — graceful handling of undefined usage on turn 1

---

## [0.3.0] — 2026-03-10

### Added

- Auto-init on first `soma` run — creates `.soma/`, detects project stack
- `/inhale` — load your last session's preload into the current conversation
- `/breathe` — save state and rotate into a fresh session with preload
- Context warnings at 50%, 70%, 80%. Auto-exhale at 85%
- Extension scaffolding during init

### Fixed

- `/breathe` crash — `ctx.newSession` not available in event handlers
- Session rotation unified through `/inhale`

---

## [0.2.1] — 2026-03-09

- 9 core modules bundled (discovery, identity, heat, muscles, protocols, settings, preload, prompt, utils)
- Built-in protocols and scripts ship with the package
- Heat system tracks what matters and fades what doesn't

## [0.1.0] — 2026-03-08

- First release. `npm i -g meetsoma`.
- Identity, memory, muscles, protocols, heat system.
