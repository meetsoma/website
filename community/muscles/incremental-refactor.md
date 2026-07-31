---
name: incremental-refactor
type: muscle
status: active
description: "never refactor blind. Phase: (1) scan → `soma-refactor.sh scan/refs/graph/tags` to map dependencies + references, (2) route audit → `soma-refactor.sh routes` if touching extensions (signals/capabi"
heat: 0
triggers: [migration, paths, rename, dependency, incremental, refactoring, code-quality]
applies-to: [any]
created: 2026-03-13
updated: 2026-04-18
loads: 0
tools: [soma-refactor.sh, soma-code.sh]
seams: [s01-7631fc, s01-3498d3]
trust-note: "soma-refactor.sh scan/refs/routes/verify — these are YOUR tools. Use them BEFORE raw grep. Verified working s01-7631fc."
version: 1.0.0
author: meetsoma
license: MIT
heat-default: warm
tier: official
---

# Incremental Refactor

## TL;DR
**Incremental Refactor** — never refactor blind. Phase: (1) scan → `soma-refactor.sh scan/refs/graph/tags` to map dependencies + references, (2) route audit → `soma-refactor.sh routes` if touching extensions (signals/capabilities), (3) plan → write change list with exact file:line targets, (4) execute → one file at a time, backward-compatible, (5) validate → run tests + `soma-refactor.sh verify` after each file, (6) commit → atomic commit per logical unit. Before starting: run `soma-refactor.sh scan` to generate the dependency graph. After each change: verify call sites still compile. Keep old paths/names working during transition (accept both, prefer new). Delete old only after full verification pass. Follow `refactor` workflow for full checklist including AMPS interconnect updates.

## The Pattern (proven session 12)

### Phase 1: Scan
Before touching code, understand what you're changing and what depends on it.

```bash
# Map all references to the thing you're changing
soma-refactor.sh scan --target "memory/muscles" --scope core/ extensions/
# → outputs: dependency graph, caller count, risk score

# For renames: find every import, type reference, string literal
soma-refactor.sh refs --symbol "discoverProtocols" --scope .
# → shows: who imports it, who calls it, what params they pass
```

**What you learn:**
- How many files touch this thing (blast radius)
- Whether callers pass the right args for the new signature
- Where string literals hardcode paths that should be configurable

### Phase 2: Plan
Write the change list BEFORE coding. Exact file:line references.

```markdown
## Changes Required
1. `settings.ts:305` — change default from "memory/muscles" to "amps/muscles"
2. `protocols.ts:205` — add settings param, use resolveSomaPath()
3. `muscles.ts:151,399` — same pattern
...
```

**Rules:**
- One concern per change (path defaults, function signatures, scaffold, tests)
- Mark which changes are backward-compatible vs breaking
- Identify the order: types first, then implementations, then callers, then tests

### Phase 3: Execute
One file at a time. Each change should leave the codebase compilable.

**Order matters:**
1. Types/interfaces (settings.ts paths type)
2. Shared helpers (resolveSomaPath signature)
3. Core implementations (protocols.ts, muscles.ts, etc.)
4. Callers (soma-boot.ts)
5. Scaffold/init (init.ts)
6. Tests

**Backward compatibility during transition:**
```typescript
// Accept both old and new
const statePath = join(soma.path, "state.json");
if (!existsSync(statePath)) {
  statePath = join(soma.path, ".protocol-state.json"); // legacy
}
```

### Phase 4: Validate
After EVERY file change, not just at the end.

```bash
# Quick: does it still parse?
soma-refactor.sh verify --file core/protocols.ts

# Medium: do imports resolve?
soma-refactor.sh verify --imports core/

# Full: all tests
for t in tests/test-*.sh; do bash "$t" 2>&1 | grep Results; done
```

### Phase 5: Commit
One atomic commit per logical unit. Not per file — per concern.

```
refactor(paths): AMPS layout — configurable paths via settings.paths
  13 files changed, 120 insertions, 76 deletions
```

## Anti-Patterns

- ❌ Changing all files at once then running tests
- ❌ Forgetting to update callers when changing signatures
- ❌ Hardcoding new paths instead of making them configurable
- ❌ Breaking backward compatibility without migration path
- ❌ Skipping the scan phase ("I know what depends on this")

## Prevention: Why Refactors Happen

Refactors become necessary when:
1. **Paths are hardcoded** → fix: always use `resolveSomaPath()` or equivalent
2. **Patterns are duplicated** → fix: extract on the 2nd occurrence, not the 3rd
3. **Signatures are rigid** → fix: accept options objects, not positional args
4. **No dependency tracking** → fix: run `soma-refactor.sh scan` periodically
5. **Config isn't centralized** → fix: one source of truth for defaults

## Metrics

A good refactor:
- Changes N files but touches 0 public APIs (or adds optional params only)
- All tests pass at every intermediate step
- Generates a notes file documenting remaining work and opportunities
- Results in fewer hardcoded values, not more

## Origin

Session 12 — AMPS layout refactor. 13 files, 333 tests, zero regressions. Scan→plan→execute→validate→commit proved out as a reliable cycle.
