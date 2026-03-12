---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 8
---

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **AMPS content type system** — 4 shareable types: Automations, Muscles, Protocols, Skills. `scope` field (bundled/hub) controls distribution. `depends-on` for cross-type dependencies.
- **Compiled system prompt** ("Frontal Cortex") — dynamic assembly from hot protocol summaries + muscle digests. `prompts/system-core.md` template. Prepended to Pi's system prompt.
- **Protocol graduation** — heat decay floor (protocols don't decay below heat-default), frontmatter enforcement nudges, preload quality validation, git identity pre-commit hook, configurable core file protection tiers.
- **SomaHub Phase 1** — `MAINTAINERS.json` trust registry, 6 CI checks (frontmatter, privacy, injection, format, tier guard, attribution), `CODEOWNERS`, auto-merge for trusted contributors.
- **SomaHub Phase 2** — `hub-index.json` live loading, build CI auto-rebuilds on content push, Vercel deploy hook, `HubGrid` client-side fetch + merge.
- **Content CLI** — `/install protocol|muscle|skill|automation <name>`, `/list` remote/local content, `soma init --template <name>` with dependency resolution.
- **Release script** — `scripts/release.sh` for versioned npm releases with sync, test, bump, changelog, publish, push.
- **Distribution scope** — bundled protocols slimmed from 10 → 4 (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution). Hub protocols installed via templates.
- **Scope-aware sync** — `sync-from-agent.sh` reads `scope: bundled` from frontmatter, only ships essential protocols in npm package.

### Changed
- **Templates updated** — `requires` no longer lists bundled protocols (they ship automatically). Templates only fetch hub content.
- **Website hub** — "Scripts" → "Automations" everywhere, AMPS terminology, evolution banner, tier filter fixed (`experimental` → `pro`).
- **10 community protocols** — all at v1.2.0 with `scope` field, `spec-ref` links, reality-aligned descriptions.

### Fixed
- CLI tier filter `experimental` → `pro` (matches community schema)
- Hub.ts detects empty community directories (rate-limit fallback)

---

## [0.3.0] — 2026-03-10

### Added
- **`/rest` command** — disable cache keepalive + exhale in one motion.
- **`/keepalive` command** — toggle cache keepalive on/off/status.
- **Cache keepalive system** — 300s TTL, 45s threshold, 30s cooldown. Auto-ping on idle. ◷ cache TTL display in footer.
- **10 audit scripts** — PII, drift, stale terms, cross-reference, roadmap claims, docs sync, stale content, overlap, tests, settings. Orchestrated by `soma-audit.sh`.
- **Configurable boot sequence** — `settings.boot.steps` controls what loads on session start.
- **Git context on boot** — `git-context` boot step injects recent commits and changed files.
- **Configurable context warnings** — `settings.context` thresholds for notification, warning, auto-exhale.
- **Configurable preload staleness** — `settings.preload.staleAfterHours`.
- **Heat system docs** — standalone `docs/heat-system.md`.
- **breath-cycle ships on init** — `soma init` scaffolds `protocols/breath-cycle.md` + `_template.md`.

### Changed
- Extension ownership refactor — `soma-boot.ts` owns all lifecycle, `soma-statusline.ts` owns rendering + keepalive.
- Boot refactored from monolithic function to step-based pipeline.
- Configuration docs expanded with boot, git-context, context warnings, preload settings.
- All docs cross-linked: heat-system ↔ configuration ↔ protocols ↔ muscles ↔ commands.

### Fixed
- PII scrubbed from all git history — 4 repos force-pushed clean via `git-filter-repo`.
- CLI stripped to distribution only — removed 15 duplicated files. Agent is source of truth.
- Missing init templates in CLI — `soma init` from npm now scaffolds correctly.
- Stale references cleaned across all repos.

---

## [0.2.0] — 2026-03-09

### Added

- **Protocols & Heat System** — behavioral rules that load by temperature. Hot protocols inject full content, warm ones show breadcrumbs, cold ones stay dormant.
- **Muscle loading at boot** — learned patterns discovered, sorted by heat, loaded within token budget.
- **Settings system** — `settings.json` with chain resolution (project → parent → global).
- **Mid-session heat tracking** — auto-detects protocol usage from tool results.
- **Domain scoping** — `applies-to` frontmatter on protocols with project signal detection.
- **Breath cycle commands** — `/exhale`, `/inhale`, `/pin`, `/kill`
- **Script awareness** — boot surfaces available `.soma/scripts/`.
- **Template-aware init** — `soma init` resolves templates from the soma chain.
- **9 core modules** — discovery, identity, protocols, muscles, settings, heat, signals, preload, scripts.
- **Test suites** — 114 tests across protocols, muscles, settings, init, applies-to.
- **Website** — soma.gravicity.ai with docs, blog, ecosystem page.

### Fixed

- Extensions load correctly (auto-flush, preload, statusline).
- Skills install to correct path.
- Startup shows Soma changelog.

---

## [0.1.0] — 2026-03-08

### Born

- σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.
- Built on Pi with `piConfig.configDir: ".soma"`
- Identity, memory, breath cycle concept.
- Logo designed — 36 SVG iterations.
- First muscle formed: `svg-logo-design`.
