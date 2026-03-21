---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 7
---

What's new in Soma. Full implementation details available to registered users.

---

## [0.6.1] — 2026-03-20

### Highlights

- **Published to npm.** `npm install -g meetsoma` is live. 24KB thin launcher — the runtime downloads on first run.
- **Engine updated to 0.61.1** — keybinding stability, session path fixes, suspend/resume resilience.
- **27 documentation pages** across 5 sections. New: AMPS overview, migration guide, troubleshooting.
- **Source access page** redesigned with tier cards, Dev Kit teaser, and Known Gaps.

### Docs & Website

- Collapsible sidebar with section icons and auto-expand on active page.
- 3 new pages: AMPS (four layers as one system), Migrating (from CLAUDE.md/.cursorrules), Troubleshooting.
- Docs reorganised: First Steps → Core Concepts → Workflows → Customization → Reference.
- Roadmap curated with user-facing language. "On the Horizon" feature cards.
- 3 solo blog posts: Three Files, The Ratio, The Operating System.
- Known Gaps sections across docs — honest about heat system limitations and planned fixes.

### Fixed

- CLI crash on Pi 0.61.0 (`getEditorKeybindings` renamed upstream). Dist synced safely.
- Heat system docs corrected across all surfaces.
- `@gravicity.ai/soma` removed from npm (was shipping full source).

## [0.6.0] — 2026-03-20

### Highlights

- **New install experience** — `npm i -g meetsoma` installs a lightweight launcher. Run `soma` and it introduces itself — rotating concepts, interactive Q&A, typing animation. The runtime downloads automatically when you're ready.
- **23 documentation pages** — Models & providers, keybindings, themes, settings, sessions, prompt templates, skills, terminal setup, extending, and more. Full parity with the underlying engine docs.
- **Source-available** — Soma is now distributed under BSL 1.1. The compiled runtime is public. Source code available to registered contributors.
- **Engine updated to 0.61.0** — keybinding manager, JSONL export/import, session forking, lazy provider loading, bash elapsed time.

### CLI (the launcher — before the agent starts)

- `soma` — Welcome experience with rotating daily concepts and interactive Q&A. Press `?` to ask about memory, heat, protocols, muscles, or how Soma compares to other tools. Every answer is different.
- `soma init` — Downloads and installs the Soma runtime. No auth needed.
- `soma about` — How Soma works — identity, protocols, muscles, breath cycle, scripts
- `soma focus <keyword>` — Start a focused session primed for a specific topic
- `soma --map <name>` — Load a workflow template
- `soma doctor` — Health check (Node.js, runtime, extensions, API key, git)
- `soma update` — Check for CLI and runtime updates
- `soma status` — Installation state, version, core info
- Typing animation — responses type out with natural rhythm (pace drift, sentence pauses)
- 22 Q&A topics covering concepts, practical how-to, and meta-awareness

### Agent (the session — after .soma/ exists)

- Focus heat scoring — `score × 2` reaches HOT tier correctly
- MAP prompt-config merging for focused sessions
- User extensions in `.soma/extensions/` discovered alongside compiled runtime
- Auto-breathe — context management, preload generation, session rotation
- Scratch notes — `/scratch` for quick persistent notes across sessions
- 15 in-session commands — `/auto-breathe`, `/pin`, `/kill`, `/scratch`, and more
- 30 automated E2E sandbox tests verify branding, paths, infrastructure, and models

### Documentation

- Models & Providers — 17+ providers, API key storage, custom providers (Ollama, LM Studio, OpenRouter)
- Keybindings — defaults and customisation via keybindings.json
- Themes — built-in dark/light and custom project themes
- Settings — engine settings reference
- Terminal Setup — terminal recommendations and tmux
- Sessions — session tree, fork, compaction, branch summarisation
- Prompt Templates — prompts/ directory format
- Skills — SKILL.md format and skill authoring
- Extending — custom model providers

### Changed

- License: BSL 1.1 — view the code, use it personally, contribute. Converts to MIT on 2027-09-18.
- npm package: lightweight launcher (~24KB, zero dependencies). Runtime separate.
- Project paths resolve to `.soma/` (not `.pi/`) with correct piConfig delegation.

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
