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
- **Soma's fixes to the Pi engine now reach every install.** They are applied after `npm install` (including `soma init` and `soma update`), so the crash guards, the edit-tool fix and the Claude version floor work for everyone, not only on a build machine. They need `python3`; without it Soma says so and still runs.
- **A background child no longer misses its task.** It used to spend its first turn greeting and asking what to build, and the task typed meanwhile could be lost. A child now answers `ready` and takes the task as its next message.
- **`soma -p` before Soma is set up no longer waits for input.** It says the runtime is needed and exits with an error, so scripts and CI fail fast.
- **An edit can no longer slip a hidden character into a file.** If an edit or write would add a control character (a form feed, say) or a line break glued to a word, it is refused, and the message says which character it was. An edit that swaps a long passage for one to three characters goes through, with a note to check it.

### Added
- **`soma login` points to the cloud workspace.** `soma login` shows where to register or sign in (somaverse.ai/workspace). `soma login start` opens it with your pairing code filled in.
- **The `somaverse` tool can pair before it is paired.** `somaverse:auth.*` works with no device paired. Other caps now say how to pair (`somaverse:auth.start`) instead of asking for a local bridge. A soma with no paired device and no local Somadian opens no Somaverse connection.
- **Guard rules can advise instead of block.** A `paths` gate with `mode: advise` lets the edit through and attaches its rule to the result, so a large edit is never sent twice. Reading a gated file now shows its rule up front, and the edit that follows is not blocked.
- **Model tiers for child agents.** Name groups in `settings.json` → `delegate.tiers` (e.g. `"cheap": ["opencode-go/space-bunny-free", "opencode/space-bunny-free"]`) and give a role `default-model: cheap`; changing the tier re-points every role on it. A list takes turns between its models and skips any that recently failed to start. `delegate.override` sends every child without an explicit `model` to one model or tier; `delegate.defaultModel` may name a tier too.
- **`soma:code.changes` cap** — task-scoped change digest: commits, who (Soma-Session trailer or author), diffstat, dirty files, and branches ahead of HEAD, for a set of paths or a free-text task.

### Changed
- **`soma --domain <name>` scopes a session to those domains.** It replaces `soma --package`, which still works for now, so "package" can mean only the thing you install.
- **meetsoma core is MIT-licensed.** Use it, change it and ship it, commercially or not. The CLI footer and its answers about the licence now say MIT. Versions before 0.50.0 stay under BSL 1.1.
- **Runs on Pi 0.87.1.** A bare `--model` id that more than one of your signed-in providers offers now asks you to pick one: use `provider/model` or `--provider`.
- **Tool output is shorter by default.** `soma:inbox.read` shows the frontmatter and the first 25 body lines (`{full:true}` for all). `soma:agent.harvest` leaves out the task and recent commits (`{verbose:true}` restores them). `soma:agent.tail` shows 25 lines with no blank padding. A guard rule prints in full the first time it fires each session, then as one line, and the break count, warning and attempted path are always shown.
<!-- Entries accumulate here and get promoted to a versioned section on release. -->

## [0.50.0] — 2026-10-02

The first meetsoma core release — and the one that ships it open source.

### Added
- **Find and reopen any session.** `soma attach` lists running sessions and takes you to one; `soma start` does the same for stopped ones and reopens them with full history.
- **Preload lanes.** `soma preload` lists your saved handoffs and starts a session on one by number.
- **Shrink a long transcript without losing work.** `/reduce` writes a smaller copy beside the original; `/resume-reduced` continues in it.

### Changed
- **`soma -c` continues your own session**, not whichever delegated child wrote last.

Full release notes: [What's new in 0.50.0](https://soma.gravicity.ai/docs/whats-new/).
