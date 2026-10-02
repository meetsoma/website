---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 10
---

# Changelog

All notable changes to meetsoma core are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/);
versioning follows [Semantic Versioning](https://semver.org/).

Entries are short: what changed, and what it means for you.

**This changelog starts at 0.50.0**, the first meetsoma core release. Versions 0.1 to 0.42 are in the
[legacy changelog](https://soma.gravicity.ai/docs/changelog-legacy/).

---

## [Unreleased]

### Fixed
- **`soma -p` before Soma is set up no longer waits for input.** It says the runtime is needed and exits with an error, so scripts and CI fail fast.

### Added
- **`soma:code.changes` cap** — task-scoped change digest: commits, who (Soma-Session trailer or author), diffstat, dirty files, and branches ahead of HEAD, for a set of paths or a free-text task.

### Changed
- **Runs on Pi 0.87.1.** A bare `--model` id that more than one of your signed-in providers offers now asks you to pick one: use `provider/model` or `--provider`.
- **Tool output is shorter by default.** `soma:inbox.read` shows the frontmatter and the first 25 body lines (`{full:true}` for all). `soma:agent.harvest` leaves out the task and recent commits (`{verbose:true}` restores them). `soma:agent.tail` shows 25 lines with no blank padding. A guard rule prints in full the first time it fires each session, then as one line, and the break count, warning and attempted path are always shown.
<!-- Entries accumulate here and get promoted to a versioned section on release. -->

## [0.50.0] — 2026-10-02

The first meetsoma core release — now open source.

### Added
- **Find and reopen any session.** `soma attach` lists running sessions and takes you to one; `soma start` does the same for stopped ones and reopens them with full history.
- **Preload lanes.** `soma preload` lists your saved handoffs and starts a session on one by number.
- **Shrink a long transcript without losing work.** `/reduce` writes a smaller copy beside the original; `/resume-reduced` continues in it.

### Changed
- **`soma -c` continues your own session**, not whichever delegated child wrote last.

Full release notes: [What's new in 0.50.0](https://soma.gravicity.ai/docs/whats-new/).
