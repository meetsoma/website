---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 7
---

What's new in Soma.

---

## [0.6.3] — 2026-03-22

### Highlights

- **`/hub` command** — unified interface for community content. Install, fork, share, find, browse — all from one command.
- **Smart sharing** — `/hub share` runs quality checks, auto-fixes private paths, scores quality 0-100%, and opens a PR to the community hub.
- **Drop-in commands** — drop a script into `.soma/amps/scripts/commands/` and it becomes `/soma <name>` instantly. No restart.
- **40 community items** across 5 content types — protocols, muscles, scripts, automations (MAPs), and templates.

### New

- `/hub install <type> <name>` — install community content globally (`-g`, default) or per-project (`-p`).
- `/hub fork` — create your own version of community content with fork lineage tracking.
- `/hub share` — share your content with privacy scanning, quality scoring, and auto-generated README.
- `/hub find` and `/hub list --remote` — search and browse the community hub.
- Drop-in `/soma` commands with `SOMA_DIR` and `SOMA_PROJECT` env vars.
- `scope: core` protocols — built-in behavior documented without wasting ~2000 tokens of prompt space.
- `gitIdentity.email` supports arrays — multiple valid emails for multi-account users.
- Default preload template now includes Weather (session tone) and Warnings (traps for next session).
- Dependency resolution — installing a protocol that references scripts auto-installs the dependencies.
- 3 automation MAPs on the hub: debug, refactor, visual-gap-analysis.
- Customizable preload template available on the hub.
- Regression test suite: 51 tests across 2 suites.

### Changed

- `/install` and `/list` now redirect to `/hub install` and `/hub list`.
- Core protocols (breath-cycle, heat-tracking, etc.) are readable on demand but don't load into the prompt.
- `/pin` and `/kill` explain when targeting core protocols ("behavior is built-in").
- Community CI upgraded to Node 22 (actions v6).

### Fixed

- `/hub list --remote` flag was parsed as type filter.
- ANSI escape codes in drop-in command output stripped for clean rendering.

---

## [0.6.2] — 2026-03-21

### Highlights

- **Natural muscle heat** — scripts and file edits bump related muscles automatically. No `/pin` needed.
- **Migration system** — `soma doctor` checks workspace health, auto-fixes issues, migrates between versions.
- **Community sync** — boot fetches latest protocols from the community repo. Offline fallback included.

### New

- `soma doctor` — health checks, auto-fix, migration chaining.
- Natural heat detection from tool results — frontmatter writes, git commands, preload writes.
- `tools:` field in muscle frontmatter for script associations.
- Community template sync on boot.

### Changed

- `triggers` consolidates `keywords` + `topic` into one field (backwards compatible).
- Personality engine is honest about being templates.

### Fixed

- Runtime delegation — soma-beta includes cli.js and Pi runtime files.
- Fresh installs include version field in settings.json.

---

## [0.6.1] — 2026-03-20

### Highlights

- **Published to npm.** `npm install -g meetsoma` is live. Lightweight launcher — the runtime downloads on first run.
- **Engine updated to 0.61.1** — keybinding stability, session path fixes, suspend/resume.

### New

- AMPS overview doc — the four layers (protocols, muscles, scripts, MAPs) explained as one system.
- Migration guide — coming from CLAUDE.md or .cursorrules? Here's how Soma handles it differently.
- Troubleshooting page with common issues and fixes.
- Known Gaps sections in docs — honest about heat system limitations and planned fixes.
- Docs reorganised: First Steps, Core Concepts, Workflows, Customization, Reference. Collapsible sidebar.

### Fixed

- CLI crash on Pi 0.61.0 (`getEditorKeybindings` renamed upstream).
- Heat system docs corrected — `.protocol-state.json` → `state.json` across all surfaces.

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
